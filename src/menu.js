const {Menu} = require('electron')

const Tray = ({tray, settings, storage}) => 
  Menu.buildFromTemplate([
    {
      label : 'home - open or reset wiki',
      click : () => {
        tray.emit('home')
      }
    },
    {
      label : 'settings',
      submenu : [
        {
          label : 'cache for offline',
          type : 'checkbox',
          checked : settings.cache,
          click : (item, ...args) => {
            tray.emit('settings:cache', item.checked)
          }          
        },
        {
          label : 'autoseed neighbors',
          type : 'checkbox',
          checked : settings.autoseed,
          click : (item, ...args) => {
            tray.emit('settings:autoseed', item.checked)
          }
        }
      ]
    },
    {
      label : 'storage',
      submenu : [
        {
          label : 'refresh',
          click : () => {
            tray.emit('storage:refresh')
          }
        },
        {
          label : 'clear',
          click : (item, ...args) => {
            tray.emit('storage:clear')
          }
        }
      ].concat(storage.map(({name, length}) => ({
        label : `${name} - ${length} items`,
        enabled : false
      })))
    },
    {
      type : 'separator'
    },
    {
      label : 'quit',
      role : 'quit'
    }
  ])

module.exports = {
  Tray
}
