const pageUI = require('./page.ui.js')
const createPage = require('./create.ui.js')

const patch = module.exports = async () => Promise.all([
  pageUI(),
  createPage()
])