// app.js adapted to use window.__GAME_DATA__ when available (MkDocs bundle)
const SEARCH_INPUT = document.getElementById('searchInput')
const GRID = document.getElementById('grid')
const PAGINATION = document.getElementById('pagination')

// ensure the grid element has the expected class so CSS rules apply
if(GRID && !GRID.classList.contains('grid')) GRID.classList.add('grid')

let manifest = []
let items = []
let filtered = []
let categoryCache = {} // filename -> items array
let currentPage = 1
const perPage = 20

function formatCategoryName(filename){
  return filename.replace(/\.json$/,'').replace(/[-_]/g,' ').toUpperCase()
}

// no longer building a custom sidebar — MkDocs default nav is used

function loadCategoryFromCache(file){
  if(!file){ items = []; filtered = []; currentPage = 1; renderPage(); return }
  const arr = categoryCache[file] || []
  items = arr.slice()
  filtered = items.slice()
  currentPage = 1
  renderPage()
}

function selectCategory(file){
  document.querySelectorAll('.category-item').forEach(n=>n.classList.remove('active'))
  const active = document.querySelector(`.category-item[data-file="${file}"]`)
  if(active) active.classList.add('active')
  SEARCH_INPUT.value = ''
  loadCategoryFromCache(file)
}

// category counts are not injected into MkDocs nav; this function removed

function renderPage(){
  // ensure grid container uses our grid layout (defensive in case theme overrides occur)
  if(GRID){
    GRID.classList.add('grid')
    GRID.style.gap = '20px'
  }
  GRID.innerHTML = ''
  const start = (currentPage-1)*perPage
  const pageItems = filtered.slice(start, start+perPage)

  // debug info to help troubleshoot counts/layout
  try{ console.debug('renderPage()', { totalFiltered: filtered.length, perPage, currentPage, start, pageItems: pageItems.length }) }catch(e){}

  if(pageItems.length === 0){
    GRID.innerHTML = '<div class="no-results">Nenhum resultado.</div>'
    PAGINATION.innerHTML = ''
    return
  }

  for(const it of pageItems){
    const card = document.createElement('div')
    card.className = 'card'
    // defensive: ensure the card doesn't span multiple columns or force min-width
    card.style.gridColumn = 'auto'
    card.style.minWidth = '0'
    card.style.width = '100%'
    // show skeleton loading state until image is loaded
    card.classList.add('loading')

    const img = document.createElement('img')
    img.alt = it.title || ''
    img.loading = 'lazy'
    img.decoding = 'async'
    img.className = 'cover-img'
    // try to load a higher-res (@2x) version for retina devices if available
    function pickRetinaSrc(original, cb){
      if(!original){ cb('https://via.placeholder.com/300x450?text=sem+imagem'); return }
      const dpr = (window.devicePixelRatio) ? window.devicePixelRatio : 1
      if(dpr > 1){
        // insert @2x before file extension: cover.jpg -> cover@2x.jpg
        try{
          const m = original.match(/^(.*)(\.[a-zA-Z0-9]{2,5})(\?.*)?$/)
          if(m){
            const base = m[1]
            const ext = m[2]
            const qs = m[3] || ''
            const candidate = base + '@2x' + ext + qs
            const tester = new Image()
            tester.onload = ()=> cb(candidate)
            tester.onerror = ()=> cb(original)
            tester.src = candidate
            return
          }
        }catch(e){ /* fallthrough */ }
      }
      cb(original)
    }

    pickRetinaSrc(it.cover, (chosen)=>{
      // normaliza URLs: transforma protocol-relative e http em https
      try{
        if(!chosen) chosen = ''
        if(chosen.startsWith('//')) chosen = 'https:' + chosen
        else if(chosen.startsWith('http://')) chosen = chosen.replace('http://', 'https://')
      }catch(e){ /* ignore */ }
      img.src = chosen
    })
    img.onerror = ()=>{ img.src = 'https://via.placeholder.com/300x450?text=sem+imagem' }
    // remove loading when image finishes (or after timeout)
    img.onload = ()=>{ card.classList.remove('loading') }
    setTimeout(()=>{ if(card.classList.contains('loading')) card.classList.remove('loading') }, 2500)

    const wrap = document.createElement('div')
    wrap.className = 'image-wrap'
    wrap.appendChild(img)

    // overlay title: hidden by default, shown on hover (visible on small screens)
    const overlay = document.createElement('div')
    overlay.className = 'cover-title'
    overlay.textContent = it.title || '(sem título)'

    // size badge (top-right) - only when meaningful
    const sizeVal = (it.size || '').toString().trim()
    const sizeText = (sizeVal && sizeVal.toUpperCase() !== 'N/A') ? sizeVal : ''
    if(sizeText){
      const bsize = document.createElement('div')
      bsize.className = 'badge-size'
      bsize.textContent = sizeText
      wrap.appendChild(bsize)
    }

    // category badge (bottom-left) - only when a text search is active
    const searchActive = (typeof SEARCH_INPUT !== 'undefined' && SEARCH_INPUT && (SEARCH_INPUT.value || '').trim().length > 0)
    if(searchActive && it.category){
      const bcat = document.createElement('div')
      bcat.className = 'badge-cat'
      bcat.textContent = it.category || ''
      wrap.appendChild(bcat)
    }

    // do NOT append the meta block under the cover — the cover should occupy the entire card
    card.appendChild(wrap)
    // append overlay after the wrap so it visually stacks above the image
    card.appendChild(overlay)

    card.addEventListener('click', (e)=>{
      e.preventDefault()
      if(it.magnet){ window.location.href = it.magnet }
      else if(it.url){ window.open(it.url, '_blank') }
    })

    GRID.appendChild(card)
  }

  renderPagination()
}

function renderPagination(){
  PAGINATION.innerHTML = ''
  const total = Math.ceil(filtered.length / perPage)
  if(total <= 1) return

  const prev = document.createElement('button')
  prev.className = 'page-btn'
  prev.textContent = '‹'
  prev.disabled = currentPage === 1
  prev.addEventListener('click', ()=>{ currentPage = Math.max(1, currentPage-1); renderPage() })
  PAGINATION.appendChild(prev)

  const start = Math.max(1, currentPage - 3)
  const end = Math.min(total, start + 6)
  for(let p = start; p <= end; p++){
    const b = document.createElement('button')
    b.className = 'page-btn' + (p === currentPage ? ' active' : '')
    b.textContent = String(p)
    b.addEventListener('click', ()=>{ currentPage = p; renderPage() })
    PAGINATION.appendChild(b)
  }

  const next = document.createElement('button')
  next.className = 'page-btn'
  next.textContent = '›'
  next.disabled = currentPage === total
  next.addEventListener('click', ()=>{ currentPage = Math.min(total, currentPage+1); renderPage() })
  PAGINATION.appendChild(next)
}

function applySearch(q){
  const qq = q.trim().toLowerCase()
  if(!qq){ filtered = items.slice(); currentPage = 1; renderPage(); return }

  // search across cached categories
  let combined = []
  Object.keys(categoryCache).forEach(file=>{
    const name = formatCategoryName(file)
    const arr = categoryCache[file].map(it => ({...it, _categoryFile: file, category: name}))
    combined = combined.concat(arr)
  })
  filtered = combined.filter(i => (i.title || '').toLowerCase().includes(qq))
  filtered.sort((a,b)=> new Date(b.scrapedAt) - new Date(a.scrapedAt))
  currentPage = 1
  renderPage()
}

let searchDebounce = null
if (SEARCH_INPUT) {
  SEARCH_INPUT.addEventListener('input', (e)=>{
    clearTimeout(searchDebounce)
    searchDebounce = setTimeout(()=> applySearch(e.target.value), 250)
  })
}

// init: prefer bundle
;(function init(){
  if(window.__GAME_DATA__){
    // window.__GAME_DATA__ keys are filenames
    manifest = Object.keys(window.__GAME_DATA__)
    manifest.forEach(f => {
      const arr = (window.__GAME_DATA__[f] || []).slice()
      arr.sort((a,b)=> new Date(b.scrapedAt) - new Date(a.scrapedAt))
      categoryCache[f] = arr
    })
    // if this is a category page, load that category; otherwise show recent items
    const pageEl = document.getElementById('pageCategory')
    if(pageEl && pageEl.dataset && pageEl.dataset.file){
      loadCategoryFromCache(pageEl.dataset.file)
    }else{
      // show recent items across all categories (top 100)
      let combined = []
      Object.keys(categoryCache).forEach(file=>{
        const name = formatCategoryName(file)
        const arr = categoryCache[file].map(it => ({...it, _categoryFile: file, category: name}))
        combined = combined.concat(arr)
      })
      combined.sort((a,b)=> new Date(b.scrapedAt) - new Date(a.scrapedAt))
      filtered = combined.slice(0, 100)
      currentPage = 1
      renderPage()
    }
  }else{
    // fallback: try fetching manifest.json (not ideal for MkDocs static bundle)
    fetch('data/manifest.json').then(r=>r.json()).then(m=>{
      manifest = m
      populateCategories()
      // lazy load counts
      m.forEach(async (f)=>{
        try{ const r = await fetch('data/'+f); const a = await r.json(); a.sort((x,y)=> new Date(y.scrapedAt)-new Date(x.scrapedAt)); categoryCache[f]=a; updateCategoryCounts() }catch(e){console.warn(e)}
      })
    }).catch(e=>{ console.warn('manifest fetch failed', e); populateCategories() })
  }
})()
;
// Note: grid columns are controlled via CSS (style.css) with !important rules
// to avoid conflicts with MkDocs themes. We keep the class `grid` on the container
// and do not apply inline grid-template-columns here so CSS media queries take effect.

// Sidebar toggle removed — sidebar state now follows theme defaults
