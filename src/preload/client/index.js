
window.ipcRenderer = require('electron').ipcRenderer
const ajaxcache = require('./ajaxcache.js')
const loadSettings = require('./settings.js')
const localforage = require('localforage')
const neighbors = require('./neighbors.js')
const favicons = require('./favicons.js')
console.log("PRELOAD")

const wait = (time) => new Promise((resolve, reject) => setTimeout(() => resolve(), time || 100))
// hack to make sure favicon resolves on first boot




window.onload = async () => {
  const settings = await loadSettings()
  await ajaxcache(settings)
  await neighbors(settings)
  favicons()

  ipcRenderer.on('mdns', (e, msg) => {
    console.log("GOT MDNS", msg)
    wiki.neighborhoodObject.registerNeighbor(msg)
  })

  ipcRenderer.send('shift',window.outerHeight)
}