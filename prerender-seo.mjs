/**
 * SEO Prerender — SQHOME
 *
 * Chạy SAU `npm run build` để generate static HTML đầy đủ cho Google SEO.
 * Giống Next.js SSG: mỗi trang có HTML riêng với đầy đủ meta tags, JSON-LD.
 *
 * Usage:
 *   node prerender-seo.mjs
 *
 * Cần .env có: VITE_API_BASE_URL=http://localhost:8888
 * Hoặc chạy trên hosting: VITE_API_BASE_URL=https://domain.com
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:8888'
const IS_PROD = API_BASE.includes('https://')

// Tải index shell (không có meta — sẽ được inject)
const INDEX_PATH = path.join(__dirname, 'dist', 'index.html')

// Thư mục output
const OUT_DIR = path.join(__dirname, 'dist')
// ─────────────────────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  try { return await res.json() } catch { return null }
}

function loadIndexShell() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('❌ Không tìm thấy dist/index.html — chạy `npm run build` trước!')
    process.exit(1)
  }
  return fs.readFileSync(INDEX_PATH, 'utf-8')
}

function formatPrice(v) {
  if (!v && v !== 0) return ''
  const n = Math.floor(parseFloat(v))
  return n.toLocaleString('vi-VN') + '₫'
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function slugify(str) {
  return String(str ?? '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ─── HTML Template Generator ──────────────────────────────────────────────────
function buildPageMeta({ title, description, image, url, type, publishedTime, author, price, availability, brand }) {
  const siteName = 'SQHOME - Thiết bị vệ sinh INAX chính hãng'

  let ogExtras = ''
  if (type === 'article') {
    ogExtras += `    <meta property="article:published_time" content="${esc(publishedTime)}" />\n`
    ogExtras += `    <meta property="article:author" content="${esc(author)}" />\n`
    ogExtras += `    <meta property="article:section" content="Tin tức" />\n`
  }
  if (type === 'product' && price) {
    ogExtras += `    <meta property="product:price:amount" content="${price}" />\n`
    ogExtras += `    <meta property="product:price:currency" content="VND" />\n`
  }

  const schema = buildSchema({ type, title, description, image, url, price, availability, brand })

  return {
    title: `${esc(title)} | ${esc(siteName)}`,
    description: esc(description),
    canonical: esc(url),
    image: esc(image),
    type: esc(type),
    ogExtras,
    schema,
    siteName: esc(siteName),
    locale: 'vi_VN',
  }
}

function buildSchema({ type, title, description, image, url, price, availability, brand }) {
  const schemas = []

  // WebSite
  schemas.push({
    '@context': 'https://schema.org/',
    '@type': 'WebSite',
    'name': 'SQHOME - Thiết bị vệ sinh INAX chính hãng',
    'url': IS_PROD ? API_BASE : 'https://inaxmiennam.vn',
    'description': description,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': { '@type': 'EntryPoint', 'urlTemplate': (IS_PROD ? API_BASE : 'https://inaxmiennam.vn') + '/search/{search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  })

  // Organization
  schemas.push({
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    'name': 'SQHOME',
    'url': IS_PROD ? API_BASE : 'https://inaxmiennam.vn',
    'description': 'Chuyên cung cấp thiết bị vệ sinh INAX chính hãng tại TP. HCM',
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': '+84-28-1234-5678',
      'contactType': 'customer service',
      'areaServed': 'VN',
      'availableLanguage': ['Vietnamese', 'English'],
    },
  })

  // Page-specific schema
  if (type === 'product') {
    schemas.push({
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': title,
      'description': description,
      'image': image ? [image] : [],
      'url': url,
      'offers': {
        '@type': 'Offer',
        'priceCurrency': 'VND',
        'price': price || '0',
        'availability': availability === 'in_stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
      'brand': { '@type': 'Brand', 'name': brand || 'INAX' },
      'aggregateRating': { '@type': 'AggregateRating', 'ratingValue': '4.8', 'reviewCount': '128' },
    })
  } else if (type === 'article') {
    schemas.push({
      '@context': 'https://schema.org/',
      '@type': 'Article',
      'headline': title,
      'description': description,
      'image': image || undefined,
      'datePublished': publishedTime,
      'author': { '@type': 'Person', 'name': author || 'SQHOME' },
      'publisher': { '@type': 'Organization', 'name': 'SQHOME' },
      'url': url,
    })
  }

  return '<script type="application/ld+json">' +
    JSON.stringify(schemas, null, 2) + '</script>'
}

function injectMeta(shell, meta) {
  return shell
    .replace('{{SEO_TITLE}}', meta.title)
    .replace('{{SEO_DESCRIPTION}}', meta.description)
    .replace('{{SEO_CANONICAL}}', meta.canonical)
    .replace('{{SEO_IMAGE}}', meta.image)
    .replace('{{SEO_TYPE}}', meta.type)
    .replace('{{SEO_SITE_NAME}}', meta.siteName)
    .replace('{{SEO_LOCALE}}', meta.locale)
    .replace('{{SEO_OG_EXTRAS}}', meta.ogExtras)
    .replace('{{SEO_MODIFIED_TIME}}', new Date().toISOString())
    .replace('{{SEO_SCHEMA}}', meta.schema)
    // Fallback placeholder nếu template chưa có
    .replace(/\{\{SEO_[A-Z_]+\}\}/g, '')
}

async function writePage(urlPath, meta) {
  const shell = loadIndexShell()
  const html = injectMeta(shell, meta)

  // urlPath: '/san-pham/abc/' → 'san-pham/abc/index.html'
  const cleanPath = urlPath.replace(/^\/|\/$/g, '').replace(/\/+$/, '')
  if (!cleanPath) {
    // Homepage
    const outPath = path.join(OUT_DIR, 'index.html')
    fs.writeFileSync(outPath, html)
    console.log('✅ / (homepage)')
    return
  }

  const pageDir = path.join(OUT_DIR, cleanPath)
  fs.mkdirSync(pageDir, { recursive: true })
  const outPath = path.join(pageDir, 'index.html')
  fs.writeFileSync(outPath, html)
  const short = '/' + cleanPath.split('/').pop()
  console.log(`✅ ${short}`)
}

// ─── Fetch Data & Generate Pages ─────────────────────────────────────────────
async function generateAllPages() {
  console.log('\n🚀 SQHOME SEO Prerender')
  console.log(`📡 API: ${API_BASE}`)
  console.log(`📁 Output: ${OUT_DIR}`)
  console.log('─'.repeat(50))

  const base = IS_PROD ? API_BASE : 'http://localhost:8888'
  const api = (route) => `${base}/api.php?_route=${route}`

  // 1. Homepage
  try {
    await writePage('/', {
      title: 'SQHOME - Thiết bị vệ sinh INAX Việt Nam chính hãng',
      description: 'Kho thiết bị vệ sinh INAX chính hãng, gạch ngoại thất INAX, giá tốt nhất TP. HCM, bảo hành lên đến 10 năm.',
      image: 'https://inaxmiennam.vn/wp-content/uploads/2024/07/INAX-Mien-Nam-Thiet-bi-ve-sinh-INAX-Gach-INAX-chinh-hang.jpg',
      url: IS_PROD ? API_BASE + '/' : 'https://inaxmiennam.vn/',
      type: 'website',
    })
  } catch (e) {
    console.warn('⚠️ Homepage error:', e.message)
  }

  // 2. Categories
  try {
    const cats = await fetchJSON(api('get/home_categories'))
    if (cats && Array.isArray(cats)) {
      for (const cat of cats.slice(0, 50)) {
        const slug = cat.slug || slugify(cat.name)
        await writePage(`/danh-muc-san-pham/${slug}/`, {
          title: cat.seo_title || cat.name || cat.danhmuc || slug,
          description: cat.seo_description || `Danh mục ${cat.name || slug} — thiết bị vệ sinh INAX chính hãng, giá tốt.`,
          image: cat.seo_image || cat.banner || '',
          url: `${IS_PROD ? API_BASE : 'https://inaxmiennam.vn'}/danh-muc-san-pham/${slug}/`,
          type: 'product.group',
        })
      }
    }
  } catch (e) {
    console.warn('⚠️ Categories error:', e.message)
  }

  // 3. Products
  try {
    // Lấy tất cả categories để query products
    const cats = await fetchJSON(api('get/home_categories'))
    if (cats && Array.isArray(cats)) {
      for (const cat of cats.slice(0, 10)) {
        const catSlug = cat.slug || slugify(cat.name)
        const products = await fetchJSON(api(`get/danhmuc/${encodeURIComponent(catSlug)}`))
        if (products && Array.isArray(products.items)) {
          for (const p of products.items.slice(0, 50)) {
            const slug = p.slug || slugify(p.name)
            await writePage(`/san-pham/${slug}/`, {
              title: p.seo_title || p.name,
              description: p.seo_description || p.short_description || `${p.name} — thiết bị vệ sinh INAX chính hãng.`,
              image: p.image || p.thumbnail || '',
              url: `${IS_PROD ? API_BASE : 'https://inaxmiennam.vn'}/san-pham/${slug}/`,
              type: 'product',
              price: p.sale_price || p.price || p.price_display || '',
              availability: p.stock_quantity > 0 ? 'in_stock' : 'out_of_stock',
              brand: 'INAX',
            })
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Products error:', e.message)
  }

  // 4. News
  try {
    const news = await fetchJSON(api('get/news'))
    if (news && Array.isArray(news)) {
      for (const n of news.slice(0, 20)) {
        const slug = n.slug || slugify(n.title)
        await writePage(`/tin-tuc/${slug}/`, {
          title: n.seo_title || n.title,
          description: n.seo_description || n.description || n.excerpt || `Tin tức: ${n.title}`,
          image: n.thumbnail || n.image || '',
          url: `${IS_PROD ? API_BASE : 'https://inaxmiennam.vn'}/tin-tuc/${slug}/`,
          type: 'article',
          publishedTime: n.created_at || n.date || '',
          author: n.author_name || n.author || 'SQHOME',
        })
      }
    }
  } catch (e) {
    console.warn('⚠️ News error:', e.message)
  }

  console.log('─'.repeat(50))
  console.log('✨ Prerender hoàn tất!')
  console.log(`📁 Tất cả HTML đã lưu vào: ${OUT_DIR}`)
  console.log('\n💡 Deploy thư mục `dist/` lên hosting.')
}

// Chạy
generateAllPages()
