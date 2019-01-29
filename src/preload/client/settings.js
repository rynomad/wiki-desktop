const {ipcRenderer} = require('electron')
const {EventEmitter} = require('events')

const {settings : settingsForage} = require('./storage')

const defaultSettings = {
  autoseed : true,
  cache : true
}

const registerIPCHandler = async (ee, name) => {
  ipcRenderer.on(`settings:${name}`, async (event, value) => {
    const result = await settingsForage[value ? 'setItem' : 'getItem'](name, value).catch(e => {
      console.warn(e)
      ipcRenderer.send(`settings:${name}:error`, e)
      return null
    })

    if (result && value){
      ee.emit(name, result)
      ee.emit('change')
    }

    ipcRenderer.send(`settings:${name}:done`, result)
  })
}

module.exports = async () => {
  const ee = new EventEmitter()

  for (const name in defaultSettings){
    const current = ((await settingsForage.getItem(name)) 
                  || (await settingsForage.setItem(name, defaultSettings[name])))
    
    ee[name] = current
    registerIPCHandler(ee, name)
  }

  return ee
}
