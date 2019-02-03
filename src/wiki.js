const {fork} = require('child_process')
const path = require('path')
const {dialog} = require('electron')
const getUserHome = () => process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
const oldWikiDir = path.join(getUserHome(),'.wiki')
const wikiDir = path.join(getUserHome(), '.wiki-desktop')
const home = require('fs-jetpack').dir(getUserHome())

module.exports = async ({app, logger}) => new Promise(async (resolve,reject) => {
  if (home.exists(path.join(oldWikiDir,'pages')) && !home.exists(path.join(wikiDir, 'pages'))){
    console.log('old wiki exists')
    const res = dialog.showMessageBox({
      title : 'Wiki Detected',
      message : 'this is your first wiki desktop, but we detect another wiki on your system, would you like to import it?',
      type : 'question',
      buttons : [
        'start fresh',
        'import wiki'
      ] 
    })
    if (res) {
      console.log('copying old wiki')
      home.cwd(oldWikiDir).copy('pages', home.cwd(wikiDir).path('pages'))
    }
  }

  const wiki = fork(path.resolve(__dirname,'..','node_modules','wiki','index.js'),[
    '--security_type',
    'desktop',
    '--cookieSecret',
    'test',
    '--port',
    3000,
    '--packageDir',
    path.resolve(__dirname,'..','node_modules'),
    '--data',
    wikiDir
  ], {stdio : ['pipe','pipe','pipe','ipc']})

  wiki.owner = {
    secret : '',
    name : ''
  }
  
  wiki.on('error', (e) => {
    logger.log("ERROR",e)
  })
  wiki.on('exit', (rc) => {
    logger.log("WIKEXIT:", rc)
    reject(rc)
  })
  wiki.on('close', (rc) => {
    logger.log("WIKLOSE:", rc)
    reject(rc)
  })
  logger.log("post fork")
  wiki.stderr.on('data', (d) => {
    logger.log("WIKERR:", d.toString())
  })

  wiki.stdout.on('data', (d) => {
    const msg = d.toString()
    logger.log("WIKI: ", msg)

    // hax
    if (msg.indexOf('[[[OWNER_:_') >= 0){
      const [_, name, secret] = msg.split('_:_')
      wiki.owner = {name, secret}
      logger.log("got owner", wiki.owner)
    }

    if (msg.indexOf('listening') >= 0 ){
      resolve(wiki)
    }
  })
})