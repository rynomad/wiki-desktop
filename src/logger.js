const path = require("path")
const {BrowserWindow} = require('electron')
const {Logger : IPC} = require('./ipc.js')

module.exports = async () => new Promise((resolve,reject) => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    show : false,
    webPreferences : {
      nodeIntegration: false,
      preload : path.resolve(__dirname,'preload','log','index.js')
    }
  });

  const ipc = IPC(window)

  const logger = {
    log(...args){
      console.log(...args)
      ipc.log(...args)
    },
    show(){
      window.show()
    },
    hide(){
      window.hide()
    }
  }

  window.once('ready-to-show', async () => {
    //window.show()
    resolve(logger)
  })

  window.loadURL('file://' + path.resolve(__dirname,'pages', 'logger.html'))
})