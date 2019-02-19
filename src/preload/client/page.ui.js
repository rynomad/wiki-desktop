const CLASS_HIDDEN = 'page-hidden'
const { remote } = require('electron')
const { Menu, MenuItem} = remote
const crypto = require('crypto')
const {Wik} = require('./export.js')

findScrollContainer = () =>{
  const scrolled = $("body, html").filter(() => $(window).scrollLeft() > 0)

  if (scrolled.length > 0)
    return scrolled
  else
    return $("body, html").scrollLeft(12).filter(() => $(window).scrollLeft() > 0).scrollTop(0)
}

const scrollTo = ($page) => {
  if (!$page.position()) return
  const sc = findScrollContainer()
  const bodyWidth = $("body").width()
  const minX = sc.scrollLeft()
  const maxX = minX + bodyWidth
  const target = $page.position().left
  const width = $page.outerWidth(true)
  const contentWidth = $(".page").outerWidth(true) * $(".page").length

  if (target < minX)
    sc.animate({scrollLeft: target})
  else if (target + width > maxX)
    sc.animate({scrollLeft: target - (bodyWidth - width)})
  else if (maxX > $(".pages").outerWidth())
    sc.animate({scrollLeft: Math.min(target, contentWidth - bodyWidth)})
}

const addCSS = () => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    .${CLASS_HIDDEN} {
      width : 0;
      margin : 0;
    }
    .page {
      transition : width 1s;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `;
  document.getElementsByTagName('head')[0].appendChild(style);
}


const update = () => {
  let to_update = $('.header:not(:has(.header-buttons))')
  to_update.each((idx, header) => {
    wiki.Menu = Menu
    wiki.MenuItem = MenuItem
    const $header = $(header)
    const $page = $header.parent().parent()

    const $control = $(`
      <div class="control-buttons header-buttons">
        <a href="#" class="button hamburger">&#9776;</a>
        <a href="#" class="button close">&#x2716;</a>
      </div>
    `)

    $control.delegate('.hamburger', 'click', (e) => {
      console.log('hamburger')
      e.preventDefault()
      e.stopPropagation()
      const menu = new Menu()
      if (!($page.hasClass('remote' || $page.hasClass('plugin') || page.hasClass('local')))){
        menu.append(new MenuItem({ 
          label: 'add link',
          submenu : wiki.neighborhood[location.host].sitemap.map((entry) => ({
            label : entry.title,
            click : () =>  {
              const slug = $page.attr('id')
              const id = crypto.randomBytes(8).toString('hex').toLowerCase()
              wiki.origin.put(
                slug, 
                {
                  type: 'add', 
                  id ,
                  item: { 
                    id,                 
                    text : `[[${entry.title}]] (Double Click To Edit Caption)`,
                    type : 'paragraph',
                  }
                },
                (err) => {
                  console.log('put page?', entry.title, err)
                  wiki.doInternalLink(slug, $page.prev('.page'))
                }
              )
            }
          }))
        }))

        menu.append(new MenuItem({
          label : 'export .wik file',
          click : () => {
            Wik($page.data('data'))
          }
        }))

        menu.append(new MenuItem({
          label : 'delete page',
          click : () => {
            const slug = $page.attr('id')
            wiki.origin.delete(`${slug}.json`, (e) => {
              $page.find('.button.close').trigger('click')
              wiki.neighborhood[location.host] = null
              wiki.neighborhoodObject.registerNeighbor(location.host) 
              console.log('delete?', e)
            })    
          }
        }))
      } else {
        menu.append(new MenuItem({ 
          label: 'fork page', 
          click : () => $page.find('.fork-page').click()
        }))
      }


      menu.popup({ window: remote.getCurrentWindow() })
    })

    $control.delegate('.close', 'click', () => {
      console.log($header)
      const $prev  = $page.prev(`.page:not(:has(.${CLASS_HIDDEN}))`)
      console.log($page)
      $prev.toggleClass('active',true)
      $page.toggleClass('active',false)
      $page.toggleClass(CLASS_HIDDEN, true)
      setTimeout(() => {
        scrollTo($prev)
      },0) 
    })
    
    $control.appendTo($header)
  })
}

const idleUpdate = async () => new Promise(resolve => {
  requestIdleCallback(() => {
    update()
    resolve()
  })
})

const start = async () => {
  addCSS()
  while (true){
    await idleUpdate()
  }
}

module.exports = start