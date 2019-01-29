
const { app } = require('electron');
const Wiki = require('./wiki.js')
const Renderer = require('./renderer.js')
const Logger = require('./logger.js')
const Tray = require('./tray.js')
const MDNS = require('./mdns.js')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}


// const createWindow = (url, log_window) => {
//   ipcMain.on('cache', (event, length) => {
//     console.log("cache", length)
//     if (length !== cacheLength){ 
//       cacheLength = length
//       updateTrayMenu()
//     }
//   })

//   ipcMain.on('settings:load', (event, {autoseed : _autoseed}) => {
//     autoseed = _autoseed
//     updateTrayMenu()
//   })
//   // Create the browser window. 
//   const window = new BrowserWindow({
//     width: 800,
//     height: 600,
//     show : false,
//     webPreferences : {
//       nodeIntegration: false,
//       preload : resolve(__dirname,'preload','client','index.js'),
//       webSecurity : false,
//       experimentalFeatures : true,
//       plugins : true
//     }
//   });

//   if (url === mainURL) {
//     mainWindow = IPCMain(window)
//   }

//   windows.set(url, window)

//   // and load the index.html of the app.
//   window.loadURL(url);

//   // Open the DevTools.
//   window.webContents.openDevTools();

//   // Emitted when the window is closed.
//   window.on('closed', () => {
//     windows.delete(url)
//     if (window === mainWindow.window) mainWindow = null
//   });

//   window.once('ready-to-show', () => {
//     window.show()
//   })
// };

const _onReady = async () => {
  const logger = await Logger({app})
  console.log('LOGGER',logger)
  logger.log('START SERVER AND MDNS')
  const [wiki, mdns] = await Promise.all([
    Wiki({app, logger}),
    MDNS({app, logger})
  ])
  logger.log('START RENDERER')
  const renderer = await Renderer({app, logger, wiki, mdns})
  logger.log('START TRAY')
  await Tray({app, logger, wiki, renderer})
  logger.log('SETUP DONE')
}

const onReady = async () => {
  await _onReady().catch(e => {
    console.error('STARTUP ERROR',e)
    process.exit(1)
  })
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', onReady)


