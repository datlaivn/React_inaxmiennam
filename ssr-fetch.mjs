/**
 * SEO SSR Fetch — SQHOME
 *
 * Fetch HTML thật từ server (index.php đã có đầy đủ SEO meta tags + JSON-LD)
 * rồi lưu thành static HTML — GIỐNG Next.js SSG.
 *
 * Kết quả: mỗi trang có HTML đầy đủ với:
 *   ✅ Meta tags: title, description, og:*, twitter:*
 *   ✅ JSON-LD: Product Schema, Organization, WebSite, BreadcrumbList
 *   ✅ Nội dung <h1>, <h2>, <div> — Googlebot đọc được!
 *
 * Usage:
 *   node ssr-fetch.mjs                    # fetch từ VITE_API_BASE_URL (.env)
 *   VITE_API_BASE_URL=https://demo.inaxmiennam.vn node ssr-fetch.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'dist')

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.VITE_API_BASE_URL || 'https://demo.inaxmiennam.vn').replace(/\/$/, '')
const TIMEOUT_MS = 15000
const DELAY_MS = 200 // giữa các request tránh quá tải

// ─────────────────────────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchPage(urlPath, retries = 2) {
  const url = `${BASE_URL}${urlPath}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SQHOME-SSR-Fetch/1.0 (+https://sqhome.vn)',
          'Accept': 'text/html',
        },
      })
      clearTimeout(timeout)

      if (res.status === 404 || res.status === 500 || res.status === 502) {
        return null
      }
      if (!res.ok) {
        return null
      }

      const html = await res.text()
      if (html.length < 300) return null
      if (!html.includes('<div id="root"')) return null

      return html
    } catch (err) {
      if (attempt < retries) {
        await delay(1000 * (attempt + 1))
        continue
      }
      return null
    }
  }
}

async function fetchJSON(urlPath, retries = 1) {
  const url = `${BASE_URL}/api.php?_route=${urlPath}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SQHOME-SSR-Fetch/1.0' },
      })
      clearTimeout(timeout)
      if (!res.ok) return null
      return await res.json()
    } catch {
      if (attempt < retries) {
        await delay(500)
        continue
      }
      return null
    }
  }
}

function writePage(filePath, html) {
  if (!html) return false
  const outPath = path.join(OUT_DIR, filePath)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html, 'utf-8')
  return true
}

function kb(html) {
  return html ? `${(html.length / 1024).toFixed(1)} KB` : '0 KB'
}

// ─── Homepage ────────────────────────────────────────────────────────────────
async function fetchHomepage() {
  process.stdout.write('🏠 Homepage... ')
  const html = await fetchPage('/')
  if (!html) {
    console.warn('⚠️  FAILED — kiểm tra server!')
    return false
  }
  writePage('index.html', html)
  console.log(`✅ ${kb(html)}`)
  return true
}

// ─── Categories ─────────────────────────────────────────────────────────────
async function fetchCategories() {
  process.stdout.write('📂 Categories... ')
  const cats = await fetchJSON('get/product_category')
  if (!Array.isArray(cats) || cats.length === 0) {
    console.warn('⚠️  0 categories')
    return []
  }
  console.log(`${cats.length} found`)

  let ok = 0, fail = 0
  for (const cat of cats.slice(0, 60)) {
    const slug = cat.slug || ''
    if (!slug) continue
    process.stdout.write(`\r📂 ${slug}... `)
    const urlPath = `/danh-muc-san-pham/${slug}/`
    const html = await fetchPage(urlPath)
    if (html && writePage(path.join('danh-muc-san-pham', slug, 'index.html'), html)) {
      ok++
    } else {
      fail++
    }
    await delay(DELAY_MS)
  }
  console.log(`\r📂 Categories done: ✅${ok} ⚠️${fail}`)
  return cats
}

// ─── Products ───────────────────────────────────────────────────────────────
async function fetchProducts(cats) {
  process.stdout.write('🛒 Products... ')
  if (!cats || cats.length === 0) {
    console.warn('⚠️  no categories to fetch products from')
    return
  }

  let totalOk = 0, totalFail = 0, catDone = 0

  for (const cat of cats.slice(0, 20)) {
    const catSlug = cat.slug || ''
    if (!catSlug) continue

    process.stdout.write(`\r🛒 [${++catDone}/${cats.slice(0, 20).length}] ${catSlug}... `)
    const data = await fetchJSON(`get/danhmuc/${encodeURIComponent(catSlug)}`)
    const products = data?.items || []
    if (products.length === 0) continue

    let catOk = 0, catFail = 0
    for (const p of products.slice(0, 40)) {
      const slug = p.slug || ''
      if (!slug) continue

      const html = await fetchPage(`/san-pham/${slug}/`)
      if (html && writePage(path.join('san-pham', slug, 'index.html'), html)) {
        totalOk++
        catOk++
      } else {
        totalFail++
        catFail++
      }
      await delay(DELAY_MS)
    }
    process.stdout.write(`\r🛒 [${catDone}/${cats.slice(0, 20).length}] ${catSlug}: ✅${catOk} ⚠️${catFail}\n`)
  }
  console.log(`\r🛒 Products done: ✅${totalOk} total, ⚠️${totalFail} failed`)
}

// ─── News ──────────────────────────────────────────────────────────────────
async function fetchNews() {
  process.stdout.write('📰 News... ')
  const articles = await fetchJSON('get/news')
  if (!Array.isArray(articles) || articles.length === 0) {
    // Thử route khác
    const alt = await fetchJSON('get/tin-tuc')
    if (!Array.isArray(alt) || alt.length === 0) {
      console.warn('⚠️  0 articles')
      return
    }
    articles.length = 0
    articles.push(...alt)
  }

  console.log(`${articles.length} found`)
  let ok = 0, fail = 0
  for (const n of articles.slice(0, 30)) {
    const slug = n.slug || n.slug || ''
    if (!slug) continue
    process.stdout.write(`\r📰 ${slug}... `)
    const html = await fetchPage(`/tin-tuc/${slug}/`)
    if (html && writePage(path.join('tin-tuc', slug, 'index.html'), html)) {
      ok++
    } else {
      fail++
    }
    await delay(DELAY_MS)
  }
  console.log(`\r📰 News done: ✅${ok} ⚠️${fail}`)
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════')
  console.log('   SQHOME SSR Fetch — Full HTML SEO')
  console.log('═══════════════════════════════════════')
  console.log(`🌐 Server:   ${BASE_URL}`)
  console.log(`📁 Output:   ${OUT_DIR}`)
  console.log('───────────────────────────────────────')

  if (!fs.existsSync(path.join(OUT_DIR, 'assets'))) {
    console.error('\n❌ dist/assets/ không tồn tại!')
    console.error('   Chạy `npm run build` TRƯỚC, rồi mới chạy script này.')
    process.exit(1)
  }

  await fetchHomepage()
  const cats = await fetchCategories()
  await fetchProducts(cats)
  await fetchNews()

  console.log('\n═══════════════════════════════════════')
  console.log('✨ HOÀN TẤT!')
  console.log(`📁 HTML nằm trong: ${OUT_DIR}`)
  console.log('───────────────────────────────────────')
  console.log('💡 Kiểm tra nhanh:')
  console.log(`   curl ${BASE_URL}/san-pham/voi-sen-tam/`)
  console.log('   → View Source sẽ thấy <h1>, <meta>, JSON-LD!')
  console.log('\n🚀 Deploy thư mục `dist/` lên hosting.')
  console.log('═══════════════════════════════════════')
}

main().catch(err => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
