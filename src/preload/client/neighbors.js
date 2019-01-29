const {neighborhood : neighborDB} = require('./storage.js')

let known_neighbors = null
let neighborhood = null

const getDiffSitemap = (old_sitemap = [], new_sitemap) => {
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

const syncSlug = async (site, slug) => new Promise((resolve,reject) => {
  //console.log('SYNC', site, slug)
  requestIdleCallback(() => wiki.site(site).get(`${slug}.json`, (err, data) => {
    if (err) return resolve(false)
    resolve(true)
  }))
})

const syncSitemap = async (site, sitemap) => {
  console.log("sync sitemap", site)
  const old_sitemap = (await neighborDB.getItem(site) )|| []
  const diff = getDiffSitemap(old_sitemap, sitemap)
  await neighborDB.setItem(site, sitemap)

  for (const page of diff){
    const worked = await syncSlug(site, page.slug)
    if (worked){
      old_sitemap.push(page)
      await neighborDB.setItem(site, old_sitemap)
    }
  }
  console.log('sync sitemap done', site)
}

const syncNeighbor = async (site) => new Promise((resolve,reject) => {
  console.log('request idle', site)
  requestIdleCallback(() => {
    console.log('get idle', site)
    wiki.site(site).get('system/sitemap.json', async (err, data) => {
      console.log('got sync', site, err, data)
      await syncSitemap(site, data)
      resolve(data)
    })
  })
})

const rogers = new Map()

const neighborly = (site) => {
  return (Date.now() - (rogers.get(site) || 0) > (60 * 1000)) 
}

const sweepNeighbors = async () => new Promise((resolve) => {
  requestIdleCallback(async () => {
    const sites = Array.from(neighborhood)
    while (next = sites.pop()){
      if (!neighborly(next)){
        continue
      }
      await syncNeighbor(next)
      rogers.set(next, Date.now())
    }
    resolve()
  })
})

const syncNeighbors = async () => {
  while(true){
    await sweepNeighbors()
  }
}

const start =   async (settings) => {
  console.log("start neighbors", settings.autoseed)
  known_neighbors = new Set((await neighborDB.getItem('list')) || [])
  neighborhood = new Set()

  if (settings.autoseed){
    for (const site of known_neighbors){
      console.log('populating', site, 'from known neighbors')
      wiki.neighborhoodObject.registerNeighbor(site)
    }
  }

  $(document.body).on('new-neighbor-done', async (event, site) => {
    console.log("NEW NEIGHBOR DONE",site)
    if (site === location.host) return console.log('ignoring self')
    await syncNeighbor(site)
    neighborhood.add(site)
    known_neighbors.add(site)
    await neighborDB.setItem('list', Array.from(known_neighbors))
  })

  syncNeighbors()
}

module.exports = start