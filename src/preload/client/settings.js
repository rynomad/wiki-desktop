const {ipcRenderer} = require('electron')
const {EventEmitter} = require('events')

const {settings : settingsForage} = require('./storage')

const defaultSettings = {
  autoseed : true,
  autosync : true,
}

const registerIPCHandler = async (ee, name) => {
  ipcRenderer.on(`settings:${name}`, async (event, value) => {
    const result = await settingsForage[value === null ? 'getItem' : 'setItem'](name, value).catch(e => {
      console.warn(e)
      ipcRenderer.send(`settings:${name}:error`, e)
      return null
    })

    console.log('settings', name, value, result)
    ipcRenderer.send(`settings:${name}:done`, result)
    console.log('sent')

    if (result !== null && value !== null){
      ee.emit(name, result)
      ee.emit('change')
    }
  })
}

module.exports = async () => {
  const ee = new EventEmitter()

  for (const name in defaultSettings){
    let current = await settingsForage.getItem(name)

    if (current === null) {
      current = await settingsForage.setItem(name, defaultSettings[name])
    }
    
    ee[name] = current
    registerIPCHandler(ee, name)
    console.log(name, current)
  }

  return ee
}
