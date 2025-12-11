// app.js adapted to use window.__GAME_DATA__ when available (MkDocs bundle)
// locate a single search input on the page: prefer explicit `#searchInput`,
// otherwise try common selectors used by MkDocs Material and fall back to
// the first visible input[type=search] with a Portuguese placeholder.
let SEARCH_INPUT = null
function findSearchInput(){
  const byId = document.getElementById('searchInput')
  if(byId) return byId
  const selectors = [
    'input.md-search__input',
    'input.md-header-search__input',
    'header input[type="search"]',
    'input[type="search"].md-search-input',
    'input[type="search"]'
  ]
  for(const sel of selectors){
    const el = document.querySelector(sel)
    if(el) return el
  }
  // try placeholder match (Portuguese)
  const all = Array.from(document.querySelectorAll('input[type="search"], input'))
  for(const el of all){
    const ph = (el.getAttribute('placeholder')||'').toLowerCase()
    if(ph.includes('buscar') || ph.includes('buscar por')) return el
  }
  return null
}
SEARCH_INPUT = findSearchInput()
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

    // create an image-wrap and use background-image to render the cover.
    // This avoids leaving an empty area when <img> fails to load and gives
    // us finer control for fallback (show overlay title when no image).
    const wrap = document.createElement('div')
    wrap.className = 'image-wrap'
    // ensure background covers the whole card
    wrap.style.backgroundSize = 'cover'
    wrap.style.backgroundPosition = 'center'
    wrap.style.backgroundRepeat = 'no-repeat'
    wrap.style.width = '100%'
    wrap.style.height = '100%'

    // Robust image loading strategy:
    // 1) Try original URL (and https variant if original is http)
    // 2) If original loads, set it as background. If DPR>1, attempt @2x in background and replace if succeeds.
    // 3) If original fails, fallback to placeholder.
    function tryLoadUrl(url, onload, onerror){
      if(!url){ onerror(); return }
      const t = new Image()
      t.onload = ()=> { console.debug('image ok', url); onload(url) }
      t.onerror = ()=> { console.warn('image failed', url); onerror(url) }
      t.src = url
    }

    // Helper to extract hostname
    function getHost(url){
      try{ const u = new URL(url); return u.hostname }catch(e){ return null }
    }

    // whitelist of hosts where proxying is allowed/desired (to bypass hotlink protections)
    const PROXY_WHITELIST = ['imageban.ru','i5.imageban.ru','i2.imageban.ru','i3.imageban.ru','i117.fastpic.org','fastpic.ru']

    function loadBestImage(original){
      if(!original){
        // no original, use placeholder
        wrap.style.backgroundImage = "url('https://via.placeholder.com/300x450?text=sem+imagem')"
        card.classList.remove('loading')
        card.classList.add('no-image')
        return
      }

      // try original first
      tryLoadUrl(original, (okUrl)=>{
        console.debug('using original', original)
        // set a neutral background color while image renders
        wrap.style.backgroundColor = 'rgba(0,0,0,0.04)'
        wrap.style.backgroundImage = `url('${okUrl}')`
        card.classList.remove('loading')
        card.classList.remove('no-image')

        // NOTE: removed automatic @2x probing to avoid many 404s for servers
        // that don't provide retina variants. If you want @2x support later,
        // re-enable it conditionally per-host or via a configuration flag.
      }, ()=>{
        console.debug('original failed, attempting https fallback if applicable', original)
        // original failed — if it was http, try https
        if(original.startsWith('http://')){
          const httpsUrl = original.replace(/^http:\/\//i, 'https://')
          tryLoadUrl(httpsUrl, (ok)=>{ wrap.style.backgroundImage = `url("${ok}")`; card.classList.remove('loading'); card.classList.remove('no-image') }, ()=>{
            console.warn('https fallback failed for', original)
            // https also failed -> decide whether to try proxy based on host whitelist
            try{
              const host = getHost(original)
              const allowed = host && PROXY_WHITELIST.some(h=> host.endsWith(h))
              if(allowed){
                console.debug('attempting proxy for host', host)
                const proxied = 'https://images.weserv.nl/?url=' + encodeURIComponent(original.replace(/^https?:\/\//i,'')) + '&w=600'
                tryLoadUrl(proxied, (okp)=>{ wrap.style.backgroundImage = `url('${okp}')`; card.classList.remove('loading'); card.classList.remove('no-image') }, ()=>{
                  // proxy failed -> placeholder
                  wrap.style.backgroundImage = "url('https://via.placeholder.com/300x450?text=sem+imagem')"
                  card.classList.remove('loading')
                  card.classList.add('no-image')
                })
              } else {
                console.debug('host not whitelisted for proxy:', host)
                wrap.style.backgroundImage = "url('https://via.placeholder.com/300x450?text=sem+imagem')"
                card.classList.remove('loading')
                card.classList.add('no-image')
              }
            }catch(e){
              wrap.style.backgroundImage = "url('https://via.placeholder.com/300x450?text=sem+imagem')"
              card.classList.remove('loading')
              card.classList.add('no-image')
            }
          })
        } else {
          // direct fail -> try proxy only if whitelisted
          try{
            const host = getHost(original)
            const allowed = host && PROXY_WHITELIST.some(h=> host.endsWith(h))
            if(allowed){
              const proxied = 'https://images.weserv.nl/?url=' + encodeURIComponent(original.replace(/^https?:\/\//i,'')) + '&w=600'
              tryLoadUrl(proxied, (okp)=>{ wrap.style.backgroundImage = `url('${okp}')`; card.classList.remove('loading'); card.classList.remove('no-image') }, ()=>{
                wrap.style.backgroundImage = "url('https://via.placeholder.com/300x450?text=sem+imagem')"
                card.classList.remove('loading')
                card.classList.add('no-image')
              })
            } else {
              wrap.style.backgroundImage = "url('https://via.placeholder.com/300x450?text=sem+imagem')"
              card.classList.remove('loading')
              card.classList.add('no-image')
            }
          }catch(e){
            wrap.style.backgroundImage = "url('https://via.placeholder.com/300x450?text=sem+imagem')"
            card.classList.remove('loading')
            card.classList.add('no-image')
          }
        }
      })
    }

    loadBestImage(it.cover)

    // fail-safe: after timeout remove skeleton and mark as no-image
    setTimeout(()=>{ if(card.classList.contains('loading')){ card.classList.remove('loading'); card.classList.add('no-image') } }, 2500)

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
} else {
  // if no search input found, log a helpful warning
  console.warn('search input not found — search disabled (no #searchInput or theme search found)')
}

// init: prefer bundle
;(function init(){
  // Prefer bundle injected at build time
  if(window.__GAME_DATA__ && Object.keys(window.__GAME_DATA__).length > 0){
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
    return
  }

  // If bundle exists but is empty, or bundle wasn't injected, show a friendly message
  if(window.__GAME_DATA__ && Object.keys(window.__GAME_DATA__).length === 0){
    const hint = document.createElement('div')
    hint.className = 'no-results'
    hint.innerHTML = '<strong>Nenhum dado foi carregado.</strong><br>Execute <code>python3 generate_bundle.py</code> com os arquivos JSON em <code>data/</code> para gerar <code>docs/assets/js/data-bundle.js</code>.';
    if(GRID) GRID.innerHTML = '';
    if(GRID) GRID.appendChild(hint);
    if(PAGINATION) PAGINATION.innerHTML = '';
    return;
  }

  // fallback: try fetching manifest.json (not ideal for MkDocs static bundle)
  fetch('data/manifest.json').then(r=>r.json()).then(m=>{
    manifest = m
    populateCategories()
    // lazy load counts
    m.forEach(async (f)=>{
      try{ const r = await fetch('data/'+f); const a = await r.json(); a.sort((x,y)=> new Date(y.scrapedAt)-new Date(x.scrapedAt)); categoryCache[f]=a; updateCategoryCounts() }catch(e){console.warn(e)}
    })
  }).catch(e=>{ console.warn('manifest fetch failed', e); populateCategories() })
  
})()
;
// Note: grid columns are controlled via CSS (style.css) with !important rules
// to avoid conflicts with MkDocs themes. We keep the class `grid` on the container
// and do not apply inline grid-template-columns here so CSS media queries take effect.

// Sidebar toggle removed — sidebar state now follows theme defaults
