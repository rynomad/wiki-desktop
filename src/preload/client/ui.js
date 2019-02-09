const CLASS_HIDDEN = 'page-hidden'

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
  `;
  document.getElementsByTagName('head')[0].appendChild(style);
}


const update = () => {
  let to_update = $('.page:not(:has(.close))')
  to_update.each((idx, page) => {
    const $page = $(page)
    $page.attr('style', 'position: relative;')
    const $close = $('<p class="close">&#x2716;</p>')
    $close.attr('style', `
      position: absolute;
      top: 10px;
      right: 10px;
    `)

    $close.on('click', () => {
      const $prev  = $page.prev('.page')
      console.log($prev)
      $prev.toggleClass('active',true)
      $page.toggleClass('active',false)
      $page.toggleClass(CLASS_HIDDEN, true)
      setTimeout(() => {
        scrollTo($prev)
      },0) 
    })
    
    $close.appendTo($page)
  })
}