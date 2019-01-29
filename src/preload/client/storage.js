const {ipcRenderer} = require('electron')
const {createInstance} = require('localforage')

const stores = [
  'cache',
  'neighborhood',
  'settings',
  'favicons'
]

const methods = [
  'keys',
  'length',
  'clear'
]

const storage = module.exports = stores.reduce((obj, name) => ({
  [name] : createInstance({name}),
  ...obj
}),{})

const methodHandler = (method) => async (event, _name) => {
  console.log(`STORAGE: do ${method} on ${_name || 'all'}`)
  const results = []
  for (const name in storage){
    if (!_name || _name === name){
      const result = await storage[name][method]().catch((error) => {
        console.warn(error)
        ipcRenderer.send(`storage:${method}:error`, _name, error)
        return null
      })
      if (result){
        results.push({
          name,
          result
        })
      }
    }
  }
  console.log(`STORAGE: return ${results.length} results for ${method} on ${_name}`)
  ipcRenderer.send(`storage:${method}:done`, _name, results)
}

const registerIPCHandler = (method) => 
  ipcRenderer.on(`storage:${method}`, methodHandler(method))

for (const method of methods){
  registerIPCHandler(method)
  console.log('STORAGE: registered handler for ', method)
}
