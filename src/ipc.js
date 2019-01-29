const {ipcMain} = require('electron')

const Renderer = ({wiki, logger, window}) => {

  ipcMain.once('shift', (evt, height) => {
    console.log("REDO FAVICON", height)
    try {
      window.setBounds({height : Number.parseInt(height) + 1})
    } catch (e) {
      console.log(e)
    }
  })

  ipcMain.on('id', (event) => {
    logger.log("GOT ID REQUEST", wiki.owner.secret)
    event.returnValue = wiki.owner.secret
  })

  return {
    window,
    channelLocks : new Set(),
    send(channel, ...args){
      if (this.channelLocks.has(channel)){
        throw new Error('Re-entry of ' + channel)
      }
      this.channelLocks.add(channel)

      return new Promise((resolve, reject) => {
        const error_cb = (event, ...errors) => {
          console.error(...errors)
        }

        const done_cb = (event, ...results) => {
          ipcMain.removeListener(`${channel}:done`, done_cb)
          ipcMain.removeListener(`${channel}:error`, error_cb)
          this.channelLocks.delete(channel)
          resolve(results)
        }

        ipcMain.on(`${channel}:done`, done_cb)
        ipcMain.on(`${channel}:error`, error_cb)

        window.webContents.send(`${channel}`, ...args)
      })
    },
    storage(method, name){
      return this.send(`storage:${method}`, name)
    },
    settings(name, value){
      return this.send(`settings:${name}`, value)
    }
  }
}

const Logger = (window) => ({
  log(...args){
    window.webContents.send('log', args.join(' '))
  }
})

module.exports = {
  Renderer,
  Logger
}