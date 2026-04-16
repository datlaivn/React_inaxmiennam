import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { buildAbsoluteUrl, useSeo } from '../utils/seo'

const formatDate = (value) => {
  if (!value) return ''
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''
  return parsedDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const getExcerpt = (htmlContent = '', maxLength = 200) => {
  const plainText = htmlContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plainText) return ''
  if (plainText.length <= maxLength) return plainText
  return `${plainText.slice(0, maxLength).trim()}...`
}

export default function TinTuc() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useSeo({
    title: 'Tin tức SQHOME',
    description: 'Cập nhật tin tức mới nhất về thiết bị vệ sinh, không gian sống và xu hướng nội thất từ SQHOME.',
    canonical: buildAbsoluteUrl('/chinh-sach'),
  })

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setErrorMessage('')

    axios.get(`${baseUrl}/get/tintuc`, { withCredentials: true })
      .then((response) => {
        if (!isMounted) return
        setPosts(Array.isArray(response.data) ? response.data : [])
      })
      .catch(() => {
        if (!isMounted) return
        setErrorMessage('Không thể tải danh sách tin tức.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => { isMounted = false }
  }, [])

  const [featured, ...rest] = posts

  return (
    <section className="news-page-shell">
      <style>{`
        /* === PAGE SHELL === */
        .news-page-shell {
          width: 100%;
          background: #fafaf9;
          min-height: 100vh;
        }

        /* === TOP BANNER === */
        .news-page-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1a4a7a 100%);
          padding: 52px 24px 60px;
          position: relative;
          overflow: hidden;
        }
        .news-page-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .news-page-banner-inner {
          width: min(1200px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .news-page-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.85);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .news-page-banner h1 {
          margin: 0 0 14px;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 900;
          line-height: 1.1;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .news-page-banner p {
          margin: 0;
          font-size: 16px;
          color: rgba(255,255,255,0.7);
          max-width: 600px;
          line-height: 1.75;
        }

        /* === BODY CONTAINER === */
        .news-page-body {
          width: min(1200px, 100%);
          margin: 0 auto;
          padding: 40px 24px 64px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        /* === FEATURED POST === */
        .news-featured {
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(15,23,42,0.07);
          box-shadow: 0 4px 24px rgba(15,23,42,0.06);
          transition: box-shadow 0.3s ease, transform 0.3s ease;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 380px;
        }
        .news-featured:hover {
          box-shadow: 0 12px 48px rgba(15,23,42,0.12);
          transform: translateY(-2px);
        }
        .news-featured-img {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #e8e4de, #d4dce8);
        }
        .news-featured-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s ease;
        }
        .news-featured:hover .news-featured-img img {
          transform: scale(1.04);
        }
        .news-featured-no-img {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 260px;
          background: linear-gradient(135deg, #e8e4de 0%, #d4dce8 100%);
          color: #9ca3af;
          font-size: 48px;
        }
        .news-featured-body {
          padding: 36px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 16px;
        }
        .news-featured-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 6px;
          background: rgba(37,99,235,0.08);
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          width: fit-content;
        }
        .news-featured-date {
          font-size: 13px;
          color: #9ca3af;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .news-featured-date::before {
          content: '';
          display: inline-block;
          width: 16px;
          height: 1px;
          background: #d1d5db;
        }
        .news-featured-title {
          margin: 0;
          font-size: clamp(22px, 2.5vw, 30px);
          font-weight: 900;
          line-height: 1.25;
          color: #0f172a;
          letter-spacing: -0.02em;
          transition: color 0.2s;
        }
        .news-featured:hover .news-featured-title {
          color: #1e40af;
        }
        .news-featured-excerpt {
          margin: 0;
          font-size: 15px;
          line-height: 1.75;
          color: #4b5563;
        }
        .news-featured-read {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 11px 22px;
          background: #0f172a;
          color: #fff;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          width: fit-content;
          transition: background 0.2s, transform 0.2s;
        }
        .news-featured-read:hover {
          background: #1e3a5f;
          transform: translateX(2px);
        }
        .news-featured-read svg {
          transition: transform 0.2s;
        }
        .news-featured-read:hover svg {
          transform: translateX(3px);
        }

        /* === SECTION TITLE === */
        .news-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }
        .news-section-title {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .news-section-title::before {
          content: '';
          display: block;
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: linear-gradient(180deg, #2563eb, #1e40af);
        }
        .news-post-count {
          font-size: 13px;
          color: #9ca3af;
          font-weight: 600;
        }

        /* === POST GRID === */
        .news-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }
        .news-card {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(15,23,42,0.06);
          box-shadow: 0 2px 12px rgba(15,23,42,0.04);
          transition: transform 0.28s ease, box-shadow 0.28s ease;
          display: flex;
          flex-direction: column;
        }
        .news-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(15,23,42,0.1);
        }
        .news-card-img {
          aspect-ratio: 16 / 10;
          overflow: hidden;
          background: linear-gradient(135deg, #e8e4de, #d4dce8);
          position: relative;
        }
        .news-card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.45s ease;
        }
        .news-card:hover .news-card-img img {
          transform: scale(1.06);
        }
        .news-card-no-img {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b0b7c3;
          font-size: 36px;
        }
        .news-card-overlay {
          position: absolute;
          top: 12px;
          left: 12px;
        }
        .news-card-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(15,23,42,0.72);
          backdrop-filter: blur(8px);
          border-radius: 6px;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .news-card-body {
          flex: 1;
          padding: 20px 22px 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .news-card-date {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .news-card-date svg {
          flex-shrink: 0;
        }
        .news-card-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          line-height: 1.35;
          color: #0f172a;
          letter-spacing: -0.01em;
          transition: color 0.2s;
          flex: 1;
        }
        .news-card:hover .news-card-title {
          color: #1e40af;
        }
        .news-card-excerpt {
          margin: 0;
          font-size: 14px;
          line-height: 1.65;
          color: #6b7280;
        }
        .news-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }
        .news-card-author {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          color: #9ca3af;
          font-weight: 600;
        }
        .news-card-author-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #1e40af);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
        }
        .news-card-read-more {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: gap 0.2s;
        }
        .news-card-read-more:hover {
          gap: 8px;
        }

        /* === EMPTY & LOADING === */
        .news-page-feedback {
          border-radius: 18px;
          padding: 22px 28px;
          font-size: 15px;
          background: #fff;
          border: 1px solid rgba(15,23,42,0.08);
          box-shadow: 0 4px 16px rgba(15,23,42,0.05);
          color: #4b5563;
          text-align: center;
        }
        .news-page-feedback.is-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #9ca3af;
        }
        .news-page-feedback.is-error {
          border-color: rgba(220,38,38,0.2);
          background: #fff5f5;
          color: #b91c1c;
        }
        .news-loading-dots {
          display: inline-flex;
          gap: 4px;
        }
        .news-loading-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d1d5db;
          animation: news-bounce 1.2s ease-in-out infinite;
        }
        .news-loading-dots span:nth-child(2) { animation-delay: 0.15s; }
        .news-loading-dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes news-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* === RESPONSIVE === */
        @media (max-width: 1023px) {
          .news-page-banner { padding: 36px 20px 44px; }
          .news-page-body { padding: 28px 16px 48px; gap: 28px; }
          .news-featured { grid-template-columns: 1fr; min-height: auto; }
          .news-featured-img { aspect-ratio: 16 / 9; min-height: 220px; }
          .news-featured-body { padding: 24px 24px 28px; }
          .news-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        }
        @media (max-width: 640px) {
          .news-grid { grid-template-columns: 1fr; }
          .news-page-banner h1 { font-size: 28px; }
          .news-featured-body { padding: 20px 18px 22px; }
        }
      `}</style>

      {/* === BANNER === */}
      <div className="news-page-banner">
        <div className="news-page-banner-inner">
          <div className="news-page-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
            Tin tức & Blog
          </div>
          <h1>Tin tức & Cập nhật từ SQHOME</h1>
          <p>Khám phá những bài viết mới nhất về thiết bị vệ sinh cao cấp, xu hướng không gian sống và mẹo hay cho ngôi nhà của bạn.</p>
        </div>
      </div>

      <div className="news-page-body">
        {/* === LOADING === */}
        {isLoading && (
          <div className="news-page-feedback is-loading">
            <div className="news-loading-dots">
              <span /><span /><span />
            </div>
            Đang tải tin tức...
          </div>
        )}

        {/* === ERROR === */}
        {errorMessage && (
          <div className="news-page-feedback is-error">{errorMessage}</div>
        )}

        {/* === FEATURED POST === */}
        {!isLoading && !errorMessage && featured && (
          <>
            <div className="news-section-header">
              <h2 className="news-section-title">Bài viết nổi bật</h2>
            </div>
            <Link
              to={`/tin-tuc/${featured.slug || featured.id}/`}
              className="news-featured"
              style={{ textDecoration: 'none' }}
            >
              <div className="news-featured-img">
                {featured.image ? (
                  <img src={featured.image} alt={featured.title} />
                ) : (
                  <div className="news-featured-no-img">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                )}
              </div>
              <div className="news-featured-body">
                <span className="news-featured-tag">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Nổi bật
                </span>
                <div className="news-featured-date">{formatDate(featured.date)}</div>
                <h2 className="news-featured-title">{featured.title}</h2>
                {featured.content && (
                  <p className="news-featured-excerpt">{getExcerpt(featured.content, 180)}</p>
                )}
                <span className="news-featured-read">
                  Đọc bài viết
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </div>
            </Link>
          </>
        )}

        {/* === GRID === */}
        {!isLoading && !errorMessage && rest.length > 0 && (
          <>
            <div className="news-section-header">
              <h2 className="news-section-title">Tất cả bài viết</h2>
              <span className="news-post-count">{rest.length} bài viết</span>
            </div>
            <div className="news-grid">
              {rest.map((item) => (
                <article className="news-card" key={item.id || item.slug}>
                  <div className="news-card-img">
                    {item.image ? (
                      <img src={item.image} alt={item.title} loading="lazy" />
                    ) : (
                      <div className="news-card-no-img">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      </div>
                    )}
                    <div className="news-card-overlay">
                      <span className="news-card-tag">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                        Tin tức
                      </span>
                    </div>
                  </div>
                  <div className="news-card-body">
                    <div className="news-card-date">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {formatDate(item.date)}
                    </div>
                    <h3 className="news-card-title">{item.title}</h3>
                    {item.content && (
                      <p className="news-card-excerpt">{getExcerpt(item.content, 120)}</p>
                    )}
                    <div className="news-card-footer">
                      <div className="news-card-author">
                        <div className="news-card-author-avatar">SQ</div>
                        SQHOME
                      </div>
                      <Link to={`/tin-tuc/${item.slug || item.id}/`} className="news-card-read-more">
                        Đọc thêm
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* === EMPTY === */}
        {!isLoading && !errorMessage && posts.length === 0 && (
          <div className="news-page-feedback">
            Hiện chưa có bài viết tin tức nào.
          </div>
        )}
      </div>
    </section>
  )
}
