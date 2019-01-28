
const { resolve } = require('path')
const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');

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
let tray = null
let cacheLength = 0
let autoseed = false

const updateTrayMenu = () => {
  if (!tray) return
  console.log("UPDATE TRAY")
  const contextMenu = Menu.buildFromTemplate([
    {
      label : 'open or reset wiki',
      click : () => {
        if (mainWindow) {
          mainWindow.close()
        }
        createWindow(mainURL)
      }
    },
    {
      label : 'neighborhood',
      type : 'separator'
    },
    {
      label : 'autoseed from cache',
      type : 'checkbox',
      checked : autoseed,
      click : (item, ...args) => {
        console.log("AUTOSEED?", item.checked)
        autoseed = item.checked
        if (mainWindow){
          mainWindow.webContents.send('settings:autoseed', autoseed)
        }
      } 
    },
    {
      label : 'cache',
      type : 'separator'
    },
    {
      label : `${cacheLength} items`,
      enabled : false
    },
    {
      label : `clear cache`,
      click : () => {
        console.log("clear cache")
        if (!mainWindow) return
        mainWindow.webContents.send('action:clearcache')
      }
    },
    {
      type : 'separator',
      label : 'General'
    },
    {
      label : 'cut',
      role : 'cut'
    },
    {
      label : 'copy',
      role : 'copy'
    },
    {
      label : 'paste',
      role : 'paste'
    },
    {
      label : 'quit',
      role: 'quit'
    },
  ])
  tray.setContextMenu(contextMenu)
}

const createWindow = (url, log_window) => {
  ipcMain.on('cache', (event, length) => {
    console.log("cache", length)
    if (length !== cacheLength){ 
      cacheLength = length
      updateTrayMenu()
    }
  })

  ipcMain.on('settings:load', (event, {autoseed : _autoseed}) => {
    autoseed = _autoseed
    updateTrayMenu()
  })
  // Create the browser window. 
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    show : false,
    webPreferences : {
      nodeIntegration: false,
      preload : resolve(__dirname,'preload','client','index.js'),
      webSecurity : false,
      experimentalFeatures : true,
      plugins : true
    }
  });

  if (url === mainURL) {
    mainWindow = window
  }

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
    // hack to redraw favicons
    ipcMain.on('shift', (evt,height) => {
      console.log("REDO FAVICON", height)
      try {
        window.setBounds({height : Number.parseInt(height) + 1})
      } catch (e) {
        console.log(e)
      }
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
      preload : resolve(__dirname,'preload','log','index.js')
    }
  });

  log_window.once('ready-to-show', async () => {
    console.log("ready-to-show")
    log_window.show()
    console.log("did finish load?")
    const mdns = await startServer(log_window)
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

    mdns.on('favLoc', (favLoc) => {
      tray = new Tray(favLoc)
      updateTrayMenu()
    })

  })

  log_window.loadURL('file://' + resolve(__dirname,'pages', 'log.html'))


});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
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
