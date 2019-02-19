
require('coffeescript');
require('coffeescript/register');
const drop = require('wiki-client/lib/drop.coffee')
const _link = require('wiki-client/lib/link.coffee')
const { remote } = require('electron')
const { Menu, MenuItem, dialog } = remote
const { rogers } = require('./neighbors.js')

console.log("DROP", drop)
const {cache, favicons, neighborhood} = require('./storage')
const routes = require('localforage').createInstance({name : 'routes'})
const pako = require('pako')
const nacl = require('tweetnacl')

window.deflate = (json) => {
  const str = JSON.stringify(json)
  console.log('compressing', str.length, 'bytes')
  const bin = pako.deflate(str, {to : "string"})
  console.log('compressed to ', bin.length, 'bytes')
  return bin
}
window.inflate = (bin) => {
  console.log('decompressing', bin.length, 'bytes')
  const str = pako.inflate(bin, {to : 'string'})
  console.log('decompressed to', str.length, 'bytes')
  const json = JSON.parse(str)
  return json
}

let keys = null

const getKeys = () => {
  const string = ipcRenderer.sendSync('owner')
  const json = JSON.parse(string)

  keys = {
    box : {
      publicKey : Buffer.from(json.box.publicKey, 'hex'),
      secretKey : Buffer.from(json.box.secretKey, 'hex')
    },
    sign : {
      publicKey : Buffer.from(json.sign.publicKey, 'hex'),
      secretKey : Buffer.from(json.sign.secretKey, 'hex')    
    }
  }
}

window.sign = async (json) => {
  if (!keys) getKeys()
  console.log(keys)
  const buf = Buffer.from(JSON.stringify(json))
  const signature = Buffer.from(nacl.sign.detached(buf, keys.sign.secretKey))
  return {
    signer : keys.sign.publicKey.toString('hex'), 
    signature : signature.toString('hex'),
    json
  }
  console.log(signature.toString())
}
window.verify = async ({signer, signature, json}) => {
  return nacl.sign.detached.verify(
    Buffer.from(JSON.stringify(json)), 
    Buffer.from(signature, 'hex'),
    Buffer.from(signer, 'hex')
  ) && json
}


const getLinks = (story) => 
  (story.filter(({type}) => type === 'paragraph')
       .map(({text}) => text)
       .join('\n')
       .match(/\[\[([^\]]+)\]\]/gi) || []).map(wiki.asSlug)


const link = async (slug) => new Promise((resolve,reject) => {
  $.ajax({
    type : 'GET',
    url : `${location.origin}/${slug}.json`,
    success : resolve,
    error : reject
  })
})

window.Wik = async (
  page = $('.page').first().data('data'), 
  found = new Map(), 
  failed = new Set(), 
  nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(4))).toString('hex'),
  favicon,
) => {
  favicon = favicon || await favicons.getItem(`${location.origin}/favicon.png`)
  found.set(wiki.asSlug(page.title), page)
  const slugs = getLinks(page.story).filter(slug => !(found.has(slug) || failed.has(slug)))
  for (const slug of slugs ){
    const _page = await link(slug).catch((e) => {
      failed.add(slug)
      return null
    })

    if (!_page) continue

    await Wik(_page, found, failed, nonce, true)
  }

  if (!keys) getKeys()

  return ({
    box : keys.box.publicKey.toString('hex'),
    entry : wiki.asSlug(page.title),
    nonce,
    owner : $('#site-owner span').text(),
    pages : Array.from(found),
    favicon
  })
}

const lastEdit = (journal) => {
  journal = JSON.parse(JSON.stringify(journal)).reverse()
  for (const action of journal){
    if (action.date && action.type != 'fork') return action.date
  }
}

const entry = ({title, story, journal}) => ({
  slug : wiki.asSlug(title),
  title,
  date : lastEdit(journal),
  synopsis : wiki.createSynopsis({story})
})

const wikOrigin = ({nonce, entry, owner, box}, signer) => `${signer.substr(0, 8)}.${owner}.wik`
const wikSitemap = ({pages}) => pages.map(([_, page]) => page).map(entry)

const getDiffSitemap = (old_sitemap = [], new_sitemap = [], pages) => {
  const diff = []
  const old_time = new Map()
  
  for (const {slug, date} of old_sitemap){
    old_time.set(slug, date)
  }

  for (const page of new_sitemap){
    if (!old_time.has(page.slug)){
      diff.push(page)
      continue
    }

    const _old_time = Number.parseInt(old_time.get(page.slug))
    const _new_time = Number.parseInt(page.date)
    if (_new_time > _old_time){
      diff.push(page)
    }
  }

  return diff
}

const mergeSitemaps = (old_sitemap, new_sitemap) => {
  let merged = []
  const seen = new Map()
  const updates = new Set()
  
  for (const page of old_sitemap){
    seen.set(page.slug, page.date)
    merged.push(page)
  }

  for (const page of new_sitemap){
    if (!seen.has(page.slug)){
      merged.push(page)
      updates.add(page.slug)
    }

    const comp = seen.get(page.slug)

    if (page.date > comp){
      updates.add(page.slug)
      seen.set(page.slug, page.date)
      merged = merged.filter(i => i.slug !== page.slug).concat([page])
    }

  }

  return {merged, updates}
}

window.importWik = async (signed) => {
  let wik = null
  if (!(wik = await verify(signed))){
    console.error('')
    dialog.showErrorBox('Invalid .wik File', 'the wik file was improperly signed, ignoring')
    return 
  }
  console.log(wik)

  //FIX
  const origin = wikOrigin(wik, signed.signer)
  const sitemap = wikSitemap(wik)
  const old_sitemap = (await neighborhood.getItem(origin)) || []
  const {merged, updates} = mergeSitemaps(old_sitemap, sitemap)

  for (const [slug, page] of wik.pages) {
    if (updates.has(slug)){
      await cache.setItem(`//${origin}/${slug}.json`, [page, 'success'])
    }
  }
  await cache.setItem(`//${origin}/system/sitemap.json`, [merged, 'success'])
  await cache.setItem(`//${origin}/favicon.png`, [wik.favicon, 'success'])
  await favicons.setItem(`http://${origin}/favicon.png`, wik.favicon)
  console.log(`SET    //${origin}`)
  await routes.setItem(origin, `//${origin}`).then(res => {
    console.log("SET PREFIX", res)
  })
  const neighbor = $(`span.neighbor[data-site="${origin}"]`)
  console.log('import did find neighbor?',neighbor)
  if (!neighbor.length){
    function listener (event, site){
      if (site === origin){
        $(document.body).off('new-neighbor-done', listener)
        wiki.doInternalLink(wik.entry, null, origin)
      }
      console.log('wik neighbor done', site)
    }
  
    $(document.body).on('new-neighbor-done', listener)
    wiki.neighborhoodObject.registerNeighbor(origin)
  } else {
    rogers.set(origin, 0)
    wiki.doInternalLink(wik.entry, null, origin)
  }


}



window.export = (wik) => {
  const fs = require('fs')
  
  const path = dialog.showSaveDialog({
    title : `Export .wik file for "${wik.json.entry}"`,
    defaultPath : `${wik.json.entry}.${wikOrigin(wik.json, wik.signer)}`
  })

  console.log(path)
  fs.writeFileSync(path, deflate(wik))
}

const Wik = async (page) => {
  console.log(page)
  const json = await Wik(page)
  const wik = await sign(json)
  console.log("SIGNED", wik)
  window.export(wik)
}

const init = () => {

  $('.main').contextmenu((e) => {
    console.log("main context menu")
  })
  
  
  $('.main').unbind('drop')
  $('.main').bind('drop', drop.dispatch({
    page: (item) => link.doInternalLink(item.slug, null, item.site),
    file: (file) => {
      console.log("FILE", file)
      reader = new FileReader()
      if (file.type == 'application/json'){
        reader.onload = (e) => {
          const result = e.target.result
          const pages = JSON.parse(result)
          const resultPage = wiki.newPage()
          resultPage.setTitle("Import from #{file.name}")
          resultPage.addParagraph(`
            Import of #{Object.keys(pages).length} pages
            (#{commas file.size} bytes)
            from an export file dated #{file.lastModifiedDate}.
            `)
          resultPage.addItem({type: 'importer', pages: pages})
          wiki.showResult(resultPage)
        }
      } else if (file.name.split('.').pop() === 'wik'){
        reader.onload = async (e) => {
          const result = e.target.result
          const json = inflate(result)
          importWik(json)
        }
      } else {
        return
      }
      reader.readAsText(file)
    },
    punt : (e) => {
      console.log("PUNT", e)
    }
  }))
  
}

module.exports = {Wik, init}