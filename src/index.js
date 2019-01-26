
const { resolve } = require('path')
const { app, BrowserWindow, ipcMain } = require('electron');

const startServer = require('./server.js')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainURL;
let mainWindow;
const windows = new Map()

const createWindow = (url, log_window) => {
  // Create the browser window.
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    show : false,
    webPreferences : {
      nodeIntegration: false,
      preload : resolve(__dirname,'client.preload.js'),
      webSecurity : false,
      experimentalFeatures : true,
      plugins : true
    }
  });

  if (url === mainURL) mainWindow = window

  windows.set(url, window)

  // and load the index.html of the app.
  window.loadURL(url);

  // Open the DevTools.
  window.webContents.openDevTools();

  // Emitted when the window is closed.
  window.on('closed', () => {
    windows.delete(url)
    if (window === mainWindow) mainWindow = null
  });

  window.once('ready-to-show', () => {
    window.show()
    if (log_window){
      log_window.hide()
    }
    // hack to redraw favicons
    ipcMain.on('favicon', () => {
      console.log("REDO FAVICON")
      //window.setBounds({height : 601})
    })
  })
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {

  const log_window = new BrowserWindow({
    width: 800,
    height: 600,
    show : false,
    webPreferences : {
      nodeIntegration: false,
      preload : resolve(__dirname,'log.preload.js')
    }
  });

  log_window.once('ready-to-show', async () => {
    console.log("ready-to-show")
    log_window.show()
    console.log("did finish load?")
    mdns = await startServer(log_window)
    mdns.on('self', (url) => {
      mainURL = url
      createWindow(mainURL, log_window)
    })
  
    mdns.on('up', (url) => {
      console.log("found local wiki:", url)
      if (mainWindow){
        mainWindow.webContents.send('mdns', url)
      }
      //createWindow(url)
    })
  })

  log_window.loadURL('file://' + resolve(__dirname, 'startup.html'))


});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
