const localforage = require('localforage')
const {ipcRenderer} = require('electron')
window.LF = localforage

const ajaxcache = localforage.createInstance({
  name : 'ajax'
})

const getDiffSitemap = (old_sitemap, new_sitemap) => {
  const diff = []
  const old_time = new Map()
  
  for (const {slug, date} of old_sitemap){
    old_time.set(slug, date)
  }

  for (const {slug, date} of new_sitemap){
    if (!old_time.has(slug)){
      diff.push(slug)
      continue
    }

    const _old_time = Number.parseInt(old_time.get(slug))
    const _new_time = Number.parseInt(date)
    if (_new_time > _old_time){
      diff.push(slug)
    }
  }

  return diff.map(slug => ({slug}))
}

const fetchPages = (url, sitemap) => {
  const host = url.split('/')[2]
  for (const {slug} of sitemap){
    requestIdleCallback(() => {
      $.ajax({
        type : 'GET',
        url : `//${host}/${slug}.json`
      })
    })
  }
}

const updateSitemap = async (url, new_res) => {
  const old_res = await ajaxcache.getItem(url)
  const new_sitemap = new_res[0]
  console.log("old/new", old_res, new_res)
  if (!old_res){
    return fetchPages(url, new_sitemap)
  }

  const old_sitemap = old_res[0]
  const diff_sitemap = getDiffSitemap(old_sitemap, new_sitemap)
  return fetchPages(url, diff_sitemap)
}

const ajaxCache = async (url, ...args) => {
  let put
  try {
    put = JSON.parse(JSON.stringify(args))
  } catch (e) {
    put = args
  }

  await ajaxcache.setItem(url, put)

  const length = await ajaxcache.length()
  ipcRenderer.send('cache', length)
}


const createMonkeyAJAX = (ajax) => ({
  url, 
  success = () => {
    console.log("SUCCESS CB UNDEFINED")
  }, 
  error = () => {
    console.log("ERROR CB UNDEFINED")
  }, 
  ...args
}) => {
  const type = args.type
  console.log("AJAX", url)

  return ajax({
      url,
      success : (...args) => {
        success(...args)
        //console.log("AJAX SUCCESS", type, url, ...args)
        if (type === 'GET'){
          ajaxCache(url, ...args).then((res) => {
            console.log("cached ajax", url)
          })
        }

      },
      error : (...args) => {
        console.log("AJAX ERROR", type, args)
        ajaxcache.getItem(url).then(res => {
          console.log("ajaxcache",res)
          if (!res){
            error(...args)
          } else {
            console.log("cache", res)
            success(...res)
          }
        })
      },
      ...args
    })

}

const monkeyAJAX = async (_settings) => {
  ipcRenderer.on('action:clearcache', async () => {
    await ajaxcache.clear()
    const length = await ajaxcache.length()
    ipcRenderer.send('cache', length)
  })
  settings = _settings
  try {
    const ajax = $.ajax.bind($)
  
    $.ajax = createMonkeyAJAX(ajax)
  } catch (e) {
    await wait(100)
    return monkeyAJAX()
  }
}

module.exports = monkeyAJAX