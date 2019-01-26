const {fork} = require('child_process')
const path = require('path')
const {ipcMain, Menu, Tray} = require('electron')
const MDNS = require('./mdns.js')

const getUserHome = () => process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE

const favLoc = path.join(getUserHome(), '.wiki', 'status', 'favicon.png')

const startServer = async (log_window, port = 3000) => new Promise((resolve, reject) => {
  console.log("START")

  const log = (...args) => {
    console.log("WIKI", ...args)
    log_window.webContents.send('log', args.join(' '))
  }

  log("APP READER",path.resolve(__dirname,'..','node_modules','wiki','index.js'))
  const wiki = fork(path.resolve(__dirname,'..','node_modules','wiki','index.js'),[
    '--security_type',
    'desktop',
    '--cookieSecret',
    'test',
    '--port',
    port,
    '--packageDir',
    path.resolve(__dirname,'..','node_modules')
  ], {stdio : ['pipe','pipe','pipe','ipc']})
  let owner = {
    secret : '',
    name : ''
  }

  ipcMain.on('id', (event) => {
    log("GOT ID REQUEST")
    event.returnValue = owner.secret
  })
  /* todo : fix IPC for realistic transport of reclaim code
  wiki.on('message', (_owner) => {
    log("ONMESSAGE")
    log("GOT OWNER", _owner)
    owner = _owner
  })
  */
  wiki.on('error', (e) => {
    log("ERROR",e)
  })
  wiki.on('exit', (rc) => {
    log("WIKEXIT:", rc)
    reject(rc)
  })
  wiki.on('close', (rc) => {
    log("WIKLOSE:", rc)
    reject(rc)
  })
  log("post fork")
  wiki.stderr.on('data', (d) => {
    log("WIKERR:", d.toString())
  })

  let mdns
  let tray
  wiki.stdout.on('data', (d) => {
    const msg = d.toString()
    log("WIKI: ", msg)

    // hax, see aboves
    if (msg.indexOf('[[[OWNER:') >= 0){
      log("GOT OWNER")
      const [_, name, secret] = msg.split(':')
      owner = {name, secret}
      log("got owner", owner)
    }
    if (msg.indexOf('listening') >= 0 ){
      mdns = MDNS(port, owner, log)

      resolve(mdns)
    }

    if (!tray && ((msg.indexOf('POST /favicon.png 200') >= 0) || (msg.indexOf('GET /favicon.png 304') >= 0) || (msg.indexOf('GET /favicon.png 200') >= 0) )){
      console.log("CONSTRUCT TRAY", favLoc)
      tray = true
      mdns.emit('favLoc', favLoc)

      // construct sys tray to quit app
    }


  })
})

module.exports = startServer