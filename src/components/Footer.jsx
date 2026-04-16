import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveApiBaseUrl } from '../utils/api'

export default function Footer(){
  const baseUrl = resolveApiBaseUrl()
  const location = useLocation()
  const boxchatBalloonStyle = location.pathname.startsWith('/san-pham/') ? { bottom: 150 } : undefined
  const [productCategories, setProductCategories] = useState([])
  const [headerLinks, setHeaderLinks] = useState([])
  const [settings, setSettings] = useState({
    branches: [],
    hotline: '',
    hotlines: [],
    zalo_chat: '',
    email: '',
    business_registration: null,
  })
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    fetch(`${baseUrl}/get/settings`)
      .then((response) => response.json())
      .then((data) => {
        if (isMounted) {
          setSettings({
            branches: Array.isArray(data?.branches) ? data.branches : [],
            hotline: data?.hotline || '',
            hotlines: Array.isArray(data?.hotlines) ? data.hotlines : [],
            zalo_chat: data?.zalo_chat || '',
            email: data?.email || '',
            business_registration: data?.business_registration || null,
          })
        }
      })
      .catch((error) => {
        console.error('Footer settings API error:', error)
      })

    return () => {
      isMounted = false
    }
  }, [baseUrl])

  useEffect(() => {
    let isMounted = true

    fetch(`${baseUrl}/get/product_category`)
      .then((response) => response.json())
      .then((data) => {
        if (isMounted) {
          setProductCategories(Array.isArray(data) ? data : [])
        }
      })
      .catch((error) => {
        console.error('Footer product category API error:', error)
      })

    return () => {
      isMounted = false
    }
  }, [baseUrl])

  useEffect(() => {
    let isMounted = true

    fetch(`${baseUrl}/get/header`)
      .then((response) => response.json())
      .then((data) => {
        if (isMounted) {
          setHeaderLinks(Array.isArray(data?.links) ? data.links : [])
        }
      })
      .catch((error) => {
        console.error('Footer header links API error:', error)
      })

    return () => {
      isMounted = false
    }
  }, [baseUrl])

  const displayHotlines = useMemo(() => {
    if (settings.hotlines.length) return settings.hotlines
    if (settings.hotline) return [settings.hotline]
    return []
  }, [settings.hotline, settings.hotlines])

  const businessRegistrationText = useMemo(() => {
    if (!settings.business_registration) return ''

    const { number, issued_date: issuedDate, issued_place: issuedPlace, raw } = settings.business_registration

    if (number || issuedDate || issuedPlace) {
      return `Số ĐKKD ${number || ''}${issuedDate ? ` cấp ngày ${issuedDate}` : ''}${issuedPlace ? ` tại ${issuedPlace}` : ''}`.trim()
    }

    return raw || ''
  }, [settings.business_registration])

  const stripInjectedCss = (str) => {
    if (!str && str !== '') return ''
    try {
      let s = String(str)
      // remove style-like injections like: #text-3694577559 { line-height: 0 }
      s = s.replace(/#text-\d+\s*\{[^}]*\}/g, '')
      // remove any <style>...</style> blocks
      s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // collapse whitespace
      s = s.replace(/\s+/g, ' ').trim()
      return s
    } catch (e) {
      return String(str)
    }
  }

  const supportPhones = useMemo(() => displayHotlines.filter(Boolean).slice(0, 2), [displayHotlines])
  const footerProductCategories = useMemo(() => productCategories.slice(0, 6), [productCategories])
  const footerPolicyLinks = useMemo(() => {
    const productKeywords = ['bồn', 'chậu', 'combo', 'vòi', 'sen', 'phụ kiện', 'gạch']
    const nonProductLinks = headerLinks
      .filter((item) => !productKeywords.some((keyword) => item?.label?.toLowerCase().includes(keyword)))
      .map((item) => {
        const slugSource = item?.slug || item?.url || item?.label || ''
        const normalizedSlug = String(slugSource)
          .split('/')
          .filter(Boolean)
          .pop()

        return {
          ...item,
          url: normalizedSlug ? `/chinh-sach/${normalizedSlug}` : '/chinh-sach',
        }
      })

    if (nonProductLinks.length) {
      return nonProductLinks.slice(0, 6)
    }

    return [
      { label: 'Tất cả chính sách', url: '/chinh-sach' },
    ]
  }, [headerLinks])

  const getGoogleMapsLink = (branch) => {
    const query = branch?.address || branch?.name || ''
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '#'
  }

  return (
  <footer style={{ background: '#000', marginTop: '24px' }}>
      <div className="policy">
            <ul className="pr-policy">
              <li>
                <i className="topzone-homeDiver  " />
                <span>
                  Mẫu mã đa dạng, <br />
                  chính hãng
                </span>
              </li>
              <li>
                <i className="topzone-homeDeli  " />
                <span>Giao hàng toàn quốc</span>
              </li>
              <li>
                <i className="topzone-homeInsur  " />
                <span>
                  Bảo hành có cam kết <br />
                  tới 24 tháng
                </span>
              </li>
              <li>
                <i className="topzone-homeReturn  " />
                <span>
                  Có thể đổi trả tại <br />
                  SQHOME
                </span>
              </li>
            </ul>
          </div>
      <div className="list-sieuthi" id="footer-branches">
        <div className="center-page">
          <div className="store-list">
            {settings.branches.map((branch, index) => (
              <div className={`p${index + 1} item`} key={`store-${branch.name || 'branch'}-${index}`}>
                <a href={getGoogleMapsLink(branch)} target="_blank" rel="noreferrer">
                  <p className="store-title">
                    {branch.name || `Chi nhánh ${index + 1}`} <span>Xem chi nhánh</span>
                  </p>
                  <p className="address-cr">{branch.address || 'Đang cập nhật địa chỉ'}</p>
                  {branch.old_address ? (
                    <div className="addess-old">
                      <span>Cũ</span>
                      {branch.old_address}
                    </div>
                  ) : null}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    
        <div className="foot">
          <ul className="list-foot">
            <li>
              <span>Tổng đài</span>
              {supportPhones.map((phone, index) => (
                <a href={`tel:${phone}`} key={phone}>
                  <span>{index === 0 ? 'Mua hàng:' : 'Hỗ trợ:'}</span>
                  <b>{phone} </b>
                  (8:00 - 21:30)
                </a>
              ))}
              <div className="footer-social">
                <p className="txt">Kết nối với chúng tôi</p>
                {supportPhones.map((phone) => (
                  <a href={`tel:${phone}`} className="link-social" rel="nofollow" key={`social-${phone}`}>
                    <i className="boxchat-call" />
                  </a>
                ))}
                <a href={settings.zalo_chat || 'https://zalo.me/2040551312124557463'} target="_blank" className="link-social" rel="nofollow">
                  <i className="iconsocial-zalo" />
                </a>
              </div>
            </li>
            <li>
              <span>Hệ thống cửa hàng</span>
              {settings.branches.map((branch, index) => (
                <div
                  key={`${branch.name || 'branch'}-${index}`}
                  className="footer-branch-item"
                  style={{ color: '#8f96a3' }}
                >
                  <b style={{ color: '#d6d9df', display: 'block', marginBottom: 4 }}>{branch.name}</b>
                  <a
                    href={getGoogleMapsLink(branch)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#8f96a3', textDecoration: 'none', lineHeight: 1.5 }}
                  >
                    {branch.address}
                  </a>
                </div>
              ))}
            
            </li>
            <li>
              <span>Danh mục sản phẩm</span>
              {footerProductCategories.map((category) => (
                <a href={`/danh-muc-san-pham/${category.slug || ''}`} rel="nofollow" key={category.id || category.slug || category.name}>
                  {category.name}
                </a>
              ))}
            </li>
            <li>
              <span>Chính sách</span>
              {footerPolicyLinks.map((item, index) => (
                <Link to={item.url || '/'} key={item.url || `${item.label}-${index}`}>
                  {item.label}
                </Link>
              ))}
              {/* <Link to="/settings">⚙️ Developer Settings</Link> */}
            </li>
          </ul>
          <div className="text-cpr" style={{maxWidth: '100%'}}>
            <p>
              {stripInjectedCss(businessRegistrationText) || '© SQHOME.'}<br />
              {stripInjectedCss(settings.branches.map((branch) => `${branch.name}: ${branch.address}`).join(' | '))}
              {supportPhones.length ? ` Điện thoại: ${stripInjectedCss(supportPhones.join(' - '))}.` : ''}
              {settings.email ? ` Email: ${stripInjectedCss(settings.email)}.` : ''}
            </p>
          </div>

          <div className="popup-boxchat">
            <i
              className="boxchat-balloons"
              onClick={() => setIsSupportOpen((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsSupportOpen((prev) => !prev)
                }
              }}
            ></i>
            <div
              className={`chat-window ${isSupportOpen ? 'active' : ''}`.trim()}
              style={{
                opacity: isSupportOpen ? 1 : 0,
                transform: isSupportOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
                pointerEvents: isSupportOpen ? 'auto' : 'none',
                transition: 'opacity 280ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div className="sp-onl">
                <h4>Hỗ trợ trực tuyến</h4>
                <i
                  className="boxchat-closewindow"
                  onClick={() => setIsSupportOpen(false)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setIsSupportOpen(false)
                    }
                  }}
                ></i>
              </div>
              <ul>
                {supportPhones.map((phone, index) => (
                  <li key={`support-phone-${phone}`}>
                    <a href={`tel:${phone}`}>
                      <i className="boxchat-call"></i>
                      <strong>
                        {phone}
                        <span>{index === 0 ? 'Hỗ trợ (8:00 - 21:30)' : 'Hỗ trợ (8:00 - 21:30)'}</span>
                      </strong>
                    </a>
                  </li>
                ))}
                <li>
                  <a href={settings.zalo_chat || 'javascript:;'} target="_blank" rel="noreferrer" style={{ display: 'flex', width: '100%' }}>
                    <i className="boxchat-zalo"></i>
                    <strong className="no-pointer">
                      Chat Zalo
                      <span>(7h30 - 22h00)</span>
                    </strong>
                    <div className="stage"><div className="dot-stretching"></div></div>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
  )
}
