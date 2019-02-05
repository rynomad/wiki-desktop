const {ipcMain} = require('electron')
const fs = require('fs')
const path = require('path')
const getUserHome = () => process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE


const Renderer = ({wiki, logger, window}) => {
  const ready_fns = []
  ipcMain.once('shift', (evt, height) => {
    console.log("REDO FAVICON", height)
    try {
      window.setBounds({height : Number.parseInt(height) + 1})
    } catch (e) {
      console.log(e)
    }
  })

  ipcMain.once('ready', () => {
    for (const fn of ready_fns){
      fn()
    }
  })

  ipcMain.on('id', (event) => {
    logger.log("GOT ID REQUEST", wiki.owner.secret)
    event.returnValue = wiki.owner.secret
  })

  ipcMain.on('owner', (event) => {
    event.returnValue = fs.readFileSync(path.join(getUserHome(),'.wiki-desktop','status','owner.json'))
  })

  return {
    window,
    onready(fn){
      ready_fns.push(fn)
    },
    channelLocks : new Map(),
    async send(channel, ...args){
      console.log("IPC SEND",channel)
      if (this.channelLocks.has(channel)){
        console.log('DEFER',channel)
        await this.channelLocks.get(channel)
      }

      this.channelLocks.set(channel, new Promise((resolve, reject) => {
        const error_cb = (event, ...errors) => {
          console.error(...errors)
        }

        const done_cb = (event, ...results) => {
          ipcMain.removeListener(`${channel}:done`, done_cb)
          ipcMain.removeListener(`${channel}:error`, error_cb)
          this.channelLocks.delete(channel)
          console.log('DONE ', channel, results)
          resolve(results)
        }

        ipcMain.on(`${channel}:done`, done_cb)
        ipcMain.on(`${channel}:error`, error_cb)

        window.webContents.send(`${channel}`, ...args)
      }))

      return this.channelLocks.get(channel)
    },
    storage(method, name){
      console.log('do storage', method, name)
      return this.send(`storage:${method}`, name)
    },
    settings(name, value){
      console.log('update settings', name, value)
      return this.send(`settings:${name}`, value).then(([res]) => res)
    }
  }
}

const Logger = (window) => ({
  log(...args){
    try {
      window.webContents.send('log', args.join(' '))
    } catch (e) {
      //console.log(e)
      // window has been destroyed
    }
  }
})

module.exports = {
  Renderer,
  Logger
}