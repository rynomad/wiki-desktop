const {BrowserWindow} = require('electron')
const path = require('path')
const {Renderer : IPC} = require('./ipc.js')

module.exports = async ({app, logger, wiki, mdns}) => new Promise((resolve,reject) => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    show : false,
    webPreferences : {
      nodeIntegration: false,
      preload : path.resolve(__dirname,'preload','client','index.js')
    }
  });

  // and load the index.html of the app.
  window.loadURL(mdns.self);

  // Open the DevTools.
  window.webContents.openDevTools();

  window.once('ready-to-show', () => {
    window.show()
    console.log("???????", !!window, !!logger, !!wiki)
    resolve(IPC({window, logger, wiki}))
  })
})
