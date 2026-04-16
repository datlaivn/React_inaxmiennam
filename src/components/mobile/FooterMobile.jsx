import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveApiBaseUrl } from '../../utils/api'

export default function FooterMobile() {
  const baseUrl = resolveApiBaseUrl()
  const location = useLocation()
  const boxchatBalloonStyle = location.pathname.startsWith('/san-pham/') ? { bottom: 150 } : undefined
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
        console.error('Footer mobile settings API error:', error)
      })

    return () => {
      isMounted = false
    }
  }, [baseUrl])

  const supportPhones = useMemo(() => {
    if (settings.hotlines.length) return settings.hotlines.filter(Boolean).slice(0, 2)
    if (settings.hotline) return [settings.hotline]
    return []
  }, [settings.hotline, settings.hotlines])

  const featuredBranches = useMemo(() => settings.branches.slice(0, 4), [settings.branches])

  const businessRegistrationText = useMemo(() => {
    if (!settings.business_registration) return ''

    const { number, issued_date: issuedDate, issued_place: issuedPlace, raw } = settings.business_registration

    if (number || issuedDate || issuedPlace) {
      return `Số ĐKKD ${number || ''}${issuedDate ? ` cấp ngày ${issuedDate}` : ''}${issuedPlace ? ` tại ${issuedPlace}` : ''}`.trim()
    }

    return raw || ''
  }, [settings.business_registration])

  const getGoogleMapsLink = (branch) => {
    const query = branch?.address || branch?.name || ''
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '#'
  }

  return (
    <footer>
      <div className="list-sieuthi" id="footer-branches-mobile">
        <div className="center-page">
          <div className="store-list">
            {featuredBranches.map((branch, index) => (
              <div className={`p${index + 1} item`} key={`mobile-branch-${branch.name || index}`}>
                <a href={getGoogleMapsLink(branch)} target="_blank" rel="noreferrer">
                  <span className="title-name">{branch.name || `Chi nhánh ${index + 1}`}</span>
                  <p className="address-cr">
                    {branch.address || 'Đang cập nhật địa chỉ'} <span className="link">Xem chỉ đường</span>
                  </p>
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
                <b>{phone}</b>
                (8:00 - 21:30)
              </a>
            ))}
            <div className="footer-social">
              <p className="txt">Kết nối với chúng tôi</p>
              {supportPhones.map((phone) => (
                <a href={`tel:${phone}`} className="link-social" rel="nofollow" key={`mobile-social-${phone}`}>
                  <i className="boxchat-call" />
                </a>
              ))}
              <a
                href={settings.zalo_chat || 'https://zalo.me/2040551312124557463'}
                target="_blank"
                className="link-social"
                rel="nofollow noreferrer"
              >
                <i className="iconsocial-zalo" />
              </a>
            </div>
          </li>

          <li>
            <span>Hệ thống cửa hàng</span>
            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 10,
              }}
            >
              {featuredBranches.map((branch, index) => (
                <div
                  key={`mobile-address-${branch.name || index}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  }}
                >
                  <b style={{ color: '#fff', display: 'block', marginBottom: 6 }}>
                    {branch.name || `Chi nhánh ${index + 1}`}
                  </b>
                  <span style={{ display: 'block', marginTop: 4, color: '#aeb4bf', lineHeight: 1.5 }}>
                    {branch.address || 'Đang cập nhật địa chỉ'}
                  </span>
                  <a
                    href={getGoogleMapsLink(branch)}
                    rel="noreferrer"
                    target="_blank"
                    style={{
                      display: 'inline-flex',
                      marginTop: 10,
                      color: '#4da3ff',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Xem chỉ đường
                  </a>
                </div>
              ))}
            </div>
            <Link to="/noi-quy-cua-hang" style={{ marginTop: 12, display: 'inline-block' }}>
              Nội quy cửa hàng
            </Link>
          </li>
        </ul>

        <div className="text-cpr">
          <p>
            {businessRegistrationText || '© SQHOME.'}
            <br />
            {featuredBranches.map((branch) => `${branch.name}: ${branch.address}`).join(' | ')}
            {supportPhones.length ? ` Điện thoại: ${supportPhones.join(' - ')}.` : ''}
            {settings.email ? ` Email: ${settings.email}.` : ''}
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
