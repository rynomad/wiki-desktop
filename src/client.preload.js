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

const createFetchHeaders = ({type, dataType, data, ...args}) => {
  console.log("create headers for type", type, dataType, data ,args)
  const headers = {}

  switch (dataType){
    case 'script':
     headers["Content-Type"] = 'application/javascript'
     break
    case 'json':
     headers["Content-Type"] = 'application/json'
     break
    default:
     if (typeof data === 'object'){
       headers["Content-Type"] = 'application/json'
     }
  }

  return headers
}

const createRequestMode = (url, type) => {
  if (['PUT', 'POST'].indexOf(type) >= 0) return 'same-origin'
  return 'no-cors'
}

const createBody = (url, data) => {
  try {
    return JSON.stringify(data)
  } catch (e) {
    return data
  }
}

const mapAjaxToFetch = ({url, type, data, dataType, cache, ...args}) => {
  console.log("AJAX UNNACOUNTED ARGS", type, data, dataType, args)

  const method = (type || "GET").toUpperCase()

  const body = createBody(url, data)

  const headers = createFetchHeaders({type, dataType, data})

  const mode = createRequestMode(url, type)


  return {
    mode,
    method,
    body,
    headers,
    ...args
  }
}

const parseJSON = (text) => {
  try {
    return JSON.parse(text)
  } catch (e) {
    console.log("error parsing json", text)
    return null
  }
}

const mapFetchResToAjax = async ({dataType}, res) => {
  const response = {}
  response.responseText = await res.text()
  response.responseJSON = parseJSON(response.responseText)
  return response
}

const createMonkeyAJAX = (ajax) => ({
  url, 
  success = () => {
    console.log("SUCCESS CB UNDEFINED")
  }, 
  error = () => {
    console.log("ERROR CB UNDEFINED")
  }, 
  ...args
}) => {
  const type = args.type
  console.log("AJAX", url)


  const fetch_deferred = $.Deferred((deferred) => {
    console.log("FETCH DISPATCH", type, url, args)
    fetch(url, mapAjaxToFetch({url, ...args})).then((res) => {
      console.log("FETCH THEN", type, url, res)
      if (res.type === 'opaque'){
        // server has no cors
        ajax({
          url,
          success,
          error,
          ...args
        }).done(deferred.success).fail(deferred.reject)
        return -1
      } else if (!res.ok){
        const e = new Error(res.statusText)
        e.xhr = res
        throw e
      }
      return mapFetchResToAjax(args, res)
    }).then((res) => {
      if (res === -1) return
      console.log("FETCH->AJAX SUCCESS", type, url, res)
      success(args.dataType === 'json' ? res.responseJSON : res)
      deferred.resolve(res.responseJSON || res.responseText)
    }).catch((e) => {
      console.log("FETCH CATCH", type, url, e)
      error(e.xhr, typeof e, e.message)
      deferred.reject(e.xhr, typeof e, e.message)
    })
  })


  const ajax_deferred = $.Deferred((deferred) => {
    console.log("AJAX DISPATCH", type, url, args)
    ajax({
      url,
      success : (context, ...args) => {
        console.log("AJAX SUCCESS", type, url, ...args)
        //success(context, ...args)
      },
      error : (context, ...args) => {
        console.log("AJAX ERROR", type, args)
        //error(context, ...args)
      },
      ...args
    }).done((...args) => {
      console.log("AJAX DONE", type, url, ...args)
      //deferred.resolve(...args)
    })
    .fail((...err) => {
      console.log("AJAX FAIL",type, url, ...err)
      console.log(err[1], err[2])
      //deferred.reject(...err)
    })
  })

  return fetch_deferred
  return ajax_deferred
}

const monkeyAJAX = () => {
  const ajax = $.ajax.bind($)

  $.ajax = createMonkeyAJAX(ajax)
}

window.onload = async () => {
  monkeyAJAX()
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