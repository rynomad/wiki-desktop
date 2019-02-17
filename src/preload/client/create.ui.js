const CLASS_HEADER = 'desktop-header'
const CLASS_TITLE = 'create-title'
const CLASS_TITLE_BUTTON = 'create-title-button'
const CLASS_TITLE_INPUT = 'create-title-input'
const CLASS_ACTIVE = 'create-title-active'
const CLASS_TRANSITION = 'create-transition'
const crypto = require('crypto')

const addCSS = () => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    .${CLASS_HEADER} {
      border-top: 1px solid #3d3c43;
      box-shadow: inset 0px 0px 7px rgba(0, 0, 0, 0.8);
      background: #eeeeee url(/images/noise.png);
      position: fixed;
      left: 0;
      right: 0;
      height: 20px;
      padding: 10px;
      font-size: 80%;
      z-index: 1000;
      color: #ccdcd2;
    }

    .${CLASS_TRANSITION} {
      width : 0;
      display : none;
      transition : width 1s;
    }

    .${CLASS_ACTIVE} {
      width : auto;
      display : inline;
    }
  `;
  document.getElementsByTagName('head')[0].appendChild(style);
}


const update = () => {
  const $main = $('.main')
  $main.attr('style', 'top : 45px;')

  const $header = $(`<span class="${CLASS_HEADER}"></span>`)
  const $new_page = $(`<button class="${CLASS_TRANSITION} ${CLASS_ACTIVE}">new page</button>`)
  const $page_title = $(`<input class=${CLASS_TRANSITION} name="title" placeholder="New Page Title">`)
  
  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    $page_title.val('')
    $new_page.toggleClass(CLASS_ACTIVE)
    $page_title.toggleClass(CLASS_ACTIVE)
  }

  $new_page.click((e) => {
    toggle(e)
    $page_title.focus()
    console.log('target', e.target)
  })

  $page_title.keyup(e => {
    switch (e.keyCode){
      case 13: //enter
      const title = $page_title.val()
      wiki.origin.put(
        wiki.asSlug(title), 
        {type: 'create', id: wiki.asSlug(title), date : Date.now(), item: {title, story: [
          {
            text : 'Double Click to Start Editing',
            type : 'paragraph',
            id : crypto.randomBytes(8).toString('hex').toLowerCase()
          }
        ]}},
        (err) => {
          console.log('put page?', title, err)
          wiki.doInternalLink(title)

        }
      )
      case 27: //esc
      toggle(e)
      break;
      default:
    }
  })

  $header.prepend($new_page)
  $header.prepend($page_title)


  $(document.body).prepend($header)
}

const start = async () => {
  addCSS()
  update()
}

module.exports = start