import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { buildCartRequestConfig, resolveApiBaseUrl } from '../utils/api'
import { buildContactUiFromSettings } from '../utils/chatbotContact'

const PANEL_NAME = 'Hỗ trợ SQHOME'
const WELCOME_TOAST_KEY = 'sqhome_chatbot_welcome_dismissed'

function readWelcomeDismissed() {
  try {
    return localStorage.getItem(WELCOME_TOAST_KEY) === '1'
  } catch {
    return false
  }
}

function formatZaloText(href) {
  const raw = String(href || '').trim()
  if (!raw) return 'Liên hệ qua Zalo'
  return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

export default function AiChatAssistant({ isOnProductPage = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [contactUi, setContactUi] = useState(null)
  const [isLoadingContact, setIsLoadingContact] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(readWelcomeDismissed)
  const [badgeState, setBadgeState] = useState('visible')
  const [showGlow, setShowGlow] = useState(false)
  const wasOpenRef = useRef(isOpen)

  const dismissWelcomeToast = useCallback(() => {
    try { localStorage.setItem(WELCOME_TOAST_KEY, '1') } catch {}
    setWelcomeDismissed(true)
  }, [])

  const loadContact = useCallback(async () => {
    setIsLoadingContact(true)
    try {
      const url = `${resolveApiBaseUrl()}/api.php?_route=get/settings`
      const res = await axios.get(url, buildCartRequestConfig())
      setContactUi(buildContactUiFromSettings(res.data))
    } catch {
      setContactUi(null)
    } finally {
      setIsLoadingContact(false)
    }
  }, [])

  useEffect(() => {
    if (wasOpenRef.current === isOpen) return
    wasOpenRef.current = isOpen

    if (!isOpen) {
      setBadgeState('hidden')
      setShowGlow(false)
      return
    }

    setBadgeState('float')
    setShowGlow(true)
    const t1 = setTimeout(() => setBadgeState('exiting'), 600)
    const t2 = setTimeout(() => setBadgeState('hidden'), 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    loadContact()
  }, [isOpen, loadContact])

  const showWelcomeToast = !welcomeDismissed && !isOpen
  const fabStyle = isOnProductPage ? { bottom: 160 } : {}
  const windowStyle = isOnProductPage ? { bottom: 236 } : {}

  return (
    <>
      {showWelcomeToast && (
        <button
          type="button"
          className="cb-toast cb-toast--in cb-toast--welcome"
          onClick={() => { dismissWelcomeToast(); setIsOpen(true) }}
          aria-label="Mở thông tin liên hệ SQHOME"
          style={fabStyle}
        >
          <span className="cb-toast__card">
            <span className="cb-toast__head">
              <span className="cb-toast__icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span className="cb-toast__brand">{PANEL_NAME}</span>
            </span>
            <span className="cb-toast__msg">Ấn vào đây được được tư vấn sản phẩm ngay.</span>
          </span>
        </button>
      )}

      <button
        className={`cb-fab${isOpen ? ' cb-fab--open' : ''}${showGlow && !isOpen ? ' cb-fab--glow' : ''}`}
        onClick={() => { dismissWelcomeToast(); setIsOpen(v => !v) }}
        aria-label="Mở thông tin liên hệ"
        title={PANEL_NAME}
        style={fabStyle}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span
              className={`cb-fab-label${
                badgeState === 'exiting' ? ' is-exiting' :
                badgeState === 'float' ? ' is-floating' : ''
              }`}
              aria-hidden="true"
            >
              LH
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="cb-window cb-window--contact" style={windowStyle}>
          <div className="cb-header">
            <div className="cb-header__avatar">
              <div className="cb-header__avatar-ring">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
            </div>
            <div className="cb-header__info">
              <div className="cb-header__name">{PANEL_NAME}</div>
              <div className="cb-header__sub">Số điện thoại &amp; Zalo</div>
            </div>
            <button className="cb-header__close" onClick={() => setIsOpen(false)} aria-label="Đóng">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="cb-body cb-body--contact">
            {isLoadingContact ? (
              <div className="cb-contact-panel cb-contact-panel--state">
                <div className="cb-contact-panel__icon" aria-hidden>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="cb-contact-panel__title">Đang tải thông tin liên hệ</div>
                <div className="cb-contact-panel__desc">Vui lòng chờ trong giây lát.</div>
              </div>
            ) : contactUi ? (
              <div className="cb-contact-panel">
                <div className="cb-contact-panel__icon" aria-hidden>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="cb-contact-panel__title">Thông tin liên hệ SQHOME</div>
                <div className="cb-contact-panel__desc">
                  Anh/chị có thể gọi điện hoặc nhắn Zalo để được hỗ trợ nhanh nhất.
                </div>
                <div className="cb-contact-panel__list">
                  {contactUi.hasCall && contactUi.phoneItems?.map((phoneItem, index) => (
                    <a className="cb-contact-card" href={phoneItem.telHref} key={`${phoneItem.label}-${index}`}>
                      <span className="cb-contact-card__icon" aria-hidden>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </span>
                      <span className="cb-contact-card__body">
                        <span className="cb-contact-card__label">{phoneItem.label == '0906369812' ? 'Mua hàng' : 'Hỗ trợ'}</span>
                        <span className="cb-contact-card__value">{phoneItem.label}</span>
                      </span>
                      <span className="cb-contact-card__action">Gọi ngay</span>
                    </a>
                  ))}
                  {contactUi.hasZalo && (
                    <a className="cb-contact-card cb-contact-card--zalo" href={contactUi.zaloHref} target="_blank" rel="noopener noreferrer">
                      <span className="cb-contact-card__icon" aria-hidden>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.17-.34C8.47 22.51 10.17 23 12 23c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                        </svg>
                      </span>
                      <span className="cb-contact-card__body">
                        <span className="cb-contact-card__label">Zalo</span>
                      </span>
                      <span className="cb-contact-card__action">Mở Zalo</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="cb-contact-panel cb-contact-panel--state">
                <div className="cb-contact-panel__icon" aria-hidden>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="cb-contact-panel__title">Chưa có dữ liệu liên hệ</div>
                <div className="cb-contact-panel__desc">Hiện chưa tìm thấy số điện thoại hoặc Zalo trong dữ liệu cấu hình.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
