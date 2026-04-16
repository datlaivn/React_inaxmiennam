import React from 'react'

const ACCOUNT_INFO = {
  bankName: 'Ngân hàng TMCP Á Châu (ACB)',
  bankShort: 'ACB',
  accountNumber: '3698128',
  accountName: 'CTY TNHH XD TM SQ HOME',
  branch: 'ACB - CN BA THANG HAI',
  accountType: 'Tài khoản doanh nghiệp',
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="tk-copy-btn"
      title="Sao chép"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      )}
      <span>{copied ? 'Đã sao chép!' : label || 'Sao chép'}</span>
    </button>
  )
}

export default function TaiKhoanNganHang() {
  return (
    <div className="tk-page">
      <div className="tk-container">
        {/* Header */}
        <div className="tk-header">
          <div className="tk-header__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="tk-header__title">Thông Tin Tài Khoản</h1>
            <p className="tk-header__subtitle">Thanh toán chuyển khoản ngân hàng</p>
          </div>
        </div>

        {/* Bank Card */}
        <div className="tk-card">
          <div className="tk-card__top">
            <div className="tk-card__bank-logo">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="18" fill="url(#acbGrad)"/>
                <text x="18" y="24" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">ACB</text>
                <defs>
                  <linearGradient id="acbGrad" x1="0" y1="0" x2="36" y2="36">
                    <stop offset="0%" stopColor="#E8A838"/>
                    <stop offset="100%" stopColor="#C17D11"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="tk-card__bank-name">{ACCOUNT_INFO.bankName}</div>
            <div className="tk-card__type">{ACCOUNT_INFO.accountType}</div>
          </div>

          <div className="tk-card__number">
            <span className="tk-card__number-label">Số tài khoản</span>
            <div className="tk-card__number-value">
              <span>{ACCOUNT_INFO.accountNumber}</span>
              <CopyButton text={ACCOUNT_INFO.accountNumber} />
            </div>
          </div>

          <div className="tk-card__bottom">
            <div className="tk-card__info-row">
              <div className="tk-card__info-item">
                <span className="tk-card__info-label">Tên tài khoản</span>
                <span className="tk-card__info-value">{ACCOUNT_INFO.accountName}</span>
              </div>
            </div>
          </div>

          {/* Decorative waves */}
          <div className="tk-card__waves" aria-hidden>
            <svg viewBox="0 0 400 80" preserveAspectRatio="none">
              <path d="M0,40 C100,80 200,0 400,40 L400,80 L0,80 Z" fill="rgba(255,255,255,0.08)"/>
              <path d="M0,50 C150,20 250,70 400,30 L400,80 L0,80 Z" fill="rgba(255,255,255,0.05)"/>
            </svg>
          </div>

          {/* Chip */}
          <div className="tk-card__chip">
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
              <rect x="0.5" y="0.5" width="35" height="27" rx="4" stroke="#E8A838" strokeOpacity="0.6" fill="none"/>
              <rect x="4" y="4" width="8" height="8" rx="1" stroke="#E8A838" strokeOpacity="0.5" fill="none"/>
              <rect x="14" y="4" width="8" height="8" rx="1" stroke="#E8A838" strokeOpacity="0.5" fill="none"/>
              <rect x="24" y="4" width="8" height="8" rx="1" stroke="#E8A838" strokeOpacity="0.5" fill="none"/>
              <rect x="4" y="16" width="8" height="8" rx="1" stroke="#E8A838" strokeOpacity="0.5" fill="none"/>
              <rect x="24" y="16" width="8" height="8" rx="1" stroke="#E8A838" strokeOpacity="0.5" fill="none"/>
              <line x1="14" y1="4" x2="14" y2="24" stroke="#E8A838" strokeOpacity="0.3"/>
              <line x1="22" y1="4" x2="22" y2="24" stroke="#E8A838" strokeOpacity="0.3"/>
              <line x1="4" y1="14" x2="32" y2="14" stroke="#E8A838" strokeOpacity="0.3"/>
            </svg>
          </div>
        </div>

        {/* Detail Table */}
        <div className="tk-detail-card">
          <div className="tk-detail-card__header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Chi tiết thông tin tài khoản</span>
          </div>

          <div className="tk-detail-table">
            <div className="tk-detail-row">
              <div className="tk-detail-row__label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Ngân hàng
              </div>
              <div className="tk-detail-row__value">
                {ACCOUNT_INFO.bankName}
                <span className="tk-badge tk-badge--bank">ACB</span>
              </div>
            </div>

            <div className="tk-detail-row">
              <div className="tk-detail-row__label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Số tài khoản
              </div>
              <div className="tk-detail-row__value tk-detail-row__value--mono">
                {ACCOUNT_INFO.accountNumber}
                <CopyButton text={ACCOUNT_INFO.accountNumber} />
              </div>
            </div>

            <div className="tk-detail-row">
              <div className="tk-detail-row__label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Tên tài khoản
              </div>
              <div className="tk-detail-row__value tk-detail-row__value--bold">
                {ACCOUNT_INFO.accountName}
                <CopyButton text={ACCOUNT_INFO.accountName} />
              </div>
            </div>

            <div className="tk-detail-row tk-detail-row--last">
              <div className="tk-detail-row__label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Chi nhánh
              </div>
              <div className="tk-detail-row__value">
                {ACCOUNT_INFO.branch}
                <CopyButton text={ACCOUNT_INFO.branch} />
              </div>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="tk-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>
            <strong>Lưu ý:</strong> Khi chuyển khoản, vui lòng ghi rõ <strong>mã đơn hàng</strong> hoặc <strong>số điện thoại</strong> trong nội dung chuyển khoản để chúng tôi xác nhận nhanh chóng.
          </p>
        </div>

        {/* QR + Info */}
        <div className="tk-qr-section">
          <div className="tk-qr-box">
            <div className="tk-qr-box__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Quét QR để thanh toán
            </div>
            <div className="tk-qr-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Quét mã QR trên ứng dụng ngân hàng ACB</span>
            </div>
          </div>
          <div className="tk-quick-copy">
            <div className="tk-quick-copy__title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Thao tác nhanh
            </div>
            <div className="tk-quick-copy__list">
              <button
                type="button"
                className="tk-quick-btn"
                onClick={() => navigator.clipboard.writeText(ACCOUNT_INFO.accountNumber)}
              >
                <span>Sao chép STK</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button
                type="button"
                className="tk-quick-btn"
                onClick={() => navigator.clipboard.writeText(ACCOUNT_INFO.accountName)}
              >
                <span>Sao chép tên TK</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button
                type="button"
                className="tk-quick-btn"
                onClick={() => navigator.clipboard.writeText(ACCOUNT_INFO.branch)}
              >
                <span>Sao chép chi nhánh</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
