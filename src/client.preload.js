const localforage = require('localforage')
window.LF = localforage
window.ipcRenderer = require('electron').ipcRenderer
console.log("PRELOAD")

const wait = (time) => new Promise((resolve, reject) => setTimeout(() => resolve(), time || 100))
// hack to make sure favicon resolves on first boot
function dataURItoBlob(dataURI) {
  var binary = atob(dataURI.split(',')[1]);
  var array = [];
  for(var i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: 'image/png'});
}

const getDataUri = (url) => new Promise((resolve, reject) => {
  var image = new Image();

  image.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
      canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

      canvas.getContext('2d').drawImage(this, 0, 0);

      // ... or get as Data URI
      resolve(canvas.toDataURL('image/png'));
  };

  image.onerror = () => {
    resolve()
  }

  image.src = url;
})

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
        //console.log("AJAX SUCCESS", type, url, ...args)
        
        if (type === 'GET'){
          let put
          try {
            put = JSON.parse(JSON.stringify(args))
          } catch (e) {
            put = args
          }
          localforage.setItem(url, put).then(() => {
            if (url.indexOf('sitemap.json') >= 0){
              console.log("syncing site")
              const host = url.split('/')[2]
              return Promise.all(args[0].map(({slug}) => $.ajax({
                type : 'GET',
                url : `//${host}/${slug}.json`
              }))).catch(e => {
                console.log("AJAX SITEMAP ERROR", e)
              }).then(res => {
                console.log("RES ", res)
              })
            }
          })
        }
        success(...args)
      },
      error : (...args) => {
        console.log("AJAX ERROR", type, args)
        localforage.getItem(url).then(res => {
          console.log("localforage",res)
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

  //return fetch_deferred
  return ajax_deferred
}

const monkeyAJAX = async () => {
  try {
    const ajax = $.ajax.bind($)
  
    $.ajax = createMonkeyAJAX(ajax)
  } catch (e) {
    await wait(100)
    return monkeyAJAX()
  }
}

const monkeyFavicon = async () => {
  let done = false
  while (true){
    const favicons = Array.from($('img[src$="favicon.png"]'))
    for (const fav of favicons){
      console.log("FAVICON", fav.onclick)
      const uri = (await localforage.getItem('FAVICON:::' + fav.src)) || (await getDataUri(fav.src))
      if (uri){
        await localforage.setItem('FAVICON:::' + fav.src, uri)

        const url = URL.createObjectURL(dataURItoBlob(uri))
        fav.setAttribute('src', url)
      }
    }
    await wait(200)
  }
}

window.onload = async () => {
  console.log("LOCAQL", localforage)
  await monkeyAJAX()

  monkeyFavicon().catch(e => {
    console.log("favicon error",e)
  })

  ipcRenderer.on('mdns', (e, msg) => {
    console.log("GOT MDNS", msg)
    wiki.neighborhoodObject.registerNeighbor(msg)
  })
  ipcRenderer.send('shift',window.outerHeight)
}