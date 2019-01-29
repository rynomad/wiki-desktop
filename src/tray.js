const fs = require('fs')
const path = require('path')
const {Tray} = require('electron')

const {Tray : TrayMenu} = require('./menu.js')

const getUserHome = () => process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE

const favLoc = path.join(getUserHome(), '.wiki', 'status', 'favicon.png')

const _faviconExists = async () => new Promise((resolve,reject) => {
  try {
    fs.exists(favLoc, resolve)
  } catch (e){
    resolve(false)
  }
})

const defer = async () => new Promise(r => setTimeout(r, 50))

const faviconExists = async (_resolve) => {
  while(!_faviconExists()) await defer()
}

const getStorageUsage = async (renderer) => {
  const [_, res] = await renderer.storage('length').catch(e => {
    console.warn(e)
    return []
  })

  console.log("STORAGE RES",res)

  return res.map(({name, result}) => ({
    name,
    length : result
  }))
}

let settings = {}
let storage = []
let tray = null

const refreshMenu = () => {
  console.log("REFRESH MENU")
  tray.setContextMenu(TrayMenu({tray, storage, settings}))
}

module.exports = async ({renderer}) => {
  await faviconExists()
  tray = new Tray(favLoc)

  tray.on('settings:autoseed', async (value) => {
    settings.autoseed = await renderer.settings('autoseed', value)
    refreshMenu()
  })

  tray.on('settings:cache', async (value) => {
    settings.cache = await renderer.settings('cache', value)
    refreshMenu()
  })

  tray.on('storage:refresh', async () => {
    storage = await getStorageUsage(renderer)
    refreshMenu()
  })

  tray.on('storage:clear', async () => {
    await renderer.storage('clear')
    tray.emit('storage:refresh')
  })
  return refreshMenu()
  tray.emit('settings:cache')
  tray.emit('settings:autoseed')
  tray.emit('storage:refresh')
}
