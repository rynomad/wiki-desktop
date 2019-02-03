const fs = require('fs')
const path = require('path')
const {Tray} = require('electron')

const {Tray : TrayMenu} = require('./menu.js')

const getUserHome = () => process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE

const favLoc = path.join(getUserHome(), '.wiki-desktop', 'status', 'favicon.png')

const _faviconExists = async () => new Promise((resolve,reject) => {
  try {
    fs.access(favLoc, (err) => {
      //console.log('access?',err)
      resolve(err ? false : true)
    })
  } catch (e){
    resolve(false)
  }
})

const defer = async () => new Promise(r => setTimeout(r, 100))

const faviconExists = async (_resolve) => {
  while(!(await _faviconExists())) await defer()
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
  console.log("REFRESH MENU", storage, settings)
  tray.setContextMenu(TrayMenu({tray, storage, settings}))
}

module.exports = async ({renderer}) => {
  await faviconExists()

  tray = new Tray(favLoc)

  tray.on('home', async () => {
    await renderer.send('home')
  })

  tray.on('settings:autoseed', async (value) => {
    settings.autoseed = await renderer.settings('autoseed', value)
    refreshMenu()
  })

  tray.on('settings:autosync', async (value) => {
    settings.autosync = await renderer.settings('autosync', value)
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

  renderer.onready(async () => {
    settings.autoseed = await renderer.settings('autoseed')
    settings.autosync = await renderer.settings('autosync')
    storage = await getStorageUsage(renderer)
    refreshMenu()
  })

}
