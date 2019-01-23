const mdns = require('mdns-js')
const {EventEmitter} = require('events')
const os = require('os')

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const start = (port, owner, log) => {
  const dup = uuidv4()
  const found = new Map()
  const ret = new EventEmitter()
  ret.wikis = found

  const ad = mdns.createAdvertisement(mdns.tcp('http','wiki'), port, {
    name : os.hostname().split('.')[0],
    txt : {dup}
  });
  ad.start();
  
  let self = false

  // watch all http servers
  const browser = mdns.createBrowser(mdns.tcp('http','wiki'));
  browser.on('ready', () => {
    browser.discover()
  })

  browser.on('update', function(service) {
    console.log("SERVICE", service)
    const _dup = service.txt
               ? service.txt.map(t => t.split('=')).filter(a => a[0] === 'dup').map(a => a[1])[0]
               : null
    console.log('dup', _dup)
    if (!_dup) return console.log("ignoring non wiki")

    const url =  service.host + ':' + service.port

    if (_dup === dup) {
      if (!self){
        self = true
        ret.emit('self', service.type[0].name + '://' + url)
        return console.log('emitting self')
      }
      return console.log('ignoring self')
    }

    if (found.has(_dup)) return console.log('ignoring duplicate')

    found.set(_dup, url)
    ret.emit('up', url)
    console.log("service up: ", service);
  });

  process.on('close', () => {
    console.log("process exit")
    ad.stop()
  })

  return ret
  console.log("end start")
}

module.exports = start

// Hacker TDD
if (require.main === module){
  start(Number.parseInt(process.argv[2] || 3000))
}