
require('coffeescript');
require('coffeescript/register');
const drop = require('wiki-client/lib/drop.coffee')
const _link = require('wiki-client/lib/link.coffee')
console.log("DROP", drop)
const {cache, favicons, neighborhoods} = require('./storage')
const routes = require('localforage').createInstance({name : 'routes'})
const pako = require('pako')

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

  return ({
    entry : wiki.asSlug(page.title),
    nonce,
    owner : $('#site-owner span').text(),
    pages : Array.from(found),
    favicon
  })
}

const lastEdit = (journal) => {
  journal = journal.reverse()
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

const wikOrigin = ({nonce, entry, owner}) => `${nonce}.${entry}.${owner}.wik`
const wikSitemap = ({pages}) => pages.map(([_, page]) => page).map(entry)


window.importWik = async (wik) => {
  console.log(wik)
  const origin = wikOrigin(wik)
  const sitemap = wikSitemap(wik)

  for (const [slug, page] of wik.pages) {
    await cache.setItem(`//${origin}/${slug}.json`, [page, 'success'])
  }
  await cache.setItem(`//${origin}/system/sitemap.json`, [sitemap, 'success'])
  await cache.setItem(`//${origin}/favicon.png`, [wik.favicon, 'success'])
  await favicons.setItem(`http://${origin}/favicon.png`, wik.favicon)
  console.log(`SET    //${origin}`)
  await routes.setItem(origin, `//${origin}`).then(res => {
    console.log("SET PREFIX", res)
  })
  function listener (event, site){
    if (site === origin){
      $(document.body).off('new-neighbor-done', listener)
      wiki.doInternalLink(wik.entry, null, origin)
    }
    console.log('wik neighbor done', site)
  }

  $(document.body).on('new-neighbor-done', listener)
  wiki.neighborhoodObject.registerNeighbor(origin)
}



window.export = (wik) => {
  const {dialog} = require('electron').remote.require('electron')
  const fs = require('fs')
  const path = dialog.showSaveDialog({
    title : wikOrigin(wik)
  })
  console.log(path)
  fs.writeFileSync(path, deflate(wik))
}

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
