const localforage = require('localforage')

const favicons = localforage.createInstance({
  name : 'favicons'
})

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

const dataURItoBlob = (dataURI) => {
  var binary = atob(dataURI.split(',')[1]);
  var array = [];
  for(var i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: 'image/png'});
}

const sweepFavicons = async () => {
  const elements = Array.from($('img[src$="favicon.png"]'))
  for (const fav of elements){
    //console.log("FAVICON", fav.onclick)
    let uri = await favicons.getItem(fav.src)

    if (!uri){
      uri = await getDataUri(fav.src).catch(e => null)
      if (uri) await favicons.setItem(fav.src, uri).catch(e => null)
    }

    if (uri){
      console.log("replacing favicon", fav.src)
      const url = URL.createObjectURL(dataURItoBlob(uri))
      fav.setAttribute('src', url)
    }
  }
}

const IdleFaviconUpdater = async () => new Promise((resolve, reject) => {
  requestIdleCallback(async () => {
    await sweepFavicons().catch(e => {
      console.warn('FAVICON ERROR',e)
    })
    resolve()
  })
})


const start = async () => {
  let done = false
  while (true){
    await IdleFaviconUpdater()
  }
}

module.exports = start