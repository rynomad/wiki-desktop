const {fork} = require('child_process')
const path = require('path')

module.exports = async ({app, logger}) => new Promise((resolve,reject) => {
  const wiki = fork(path.resolve(__dirname,'..','node_modules','wiki','index.js'),[
    '--security_type',
    'desktop',
    '--cookieSecret',
    'test',
    '--port',
    3000,
    '--packageDir',
    path.resolve(__dirname,'..','node_modules')
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