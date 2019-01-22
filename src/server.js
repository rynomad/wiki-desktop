const {fork} = require('child_process')
const path = require('path')
const {ipcMain} = require('electron')

const startServer = async () => new Promise((resolve, reject) => {
  console.log("APP READER",path.resolve(__dirname,'..','node_modules','wiki','index.js'))
  const wiki = fork(path.resolve(__dirname,'..','node_modules','wiki','index.js'),[
    '--security_type',
    'desktop',
    '--cookieSecret',
    'test', 
    '--packageDir',
    path.resolve(__dirname,'..','node_modules')
  ], {stdio : ['pipe','pipe','pipe','ipc']})
  let owner = ''

  ipcMain.on('id', (event) => {
    console.log("GOT ID REQUEST")
    event.returnValue = owner
  })
  /* todo : fix IPC for realistic transport of reclaim code
  wiki.on('message', (_owner) => {
    console.log("ONMESSAGE")
    console.log("GOT OWNER", _owner)
    owner = _owner
  })
  */
  wiki.on('error', (e) => {
    console.log("ERROR",e)
  })
  wiki.on('exit', (rc) => {
    console.log("WIKEXIT:", rc)
    reject(rc)
  })
  wiki.on('close', (rc) => {
    console.log("WIKLOSE:", rc)
    reject(rc)
  })
  console.log("post fork")
  wiki.stderr.on('data', (d) => {
    console.log("WIKERR:", d.toString())
  })

  wiki.stdout.on('data', (d) => {
    const msg = d.toString()
    console.log("WIKI: ", msg)

    // hax, see aboves
    if (msg.indexOf('RECLAIM_CODE:') === 0){
      owner = msg.split(':')[1].split(' ')[0]
    }

    if (msg.indexOf('listening') >= 0 ){
      resolve(wiki)
    }
  })
})

module.exports = startServer