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
          label : 'sync neighbors proactively',
          type : 'checkbox',
          checked : settings.autosync,
          click : (item, ...args) => {
            tray.emit('settings:autosync', item.checked)
          }          
        },
        {
          label : 'seed neighbors from cache',
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
