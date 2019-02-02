const {cache} = require('./storage.js')
const {clone} = require('./json.js')

const ajaxTimeout = (url) => navigator.onLine ? 3000 
                          :  url.indexOf("//") === -1 ? 1000 
                          :  1

const cacheURL = async (url, type = 'GET', result) => {
  if (type != 'GET') return

  const put = await clone(result).catch(e => {
    console.warn(e)
    return result
  })

  await cache.setItem(url, put)
}

const retrieveURL = async (url, type, success, error, errors) => {
  if (type != 'GET') return 

  const result = await cache.getItem(url).catch(e => {
    console.warn(e)
    return null
  })

  if (!result) return error(...errors)
  console.log("result?",result)
  success(...result)
}

const patch = (ajax, settings) => ({
  url, 
  type,
  success = () => {}, 
  error = () => {}, 
  ...args
}) => ajax({
  url,
  type,
  timeout : ajaxTimeout(url),
  success :(...result) => {
    success(...result)
    cacheURL(url, type, result)
  },
  error : (...errors) => {
    retrieveURL(url, type, success, error, errors)
    //error(...errors)
  },
  ...args
})

let ajaxPatcher = null

const AjaxPatcher = (resolve, settings) => () => {
  try {
    $.ajax = patch($.ajax.bind($), settings)
    resolve()
  } catch (e) {
    requestIdleCallback(ajaxPatcher)
  }
}

module.exports = (settings) => new Promise((resolve) => {
  requestIdleCallback(ajaxPatcher = AjaxPatcher(resolve,settings))
})