// Legacy app.js copied to legacy_assets so the legacy index keeps working if needed

const SEARCH_INPUT = document.getElementById('searchInput')
const GRID = document.getElementById('grid')
const PAGINATION = document.getElementById('pagination')

let manifest = []
let items = []
let filtered = []
let categoryCache = {} // filename -> items array
let currentPage = 1
const perPage = 20

function formatCategoryName(filename){
  return filename.replace(/\.json$/,'').replace(/[-_]/g,' ').toUpperCase()
}

async function loadManifest(){
  try{
    const res = await fetch('data/manifest.json')
    if(res.ok){
      manifest = await res.json()
    }else{
      manifest = [
        '3ds.json','dreamcast.json','ds.json','gamecube.json','ps2.json','ps3.json','ps4.json','ps5.json',
        'psp.json','psvita.json','psx.json','switch.json','wii.json','wiiu.json','windows-arcade.json',
        'windows-fight.json','windows-first-person.json','windows-horror.json','windows-rpg.json',
        'windows-rts.json','windows-third-person.json','xbox360.json'
      ]
      return
    }
  }catch(e){
    manifest = [
      '3ds.json','dreamcast.json','ds.json','gamecube.json','ps2.json','ps3.json','ps4.json','ps5.json',
      'psp.json','psvita.json','psx.json','switch.json','wii.json','wiiu.json','windows-arcade.json',
      'windows-fight.json','windows-first-person.json','windows-horror.json','windows-rpg.json',
      'windows-rts.json','windows-third-person.json','xbox360.json'
    ]
  }
}

function populateCategories(){
  const list = document.getElementById('categoryList')
  list.innerHTML = ''
  if(!manifest || manifest.length === 0){
    const li = document.createElement('li')
    li.className = 'category-item'
    li.textContent = 'Nenhuma categoria encontrada (verifique data/manifest.json ou console)'
    list.appendChild(li)
    console.warn('manifest vazio', manifest)
    return
  }
  const liAll = document.createElement('li')
  liAll.className = 'category-item active'
  liAll.dataset.file = ''
  liAll.innerHTML = '<span>Todas</span><span class="category-count"></span>'
  liAll.addEventListener('click', ()=>{ selectCategory('') })
  list.appendChild(liAll)

  manifest.forEach(f => {
    const li = document.createElement('li')
    li.className = 'category-item'
    li.dataset.file = f
    li.innerHTML = `<span>${formatCategoryName(f)}</span><span class="category-count">…</span>`
    li.addEventListener('click', ()=>{ selectCategory(f) })
    list.appendChild(li)
  })
}

async function loadCategory(file){
  if(!file){
    items = []
    filtered = []
    currentPage = 1
    renderPage()
    return
  }
  try{
    if(categoryCache[file]){
      items = categoryCache[file].slice()
    }else{
      const res = await fetch('data/' + file)
      const arr = await res.json()
      arr.sort((a,b)=> new Date(b.scrapedAt) - new Date(a.scrapedAt))
      categoryCache[file] = arr
      items = arr.slice()
    }
    filtered = items.slice()
    currentPage = 1
    renderPage()
  }catch(e){
    console.error('Erro ao carregar categoria', e)
    items = []
    filtered = []
    renderPage()
  }
}

function selectCategory(file){
  document.querySelectorAll('.category-item').forEach(n=>n.classList.remove('active'))
  const active = document.querySelector(`.category-item[data-file="${file}"]`)
  if(active) active.classList.add('active')
  SEARCH_INPUT.value = ''
  if(!file){
    items = []
    filtered = []
    currentPage = 1
    renderPage()
    return
  }
  loadCategory(file)
}

async function ensureAllCategoriesLoaded(){
  const toLoad = manifest.filter(f => !categoryCache[f])
  if(toLoad.length === 0) return
  await Promise.all(toLoad.map(async (f)=>{
    try{
      const res = await fetch('data/' + f)
      const arr = await res.json()
      arr.sort((a,b)=> new Date(b.scrapedAt) - new Date(a.scrapedAt))
      categoryCache[f] = arr
    }catch(e){ console.warn('failed to load', f, e) }
  }))
  updateCategoryCounts()
}

function updateCategoryCounts(){
  document.querySelectorAll('.category-item').forEach(li=>{
    const file = li.dataset.file
    const cntEl = li.querySelector('.category-count')
    if(file === ''){ cntEl.textContent = '' ; return }
    const cnt = categoryCache[file] ? categoryCache[file].length : '–'
    cntEl.textContent = cnt
  })
}

function clearGrid(){
  items = []
  filtered = []
  currentPage = 1
  renderPage()
}

function renderPage(){
  GRID.innerHTML = ''
  const start = (currentPage-1)*perPage
  const pageItems = filtered.slice(start, start+perPage)

  if(pageItems.length === 0){
    GRID.innerHTML = '<div class="no-results">Nenhum resultado.</div>'
    PAGINATION.innerHTML = ''
    return
  }

  for(const it of pageItems){
    const card = document.createElement('div')
    card.className = 'card'

    const img = document.createElement('img')
    img.className = 'cover-img'
    img.loading = 'lazy'
    img.decoding = 'async'
    img.src = it.cover || ''
    img.alt = it.title || ''
    img.onerror = ()=>{ img.src = 'https://via.placeholder.com/300x200?text=sem+imagem' }

    const wrap = document.createElement('div')
    wrap.className = 'image-wrap'
    wrap.appendChild(img)

    const tooltip = document.createElement('div')
    tooltip.className = 'cover-tooltip'
    tooltip.textContent = it.title || '(sem título)'
    card.appendChild(tooltip)

    const meta = document.createElement('div')
    meta.className = 'meta'
    const title = document.createElement('div')
    title.className = 'title'
    title.textContent = it.title || '(sem título)'
    const size = document.createElement('div')
    size.className = 'size'
    size.textContent = it.size || ''
    const badge = document.createElement('div')
    badge.className = 'badge'
    badge.textContent = it.category || ''

    meta.appendChild(title)
    meta.appendChild(size)
    meta.appendChild(badge)

    card.appendChild(wrap)
    card.appendChild(meta)

    card.addEventListener('click', (e)=>{
      e.preventDefault()
      if(it.magnet){
        window.location.href = it.magnet
      }else if(it.url){
        window.open(it.url, '_blank')
      }
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
  if(!qq){
    filtered = items.slice()
    currentPage = 1
    renderPage()
    return
  }
  ensureAllCategoriesLoaded().then(()=>{
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
  })
}

let searchDebounce = null
SEARCH_INPUT.addEventListener('input', (e)=>{
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(()=> applySearch(e.target.value), 250)
})

;(async ()=>{
  await loadManifest()
  populateCategories()
  await ensureAllCategoriesLoaded()
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
})()
