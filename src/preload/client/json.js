const stringify = async (obj) => new Promise((resolve,reject) => {
  try {
    resolve(JSON.stringify(obj))
  } catch (e){
    reject(e)
  }
})

const parse = async (string) => new Promise((resolve, reject) => {
  try {
    resolve(JSON.parse(string))
  } catch (e){
    reject(e)
  }
})

const clone = async (obj) => await parse(await stringify(obj))

module.exports =  {
  stringify,
  parse,
  clone
}