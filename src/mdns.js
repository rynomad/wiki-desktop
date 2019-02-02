const mdns = require('mdns-js')
const {EventEmitter} = require('events')
const os = require('os')

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const start = ({app, logger}) => new Promise((resolve,reject) => {
  const dup = uuidv4()
  const ee = new EventEmitter()
  ee.wikis = new Map()

  const ad = mdns.createAdvertisement(mdns.tcp('http','wiki'), 3000, {
    name : os.hostname().split('.')[0],
    txt : {dup}
  });

  const browser = mdns.createBrowser(mdns.tcp('http','wiki'));

  browser.on('ready', () => {
    ad.start()
    browser.discover()
  })

  browser.on('update', function(service) {
    const _dup = service.txt
               ? service.txt.map(t => t.split('=')).filter(a => a[0] === 'dup').map(a => a[1])[0]
               : null
    //console.log("FOUND SERVICE", service)
    if (!_dup || ee.wikis.has(_dup)) return

    const url = service.host + ':' + service.port
    ee.wikis.set(_dup, url)
    console.log("FOUND WIKI", service)

    if (_dup === dup) {
      ee.self = service.type[0].name + '://' + url
      return resolve(ee)
    } 

    ee.emit('wiki', url)
  });

  process.on('close', () => {
    console.log("process exit")
    ad.stop()
  })
})

module.exports = start

// Hacker TDD
if (require.main === module){
  start(Number.parseInt(process.argv[2] || 3000))
}