const 


const getLinks = (story) => 
  (story.filter(({type}) => type === 'paragraph')
       .map(({text}) => text)
       .join('\n')
       .match(/\[\[([^\]]+)\]\]/gi) || []).map(wiki.asSlug)


const link = async (slug) => new Promise((resolve,reject) => {
  $.ajax({
    type : 'GET',
    url : `${location.origin}/${slug}.json`,
    success : resolve,
    error : reject
  })
})

window.Wik = async (page = $('.page').first().data('data'), found = new Map(), failed = new Set()) => {
  found.set(wiki.asSlug(page.title), page)
  const slugs = getLinks(page.story).filter(slug => !(found.has(slug) || failed.has(slug)))
  for (const slug of slugs ){
    const _page = await link(slug).catch((e) => {
      failed.add(slug)
      return null
    })

    if (!_page) continue

    await Wik(_page, found, failed)
  }

  return ({
    wik : wiki.asSlug(page.title),
    pages : Array.from(found)
  })
}

