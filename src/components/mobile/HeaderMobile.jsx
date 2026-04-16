import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { buildApiUrl, buildCartRequestConfig, resolveApiBaseUrl, syncCartTokenFromResponse } from '../../utils/api'

export default function HeaderMobile(){
  const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "string" && value.includes("₫")) return value;
    const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, "")));
    if (isNaN(numValue)) return value;
    return `${numValue.toLocaleString("vi-VN")}₫`;
  };
  const navigate = useNavigate()
  const fallbackData = useMemo(() => ({
    logo: { text: 'SQHOME', image: null },
    links: [],
    cart_count: 0,
  }), [])

  const [headerData, setHeaderData] = useState(fallbackData)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [mobileSuggestions, setMobileSuggestions] = useState([])
  const [mobileSuggestionsLoading, setMobileSuggestionsLoading] = useState(false)
  const [mobileSuggestionsTotal, setMobileSuggestionsTotal] = useState(0)
  const [productCategories, setProductCategories] = useState([])
  const mobileSuggestTimer = useRef(null)
  const mobileAbortCtrl = useRef(null)

  const refreshCartCount = async ({ signal } = {}) => {
    try {
      const response = await axios.get(buildApiUrl('/get/cart/count'), buildCartRequestConfig({ signal }))
      syncCartTokenFromResponse(response?.data)

      const nextCartCount = Number(response?.data?.total_quantity ?? response?.data?.cart_count ?? 0)

      setHeaderData((current) => ({
        ...current,
        cart_count: Number.isFinite(nextCartCount) ? nextCartCount : 0,
      }))
    } catch (error) {
      if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
        console.error('Header mobile cart count refresh error:', error)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      axios.get(buildApiUrl('/get/header'), { signal: controller.signal }),
      axios.get(buildApiUrl('/get/cart/count'), buildCartRequestConfig({ signal: controller.signal })),
    ])
      .then(([headerResponse, countResponse]) => {
        if (headerResponse?.data) {
          syncCartTokenFromResponse(countResponse?.data)
          const nextCartCount = Number(
            countResponse?.data?.total_quantity ??
            headerResponse.data.total_quantity ??
            headerResponse.data.cart_count ??
            headerResponse.data.cart_total_quantity ??
            headerResponse.data.summary?.total_quantity ??
            0
          )

          setHeaderData({
            logo: headerResponse.data.logo || fallbackData.logo,
            links: Array.isArray(headerResponse.data.links) ? headerResponse.data.links : [],
            cart_count: Number.isFinite(nextCartCount) ? nextCartCount : 0,
          })
        }
      })
      .catch((error) => {
        if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          console.error('Header mobile API error:', error)
        }
      })

    return () => controller.abort()
  }, [fallbackData])

  useEffect(() => {
    const controller = new AbortController()

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      refreshCartCount({ signal: controller.signal })
    }

    window.addEventListener('pageshow', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      controller.abort()
      window.removeEventListener('pageshow', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [])

  const logoText = headerData?.logo?.text || 'SQHOME'
  const cartCount = Number(headerData?.cart_count || 0)
  const links = headerData?.links || []
  const visibleLinks = links.filter((item) => item.is_featured == 1).slice(0, 6)
  const productKeywords = ['bồn', 'chậu', 'combo', 'vòi', 'sen', 'phụ kiện', 'gạch']
  const productLinks = links.filter((item) =>
    productKeywords.some((keyword) => item.label?.toLowerCase().includes(keyword))
  )
  const policyLinks = links
    .filter((item) => !productLinks.includes(item))
    .map((item) => {
      const slugSource = item?.slug || item?.url || item?.label || ''
      const normalizedSlug = String(slugSource)
        .split('/')
        .filter(Boolean)
        .pop()

      return {
        ...item,
        url: normalizedSlug ? normalizedSlug == 'tin-tuc' ? `/${normalizedSlug}` : `/chinh-sach/${normalizedSlug}` : '/chinh-sach',
      }
    })

  const handleSearchSubmit = (event) => {
    event.preventDefault()

    const normalizedKeyword = searchKeyword.trim()
    if (!normalizedKeyword) return

    setSearchOpen(false)
    navigate(`/search/${encodeURIComponent(normalizedKeyword)}`)
  }

  const handleClearSearch = () => {
    setSearchKeyword('')
  }

  const fetchMobileSuggestions = useCallback(async (q) => {
    if (!q || q.trim() === '') {
      setMobileSuggestions([])
      setMobileSuggestionsTotal(0)
      setMobileSuggestionsLoading(false)
      return
    }

    if (mobileAbortCtrl.current) {
      try { mobileAbortCtrl.current.abort() } catch (e) {}
    }
    mobileAbortCtrl.current = new AbortController()

    setMobileSuggestionsLoading(true)
    try {
      const res = await axios.get(buildApiUrl(`/get/search?q=${encodeURIComponent(q)}`), { signal: mobileAbortCtrl.current.signal })
      const items = res?.data?.items || (Array.isArray(res?.data) ? res.data : [])
  const total = Number(res?.data?.total ?? res?.data?.total_count ?? (items.length || 0))
      setMobileSuggestionsTotal(Number.isFinite(total) ? total : items.length)
      setMobileSuggestions(Array.isArray(items) ? items.slice(0, 4) : [])
    } catch (err) {
      if (err?.name !== 'CanceledError') console.error('Mobile suggestions error', err)
      setMobileSuggestions([])
      setMobileSuggestionsTotal(0)
    } finally {
      setMobileSuggestionsLoading(false)
    }
  }, [])

  useEffect(() => {
    // debounce mobile input
    if (mobileSuggestTimer.current) window.clearTimeout(mobileSuggestTimer.current)
    if (!searchOpen) {
      setMobileSuggestions([])
      setMobileSuggestionsLoading(false)
      return undefined
    }

    mobileSuggestTimer.current = window.setTimeout(() => {
      if (searchKeyword && searchKeyword.trim() !== '') {
        fetchMobileSuggestions(searchKeyword)
      } else {
        setMobileSuggestions([])
        setMobileSuggestionsLoading(false)
      }
    }, 300)

    return () => {
      if (mobileSuggestTimer.current) window.clearTimeout(mobileSuggestTimer.current)
    }
  }, [searchKeyword, searchOpen, fetchMobileSuggestions])

  useEffect(() => {
    const handleCartCountUpdated = (event) => {
      const nextCount = Number(event?.detail?.count)
      if (Number.isFinite(nextCount)) {
        setHeaderData((current) => ({
          ...current,
          cart_count: nextCount,
        }))
      }

      refreshCartCount()
    }

    window.addEventListener('cart-count-updated', handleCartCountUpdated)

    return () => {
      window.removeEventListener('cart-count-updated', handleCartCountUpdated)
    }
  }, [])

  useEffect(() => {
    axios.get(buildApiUrl('/get/product_category'))
      .then(res => {
        const items = Array.isArray(res?.data) ? res.data : res?.data?.items || []
        setProductCategories(items)
      })
      .catch(err => { console.error('Product category API error:', err) })
  }, [])

  const normalizeCategoryLink = (url) => {
    if (typeof url === 'string' && url.includes('/danh-muc-san-pham/gach-the-inax/')) {
      return url.replace('/danh-muc-san-pham/gach-the-inax/', '/danh-muc-san-pham/gach-inax/')
    }
    return url
  }

  return (
    <>
      <style>{`
        .mobile-header-shell {
          position: sticky;
          top: 0;
          z-index: 80;
          background: #101010;
          color: #fff;
          box-shadow: 0 6px 18px rgba(0,0,0,0.18);
          overflow: visible;
        }
        .mobile-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 3px 14px; /* giảm padding cho chiều dọc ngắn lại */
          min-height: 44px; /* giảm chiều cao tối thiểu */
        }
        .mobile-hamburger {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
        }
        .mobile-hamburger span {
          display: block;
          width: 18px;
          height: 2px;
          background: #fff;
          border-radius: 999px;
          transition: all 0.25s ease;
        }
        .mobile-hamburger.is-open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .mobile-hamburger.is-open span:nth-child(2) { opacity: 0; }
        .mobile-hamburger.is-open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
        .mobile-header-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1 1 auto;
        }
        .mobile-header-brand a {
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          font-size: 18px;
          white-space: nowrap;
        }
        .mobile-header-actions {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .mobile-round-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-decoration: none;
          position: relative;
          font-size: 15px;
        }
        .mobile-round-btn .topzone-search {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
        .mobile-round-btn.cart-btn {
          width: auto;
          min-width: 58px;
          border-radius: 18px;
          padding: 0 10px 0 12px;
          gap: 8px;
        }
        .mobile-cart-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: #ff3b30;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
        }
        .mobile-round-btn i {
          display: inline-block;
        }
        .mobile-cart-badge {
          position: absolute;
          top: -3px;
          right: -1px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #ff3b30;
          color: #fff;
          font-size: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .mobile-search-box {
          position: absolute;
          top: calc(100% + 35px); /* lùi xuống thêm */
          left: 12px;
          right: 12px;
          z-index: 84;
          padding: 0;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px) scale(0.98);
          transition: opacity 0.28s ease, transform 0.28s ease, visibility 0.28s ease;
        }
        .mobile-search-box.is-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }
        .mobile-search-box .form-search {
          display: block;
          position: static;
          max-width: 100%;
          height: auto;
          background: #fff;
          box-shadow: 0 12px 28px rgba(0,0,0,0.24);
          border-radius: 18px;
          overflow: hidden;
        }
        .mobile-search-box .click-search {
          background: #fff;
          padding: 13px 16px;
          border: 1px solid rgba(20,20,20,0.08);
          border-radius: 18px;
        }
        .mobile-search-box .click-search input {
          color: #111;
          font-size: 15px;
          padding-left: 30px;
        }
        .mobile-search-box .click-search input::placeholder {
          color: rgba(17,17,17,0.42);
        }
        .mobile-search-box .click-search .topzone-search {
          left: 0;
          opacity: 1;
        }
        .mobile-search-box .click-search .topzone-delSearch {
          right: 0;
          top: 8px;
        }
        /* Mobile suggestion sheet */
        .mobile-search-sheet {
          margin-top: 8px;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 18px 36px rgba(0,0,0,0.18);
          overflow: hidden;
          transform-origin: top center;
          opacity: 0;
          transform: translateY(-6px) scale(0.995);
          transition: opacity 220ms ease, transform 220ms ease;
        }
        .mobile-search-sheet.is-open {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .mobile-search-list { display: flex; flex-direction: column; }
        .mobile-search-item {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          background: #fff;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
        }
        .mobile-search-item:last-child { border-bottom: none; }
        .mobile-search-thumb { width: 56px; height: 56px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: #f6f7f9; }
        .mobile-search-thumb img { width:100%; height:100%; object-fit:cover; display:block }
        .mobile-search-meta { flex:1; min-width:0 }
        .mobile-search-title { font-size:14px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .mobile-search-price { font-size:13px; font-weight:800; color:#e60023; margin-top:6px }
        .mobile-search-loading { padding:14px; text-align:center; color:#666 }
        .mobile-search-footer {
          padding: 12px 14px;
          text-align: center;
          font-weight: 700;
          color: #0b64d9;
          border-top: 1px solid rgba(0,0,0,0.04);
          background: #fff;
          cursor: pointer;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
        }
        .mobile-search-footer:active { opacity: 0.85 }
        .mobile-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.38);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
          z-index: 79;
        }
        .mobile-drawer-backdrop.is-open {
          opacity: 1;
          pointer-events: auto;
        }
        .mobile-search-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(6, 6, 8, 0.72);
          backdrop-filter: blur(6px);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.25s ease, visibility 0.25s ease;
          z-index: 79;
        }
        .mobile-search-backdrop.is-open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }
        .mobile-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: min(88vw, 360px);
          background: linear-gradient(180deg, #121212 0%, #1c1c1c 100%);
          color: #fff;
          transform: translateX(-100%);
          transition: transform 0.28s ease;
          z-index: 81;
          display: flex;
          flex-direction: column;
          box-shadow: 12px 0 32px rgba(0,0,0,0.3);
        }
        .mobile-drawer.is-open { transform: translateX(0); }
        .mobile-drawer-head {
          padding: 18px 16px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .mobile-drawer-brand {
          font-size: 18px;
          font-weight: 800;
        }
        .mobile-drawer-close {
          border: 0;
          background: rgba(255,255,255,0.08);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
        }
        .mobile-drawer-body {
          overflow: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .mobile-drawer-section-title {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.68);
          margin-bottom: 8px;
          font-weight: 700;
        }
        .mobile-drawer-links {
          display: grid;
          gap: 8px;
        }
        .mobile-drawer-links a {
          display: block;
          padding: 12px 14px;
          border-radius: 14px;
          text-decoration: none;
          color: #fff;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.06);
        }
        /* Horizontal category menu strip */
        .mobile-menu-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          padding: 8px 14px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          background: #101010;
        }
        .mobile-menu-strip::-webkit-scrollbar { display: none; }
        .mobile-menu-strip .menu-item a {
          display: block;
          white-space: nowrap;
          padding: 7px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.10);
          text-decoration: none;
          transition: background 0.18s, border-color 0.18s;
        }
        .mobile-menu-strip .menu-item a:active {
          background: rgba(255,255,255,0.16);
          border-color: rgba(255,255,255,0.20);
        }
      `}</style>

      <header className="mobile-header-shell">
        <div className="mobile-header-bar" >
          <button
            type="button"
            className={`mobile-hamburger ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Mở menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <center ><div className="mobile-header-brand">
            <Link to={ '/'}>
              {headerData?.logo?.image ? (
                <>
<img src={headerData.logo.image} alt={logoText} style={{ height: '50px' }} />                
              
                </>
              ) : (
                logoText
              )}
            </Link>
          </div></center>

          <div className="mobile-header-actions">
            <button
              type="button"
              className="mobile-round-btn"
              aria-label="Tìm kiếm"
              onClick={() => setSearchOpen((prev) => !prev)}
            >
              <i className="topzone-search" />
            </button>
            <Link to="/cart" className="cart" aria-label={`Bạn đang có ${cartCount} sản phẩm trong giỏ hàng. Xem giỏ hàng`}>
              <i className="topzone-cart" />
              <span className="number">{cartCount}</span>
            </Link>
          </div>
        </div>
              <ul className="menu" >
        {visibleLinks.map((cat, idx) => {
          const displayName = (cat.name || cat.label || cat.title || '').replace(/inax/gi, '').trim()
          const url = normalizeCategoryLink(cat.url || cat.slug || '/')
          return (
            <li key={cat.id || cat.slug || idx} className={`menu-item menu-${cat.slug || idx}`}>
              <Link to={url}>
                <span>{displayName}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      
        <div className={`mobile-search-box ${searchOpen ? 'is-open' : ''}`}>
          <form className="form-search active" onSubmit={handleSearchSubmit}>
            <div className={`click-search active ${searchKeyword ? 'active' : ''}`.trim()}>
              <i className="topzone-search" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm, mã hàng..."
                value={searchKeyword}
                onChange={(e) => {
                  const v = e.target.value || ''
                  setSearchKeyword(v)
                  if (v.trim() === '') {
                    setMobileSuggestions([])
                    setMobileSuggestionsLoading(false)
                  } else {
                    // show loading immediately while typing
                    setMobileSuggestions([])
                    setMobileSuggestionsLoading(true)
                  }
                }}
                autoFocus={searchOpen}
              />
              <i
                className="topzone-delSearch"
                onClick={searchKeyword ? handleClearSearch : () => setSearchOpen(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    searchKeyword ? handleClearSearch() : setSearchOpen(false)
                  }
                }}
              />
            </div>
            <button type="submit" className="submit-search" style={{ display: 'none' }} />
          </form>

          {/* Mobile suggestion sheet (only when typing) */}
          {searchOpen && searchKeyword && searchKeyword.trim() !== '' && (
            <div className={`mobile-search-sheet ${mobileSuggestionsLoading || mobileSuggestions.length ? 'is-open' : ''}`}>
              {mobileSuggestionsLoading && (
                <div className="mobile-search-loading">Đang tìm...</div>
              )}

              {!mobileSuggestionsLoading && mobileSuggestions.length > 0 && (
                <div className="mobile-search-list">
                  {mobileSuggestions.map((it) => {
                    const productUrl = `/san-pham/${it.slug || it.id}`
                    return (
                      <div
                        key={it.slug || it.id}
                        className="mobile-search-item"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setSearchOpen(false)
                          setSearchKeyword('')
                          navigate(productUrl)
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="mobile-search-thumb">
                          {it.image ? <img src={it.image} alt={it.name} /> : <div style={{width:'100%',height:'100%',background:'#f2f2f2'}} />}
                        </div>
                        <div className="mobile-search-meta">
                          <div className="mobile-search-title">{it.name}</div>
                          <div className="mobile-search-price">{formatPrice(it.sale_price || it.price || '')}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* footer: view all */}
              {mobileSuggestionsTotal > 0 && (
                <div
                  className="mobile-search-footer"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setSearchOpen(false)
                    const normalized = searchKeyword.trim()
                    setSearchKeyword('')
                    navigate(`/search/${encodeURIComponent(normalized)}`)
                  }}
                >
                  Xem tất cả {mobileSuggestionsTotal} sản phẩm
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className={`mobile-search-backdrop ${searchOpen ? 'is-open' : ''}`} onClick={() => setSearchOpen(false)} />

      <div
        className={`mobile-drawer-backdrop ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`mobile-drawer ${menuOpen ? 'is-open' : ''}`}>
        <div className="mobile-drawer-head">
          <div className="mobile-drawer-brand">{logoText}</div>
          <button type="button" className="mobile-drawer-close" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>

        <div className="mobile-drawer-body">
          <div>
            <div className="mobile-drawer-section-title">Sản phẩm</div>
            <div className="mobile-drawer-links">
              {productLinks.map((item, index) => (
                <Link to={normalizeCategoryLink(item.url || '/')} key={`${item.label}-mobile-product-${index}`} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mobile-drawer-section-title">Chính sách</div>
            <div className="mobile-drawer-links">
              {policyLinks.map((item, index) => (
                <Link to={normalizeCategoryLink(item.url || '/')} key={`${item.label}-mobile-policy-${index}`} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <br />
      
    </>
  )
}
