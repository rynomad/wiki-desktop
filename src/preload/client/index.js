
window.ipcRenderer = {
  sendSync(){
    return ''
  }
}

window.onload = async () => {
  window.ipcRenderer = require('electron').ipcRenderer
  plugins.security.setup()
  try {
    const loadSettings = require('./settings.js')
    const neighbors = require('./neighbors.js')
    const favicons = require('./favicons.js')
    const cache = require('./cache.js')
  
    const settings = await loadSettings()
    await cache(settings)
    await neighbors(settings)
    favicons()
  
    ipcRenderer.on('mdns', (e, msg) => {
      console.log("GOT MDNS", msg)
      wiki.neighborhoodObject.registerNeighbor(msg)
    })

    ipcRenderer.on('home', () => {
      ipcRenderer.send('home:done')
      setTimeout(() => {
        location.href = location.origin + '/welcome-visitors.html'
      },100)
    })
  
    ipcRenderer.send('shift',window.outerHeight)

  } catch (e){
    console.error(e)
  }

  ipcRenderer.send('ready')
}