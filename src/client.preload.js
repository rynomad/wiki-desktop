window.ipcRenderer = require('electron').ipcRenderer
console.log("PRELOAD")
var forceRedraw = function(element){
  console.log('force redraw', element)
  if (!element) { return; }

  var n = document.createTextNode(' ');
  var disp = element.style.display;  // don't worry about previous display style

  element.appendChild(n);

  setTimeout(function(){
      n.parentNode.removeChild(n);
  },20); // you can play with this timeout to make it as short as possible
}

const wait = () => new Promise((resolve, reject) => setTimeout(() => resolve, 100))
// hack to make sure favicon resolves on first boot
window.onload = async () => {
  let done = false

  while (!done){
    try {
      console.log('refresh img' + `${location.protocol}//${location.host}/favicon.png`)
      const {status} = await fetch(`${location.protocol}//${location.host}/favicon.png`)
      if (status == 200) {
        const tag = $(`body > footer > span.neighborhood > span > div > img[title^='${location.host}']`)
        console.log(tag)
        tag.attr('src', '/favicon.png?time=' + new Date().getTime())
        done = true
      }
    } catch (e) {
      
    }
    wait()
  }+
  

  ipcRenderer.send('favicon', 'shift')
  ipcRenderer.on('mdns', (e, msg) => {
    console.log("GOT MDNS", msg)
    wiki.neighborhoodObject.registerNeighbor(msg)
  })
}