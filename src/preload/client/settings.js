const localforage = require('localforage')
const {ipcRenderer} = require('electron')
const {EventEmitter} = require('events')

const settingsForage = localforage.createInstance({
  name : 'settings'
})

const defaultSettings = {
  autoseed : true
}

const loadSettings = async () => {
  const ee = new EventEmitter()
  const settings = await settingsForage.getItem('settings')

  if (!settings){
    await settingsForage.setItem('settings', defaultSettings)
  }

  ipcRenderer.on('settings:autoseed', async (event, autoseed) => {
    console.log("AUTOSEED", autoseed)
    ee.settings = {
      ...ee.settings,
      autoseed
    }
    await settingsForage.setItem('settings', ee.settings)
    ee.emit('change', ee.settings)
    ee.emit('autoseed', autoseed)
  })


  ee.settings = settings || defaultSettings
  ipcRenderer.send('settings:load', ee.settings)
  return ee
}

module.exports = loadSettings