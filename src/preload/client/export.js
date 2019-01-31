const {cache, favicons, neighborhoods} = require('./storage')
const routes = require('localforage').createInstance({name : 'routes'})


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
  wiki.neighborhoodObject.registerNeighbor(origin)
  wiki.doInternalLink(wik.entry, null, origin)
}

