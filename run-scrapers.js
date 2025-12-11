#!/usr/bin/env node
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(process.cwd(), 'data')
const SCRAPERS_DIR = path.join(process.cwd(), 'scrapers')

function log(...args){ console.log('[scrapers]', ...args) }

async function main(){
  if(!fs.existsSync(DATA_DIR)){
    log('Data directory not found:', DATA_DIR)
    process.exit(1)
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  if(files.length === 0){
    log('No JSON files found in data/. Nothing to scrape.')
    return
  }

  log(`Found ${files.length} data files, checking for scrapers in ./scrapers`)

  for(const f of files){
    const name = path.basename(f, '.json')
    const jsScraper = path.join(SCRAPERS_DIR, `${name}.js`)
    const pyScraper = path.join(SCRAPERS_DIR, `${name}.py`)
    const genericRunner = path.join(SCRAPERS_DIR, `_category_runner.js`)
    if(fs.existsSync(jsScraper)){
      log('Running JS scraper for', name)
      try{
        execSync(`node "${jsScraper}"`, { stdio: 'inherit' })
      }catch(e){
        log('scraper failed for', name, e.message)
      }
    } else if(fs.existsSync(pyScraper)){
      log('Running Python scraper for', name)
      try{
        execSync(`python3 "${pyScraper}"`, { stdio: 'inherit' })
      }catch(e){
        log('scraper failed for', name, e.message)
      }
    } else if (fs.existsSync(genericRunner)) {
      log('No specific scraper for', name, '- using generic runner')
      try {
        execSync(`node "${genericRunner}" "${name}"`, { stdio: 'inherit' })
      } catch (e) {
        log('generic runner failed for', name, e.message)
      }
    } else {
      log('No scraper for', name, '- skipping')
    }
  }

  log('All scrapers processed (or skipped).')
}

main().catch(e=>{ console.error(e); process.exit(1) })
