import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { buildApiUrl, syncCartTokenFromResponse } from '../utils/api'


export default function Header(){
  const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "string" && value.includes("₫")) return value;
    const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, "")));
    if (isNaN(numValue)) return value;
    return `${numValue.toLocaleString("vi-VN")}₫`;
  };
  const navigate = useNavigate()
  const location = useLocation()
  const fallbackData = useMemo(() => ({
    logo: { text: 'SQHOME', image: null },
    links: [],
    contact: { phones: [], zalo: '' },
    cart_count: 0,
  }), [])

  const [headerData, setHeaderData] = useState(fallbackData)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      axios.get(buildApiUrl('/get/header'), {
        signal: controller.signal,
      }),
      axios.get(buildApiUrl('/get/cart/count'), {
        signal: controller.signal,
        withCredentials: true,
      }),
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
            contact: headerResponse.data.contact || {},
            cart_count: Number.isFinite(nextCartCount) ? nextCartCount : 0,
          })
        }
      })
      .catch((error) => {
        if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          console.error('Header API error:', error)
        }
      })

    return () => controller.abort()
  }, [fallbackData])

  const logoText = headerData?.logo?.text || 'SQHOME'
  const headerLinks = headerData?.links || []
  const visibleLinks = headerLinks.filter((item) => item.is_featured == 1).slice(0, 6)
  const hiddenLinks = headerLinks.filter(
    (item) => !visibleLinks.some((visible) => visible.id === item.id)
  )
  const productKeywords = ['bồn', 'chậu', 'combo', 'vòi', 'sen', 'phụ kiện', 'gạch']
  const productLinks = hiddenLinks.filter((item) =>
    productKeywords.some((keyword) => item.label?.toLowerCase().includes(keyword))
  )
  const policyLinks = hiddenLinks
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
  const [showMore, setShowMore] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const inputRef = useRef(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsTotal, setSuggestionsTotal] = useState(0)
  const suggestionsTimerRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isCartHovered, setIsCartHovered] = useState(false)
  const cartCount = Number(headerData?.cart_count || 0)
  const cartSummaryText = `Bạn đang có ${cartCount} sản phẩm trong giỏ hàng`

  const openCartPreview = () => {
    setIsCartHovered(true)
  }

  const closeCartPreviewWithDelay = () => {
    window.setTimeout(() => {
      setIsCartHovered(false)
    }, 160)
  }

  useEffect(() => {
    const handleCartCountUpdated = (event) => {
      const nextCount = Number(event?.detail?.count)
      if (Number.isFinite(nextCount)) {
        setHeaderData((current) => ({
          ...current,
          cart_count: nextCount,
        }))
      }
    }

    let previewTimer = null

    const handleCartPreviewOpen = () => {
      openCartPreview()

      if (previewTimer) {
        window.clearTimeout(previewTimer)
      }

      previewTimer = window.setTimeout(() => {
        setIsCartHovered(false)
      }, 2200)
    }

    window.addEventListener('cart-count-updated', handleCartCountUpdated)
    window.addEventListener('cart-preview-open', handleCartPreviewOpen)

    return () => {
      if (previewTimer) {
        window.clearTimeout(previewTimer)
      }
      window.removeEventListener('cart-count-updated', handleCartCountUpdated)
      window.removeEventListener('cart-preview-open', handleCartPreviewOpen)
    }
  }, [])

  useEffect(() => {
    if (!isSearchOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSearchOpen])

  // Debounced suggestions fetch when keyword changes
  const fetchSuggestions = useCallback(async (q) => {
    console.debug('[search] fetchSuggestions', q)
    if (!q || q.trim() === '') {
      setSuggestions([])
      setSuggestionsTotal(0)
      setSuggestionsLoading(false)
      return
    }

    setSuggestionsLoading(true)
    try {
      const res = await axios.get(buildApiUrl(`/get/search?q=${encodeURIComponent(q)}`))
  // no debug badge: just set suggestions from response
      // prefer a total count if backend provides it
      const totalFromResp = res?.data?.total ?? res?.data?.total_count ?? res?.data?.total_results
      if (Number.isFinite(totalFromResp)) {
        setSuggestionsTotal(Number(totalFromResp))
      } else if (res?.data?.items && Array.isArray(res.data.items)) {
        setSuggestionsTotal(res.data.items.length)
      } else if (Array.isArray(res?.data)) {
        setSuggestionsTotal(res.data.length)
      } else {
        setSuggestionsTotal(0)
      }

      if (res?.data?.items && Array.isArray(res.data.items)) {
        setSuggestions(res.data.items.slice(0, 7))
      } else if (Array.isArray(res?.data)) {
        setSuggestions(res.data.slice(0, 7))
      } else {
        setSuggestions([])
      }
    } catch (err) {
      console.error('Search suggestions error:', err)
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  

  useEffect(() => {
    // debounce
    if (suggestionsTimerRef.current) {
      window.clearTimeout(suggestionsTimerRef.current)
    }
    if (!isSearchOpen) {
      setSuggestions([])
      setSuggestionsLoading(false)
      return undefined
    }

    suggestionsTimerRef.current = window.setTimeout(() => {
      // only fetch when there is a keyword
      if (searchKeyword && searchKeyword.trim() !== '') {
        fetchSuggestions(searchKeyword)
      }
    }, 300)

    return () => {
      if (suggestionsTimerRef.current) window.clearTimeout(suggestionsTimerRef.current)
    }
  }, [searchKeyword, isSearchOpen, fetchSuggestions])

  // detect mobile viewport to change suggestion limits and behavior
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)')
    const update = () => setIsMobile(Boolean(mq.matches))
    update()
    try {
      mq.addEventListener('change', update)
    } catch (e) {
      // older browsers
      mq.addListener(update)
    }
    return () => {
      try {
        mq.removeEventListener('change', update)
      } catch (e) {
        mq.removeListener(update)
      }
    }
  }, [])

  // Listen for clicks on elements with data-search-term to fill and open search
  useEffect(() => {
    const handler = (e) => {
      let el = e.target
      while (el && el !== document) {
        if (el.dataset && el.dataset.searchTerm) {
          const term = el.dataset.searchTerm
          setSearchKeyword(term)
          setIsSearchOpen(true)
          window.setTimeout(() => inputRef.current?.focus(), 50)
          // fetch immediately
          fetchSuggestions(term)
          break
        }
        el = el.parentElement
      }
    }

    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [fetchSuggestions])

  useEffect(() => {
    setShowMore(false)
  }, [location.pathname])

  const handleSearchSubmit = (event) => {
    event.preventDefault()

    const normalizedKeyword = searchKeyword.trim()
    if (!normalizedKeyword) return

    setIsSearchOpen(false)
    navigate(`/search/${encodeURIComponent(normalizedKeyword)}`)
  }

  const handleClearSearch = () => {
    setSearchKeyword('')
  }

  const handleOpenSearch = () => {
    setIsSearchOpen(true)
    setShowMore(false)
    // focus the input after opening (ensure element is visible)
    window.setTimeout(() => {
      try {
        inputRef.current?.focus()
        // place cursor at end
        const val = inputRef.current?.value || ''
        inputRef.current?.setSelectionRange?.(val.length, val.length)
      } catch (e) {
        // ignore focus errors
      }
      // if there is already a keyword, fetch suggestions immediately
      if (searchKeyword && searchKeyword.trim() !== '') {
        fetchSuggestions(searchKeyword)
      }
    }, 50)
  }


  const handleCloseSearch = () => {
    setIsSearchOpen(false)
  }

  const normalizeCategoryLink = (url) => {
    if (typeof url === 'string' && url.includes('/danh-muc-san-pham/gach-the-inax/')) {
      return url.replace('/danh-muc-san-pham/gach-the-inax/', '/danh-muc-san-pham/gach-inax/')
    }
    return url
  }

  return (
    <>
    <header className="sticky">
      <style>{`
        .head {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }
        .head-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          position: relative;
        }
        .head-left {
          display: flex;
          align-items: center;
          gap: 28px;
          flex: 1 1 auto;
          min-width: 0;
          flex-wrap: wrap;
          transition: opacity 0.35s ease, transform 0.35s ease, visibility 0.35s ease;
        }
        .head-left.is-search-hidden {
          opacity: 0;
          transform: translateX(-60px);
          visibility: hidden;
          pointer-events: none;
        }
        .head-bottom {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .logo-topzone {
          flex: 0 0 auto;
          min-width: max-content;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .topzone-logo-text {
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          white-space: nowrap;
        }
        .menu {
          display: flex;
          align-items: center;
          gap: 18px;
          overflow: visible;
          padding: 0;
          margin: 0;
          list-style: none;
          flex-wrap: wrap;
          margin-left: 8px;
          margin-right: 20px;
        }
        .menu-item {
          flex: 0 0 auto;
          max-width: none;
          min-width: max-content;
        }
        .menu-item a,
        .menu-more-button {
          padding: 6px 4px;
          white-space: nowrap;
        }
        .menu-item > a,
        .menu-item > a > span,
        .menu-item > span,
        .menu-more-button {
          display: inline-block;
          white-space: nowrap;
          font-weight: 700;
        }
        .menu-more {
          flex: 0 0 auto;
        }
        .menu-more-button {
          background: rgba(255,255,255,0.08);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 18px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
        }
        .menu-more-panel {
          width: 100%;
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height 0.35s ease, opacity 0.25s ease, padding 0.25s ease;
          background: #1e1e1e;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.28);
          padding: 0 10px;
        }
        .menu-more-panel.is-open {
          max-height: 320px;
          opacity: 1;
          padding: 10px;
        }
        .menu-more-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          align-items: start;
        }
        .menu-more-column-title {
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }
        .menu-more-column {
          min-width: 0;
        }
        .menu-more-panel a {
          display: block;
          color: #fff;
          text-decoration: none;
          padding: 8px 10px;
          border-radius: 8px;
        }
        .menu-more-panel a:hover {
          background: rgba(255,255,255,0.08);
        }
        .search-cart {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 10002;
        }
        .cart-hover-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding-bottom: 14px;
          margin-bottom: -14px;
        }
        .cart {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .cart:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.22);
        }
        .cart .number {
      position: absolute;
      left: 5px;
      bottom: 3px;
      min-width: 16px;
      height: 16px;
      padding: 0 3px;
      border-radius: 999px;
      background-color: #ff361d;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 10px;
      line-height: 1;
      font-weight: 600;
        }
        .cart-hover-panel {
          position: absolute;
          top: calc(100% + 14px);
          right: 0;
          width: 260px;
          padding: 16px;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(28,28,31,0.98) 0%, rgba(18,18,20,0.99) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 18px 40px rgba(0,0,0,0.3);
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px);
          transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s ease;
          pointer-events: none;
        }
        .cart-hover-panel::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: -14px;
          height: 14px;
        }
        .cart-hover-wrap:hover .cart-hover-panel,
        .cart-hover-wrap:focus-within .cart-hover-panel,
        .cart-hover-panel.is-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto;
        }
        .cart-hover-panel p {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          line-height: 21px;
          margin: 0 0 12px;
        }
        .cart-hover-panel a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 42px;
          border-radius: 12px;
          background: #fff;
          color: #17171a;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }
        .search-shell {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          transform: translateY(calc(-50% + 8px));
          display: flex;
          justify-content: center;
          pointer-events: none;
          z-index: 10001;
        }
        .search-shell .form-search {
          display: block;
          position: static;
          margin: 0;
          width: min(720px, 100%);
          padding: 0;
          height: auto;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px) scale(0.98);
          transition: opacity 0.35s ease, transform 0.35s ease, visibility 0.35s ease;
          pointer-events: none;
        }
        .search-shell .form-search.is-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .search-shell .click-search {
          background: linear-gradient(135deg, rgba(34,34,38,0.96), rgba(16,16,18,0.98));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 16px 28px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.36);
        }
        .search-shell .click-search .topzone-search {
          left: 26px;
          top: 16px;
          opacity: 0.85;
        }
        .search-shell .click-search.active input,
        .search-shell .click-search input {
          float: none;
          color: #fff;
          padding-left: 42px;
          font-size: 18px;
          line-height: 24px;
          opacity: 1;
        }
        .search-shell .click-search input::placeholder {
          color: rgba(255,255,255,0.45);
        }
        .search-shell .click-search .topzone-delSearch {
          right: 8px;
          top: 16px;
        }
        .search-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(6, 6, 8, 0.74);
          backdrop-filter: blur(6px);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.35s ease, visibility 0.35s ease;
          z-index: 9997;
        }
        .search-backdrop.is-open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }
        @media (max-width: 1200px) {
          .head-top { gap: 10px; }
          .head-left { gap: 18px; }
          .menu { gap: 12px; margin-right: 12px; }
          .search-shell .form-search { width: min(620px, calc(100% - 40px)); }
        }
        @media (max-width: 992px) {
          .menu-more-grid { grid-template-columns: 1fr; }
          .head-top { flex-wrap: wrap; }
        }
      `}</style>
      <div className="head">
        <div className="head-top">
          <div className={`head-left ${isSearchOpen ? 'is-search-hidden' : ''}`}>
            <div className="">
              <Link to={'/'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                {headerData?.logo?.image ? (
<>
<img src={headerData.logo.image} alt={logoText} style={{ maxHeight: '60px', width: 'auto', display: 'block' }} />
{/* <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>INAX</span> */}


</>
) : (
                  <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>{logoText}</span>
                )}
              </Link>
            </div>
            <ul className="menu">
              {visibleLinks.length > 0 ? (
                visibleLinks.map((item, index) => (
                  <li className="menu-item" key={`visible-${item.id || index}`}>
                    <Link to={item.url} target="_self" rel="noreferrer">
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="menu-item">
                  <Link to="/"><span>Trang chủ</span></Link>
                </li>
              )}
              {hiddenLinks.length > 0 ? (
                <li className="menu-more">
                  <button
                    type="button"
                    className="menu-more-button"
                    onClick={() => setShowMore((prev) => !prev)}
                    aria-expanded={showMore}
                  >
                    {showMore ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
          <div className="search-cart">
            <div className="search-sp" onClick={handleOpenSearch} role="button" tabIndex={0} onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleOpenSearch()
              }
            }}>
              <i className="topzone-search"></i>
              
            </div>
            <div
              className={`cart-hover-wrap ${isCartHovered ? 'active' : ''}`}
              onMouseEnter={openCartPreview}
              onMouseLeave={closeCartPreviewWithDelay}
            >
              <Link
                to="/cart"
                className="cart"
                aria-label={cartSummaryText}
                onFocus={openCartPreview}
                onBlur={closeCartPreviewWithDelay}
              >
                <i className="topzone-cart"></i>
                <span className="number">{cartCount}</span>
              </Link>
              <div
                className={`cart-hover-panel ${isCartHovered ? 'is-open' : ''}`}
                onMouseEnter={openCartPreview}
                onMouseLeave={closeCartPreviewWithDelay}
              >
                <p>{cartSummaryText}</p>
                <Link to="/cart">Xem giỏ hàng</Link>
              </div>
            </div>
          </div>
          <div className="search-shell">
            <form
              className={`form-search ${isSearchOpen ? 'is-open' : ''}`}
              onSubmit={handleSearchSubmit}
            >
              <div className="click-search">
                <i className="topzone-search"></i>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Tìm sản phẩm..."
                  value={searchKeyword}
                  onChange={(e) => {
                    const v = e.target.value || ''
                    setSearchKeyword(v)
                    // when the user is typing, hide previous suggestions and show loading
                    if (v.trim() === '') {
                      setSuggestions([])
                      setSuggestionsLoading(false)
                    } else {
                      setSuggestions([])
                      setSuggestionsLoading(true)
                    }
                  }}
                />

                <i
                  className="topzone-delSearch"
                  onClick={handleCloseSearch}
                ></i>


                {isSearchOpen && (
                  <div className={`search-suggestions ${suggestions.length ? 'show' : ''}`}>

                    {suggestionsLoading && (
                      <div className="search-suggestion-item">
                        Đang tìm...
                      </div>
                    )}

                    <div className="search-suggestions-list">
                      {suggestions.slice(0, 7).map((item) => {

                      const productUrl = `/san-pham/${item.slug}`

                      return (

                        <div
                          key={item.slug}
                          className="search-suggestion-item"
                          onMouseDown={(e) => {

                            e.preventDefault()
                            setIsSearchOpen(false)
                            navigate(productUrl)

                          }}
                        >

                          <div className="sugg-thumb">

                            {item.image
                              ? <img src={item.image} alt={item.name} />
                              : <div className="img-placeholder"></div>
                            }

                          </div>

                          <div className="sugg-info">

                            <div className="sugg-title">
                              {item.name}
                            </div>

                            <div className="sugg-price">
                              {formatPrice(item.sale_price || item.price)}
                            </div>

                          </div>

                        </div>

                      )

                      })}
                    </div>

                    {searchKeyword && searchKeyword.trim() !== '' && suggestionsTotal > 0 && (
                      <div
                        className="search-suggestions-footer"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setIsSearchOpen(false)
                          const normalized = searchKeyword.trim()
                          navigate(`/search/${encodeURIComponent(normalized)}`)
                        }}
                      >
                        Xem tất cả {suggestionsTotal} sản phẩm
                      </div>
                    )}

                  </div>
                )}

              </div>

            </form>

          </div>
        </div>

        <div className="head-bottom">
          {hiddenLinks.length > 0 ? (
            <div className={`menu-more-panel ${showMore ? 'is-open' : ''}`}>
              <div className="menu-more-grid">
                <div className="menu-more-column">
                  <div className="menu-more-column-title">Sản phẩm</div>
                  {productLinks.map((item, index) => (
                    <Link to={normalizeCategoryLink(item.url)} key={`${item.label}-product-${index}`} target="_self" rel="noreferrer">
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="menu-more-column">
                  <div className="menu-more-column-title">Chính sách</div>
                  {policyLinks.map((item, index) => (
                    <Link to={normalizeCategoryLink(item.url)} key={`${item.label}-policy-${index}`} target="_self" rel="noreferrer">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className={`search-backdrop ${isSearchOpen ? 'is-open' : ''}`} onClick={handleCloseSearch}></div>
      <div className={`bg-sg ${isSearchOpen ? 'active' : ''}`} onClick={handleCloseSearch}></div>
      <div className="header-mask"></div>
      
    </header>
    <br />
      <br />
      <br />
      </>
  )
}
