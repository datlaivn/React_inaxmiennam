import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import { buildAbsoluteUrl, useSeo } from '../utils/seo'
import { resolveApiBaseUrl } from '../utils/api'

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

/**
 * Loại bỏ các WordPress caption shortcode như:
 * [caption id="attachment_10257" align="alignnone" width="800"]<img .../>Chú thích[/caption]
 */
const stripWordPressCaptions = (html) => {
  if (!html) return html

  let cleaned = html

  // Xử lý: [caption ...]<img .../>text[/caption]
  cleaned = cleaned.replace(
    /\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi,
    '$1'
  )

  // Xử lý: [caption ...]<img .../><span class="...">text</span>[/caption]
  cleaned = cleaned.replace(
    /\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi,
    '$1'
  )

  // Xử lý: [caption ...]<figure ...>...[/caption]
  cleaned = cleaned.replace(
    /\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi,
    '$1'
  )

  return cleaned
}

/** Cải thiện img: thêm lazy loading, alt text, wrapper đẹp */
const enhanceImages = (html) => {
  if (!html) return html

  let enhanced = html

  // Thêm loading="lazy" vào tất cả img trong nội dung
  enhanced = enhanced.replace(
    /<img(?![^>]*\bloading=)([^>]*?)>/gi,
    '<img loading="lazy" decoding="async"$1>'
  )

  return enhanced
}

export default function ChiTietTinTuc() {
  const { slug } = useParams()
  const baseUrl = resolveApiBaseUrl()
  const [article, setArticle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!slug) return undefined

    let isMounted = true
    setIsLoading(true)
    setErrorMessage('')
    setArticle(null)

    axios.get(`${baseUrl}/get/tintuc/${slug}`, { withCredentials: true })
      .then((response) => {
        if (!isMounted) return
        setArticle(response.data && typeof response.data === 'object' ? response.data : null)
      })
      .catch((error) => {
        if (!isMounted) return
        console.error('Chi tiet tin tuc API error:', error)
        setErrorMessage('Không thể tải bài viết này. Vui lòng thử lại sau.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [baseUrl, slug])

  const publishedText = useMemo(() => formatDate(article?.date), [article?.date])

  // Xử lý nội dung: loại bỏ caption shortcode + tăng cường ảnh
  const processedContent = useMemo(() => {
    const raw = article?.content || '<p>Nội dung đang được cập nhật.</p>'
    return enhanceImages(stripWordPressCaptions(raw))
  }, [article?.content])

  useSeo({
    title: article?.title ? `${article.title} | Tin tức SQHOME` : 'Tin tức SQHOME',
    description: article?.title
      ? `Đọc bài viết ${article.title} cùng các thông tin hữu ích về thiết bị vệ sinh và không gian sống từ SQHOME.`
      : 'Tin tức và bài viết mới nhất từ SQHOME.',
    canonical: buildAbsoluteUrl(slug ? `/tin-tuc/${slug}` : '/'),
  })

  return (
    <section className="news-detail-shell">
      <style>{`
        /* ===== Base Shell ===== */
        .news-detail-shell {
          width: 100%;
          padding: 32px 16px 80px;
          background: linear-gradient(180deg, #f8f9fc 0%, #ffffff 50%, #f4f6fb 100%);
        }
        .news-detail-container {
          width: min(1140px, 100%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .news-detail-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          transition: gap 0.2s, color 0.2s;
        }
        .news-detail-back:hover {
          gap: 12px;
          color: #1d4ed8;
        }
        .news-detail-back::before {
          content: '←';
          font-size: 18px;
        }
        /* ===== Main Card ===== */
        .news-detail-card {
          background: #fff;
          border-radius: 28px;
          border: 1px solid rgba(15,23,42,0.07);
          box-shadow: 0 8px 32px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.04);
          overflow: hidden;
        }
        /* ===== Hero Section ===== */
        .news-detail-hero {
          padding: 44px 48px 40px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%);
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .news-detail-hero::before {
          content: '';
          position: absolute;
          top: -60px;
          right: -60px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          pointer-events: none;
        }
        .news-detail-hero::after {
          content: '';
          position: absolute;
          bottom: -80px;
          left: -40px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: rgba(255,255,255,0.025);
          pointer-events: none;
        }
        .news-detail-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          color: #93c5fd;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.12);
          margin-bottom: 20px;
        }
        .news-detail-title {
          margin: 0 0 16px;
          font-size: clamp(28px, 4vw, 46px);
          line-height: 1.18;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 20px rgba(0,0,0,0.3);
          position: relative;
          z-index: 1;
        }
        .news-detail-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 20px;
        }
        .news-detail-date {
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .news-detail-divider {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #475569;
          flex-shrink: 0;
        }
        /* ===== Cover Image ===== */
        .news-detail-cover {
          background: #f1f5f9;
          position: relative;
        }
        .news-detail-cover img {
          display: block;
          width: 100%;
          max-height: 500px;
          object-fit: cover;
        }
        /* ===== Article Content ===== */
        .news-detail-content {
          padding: 44px 48px;
          color: #1e293b;
          font-size: 17px;
          line-height: 1.9;
          max-width: 860px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        /* Heading Styles */
        .news-detail-content h1 {
          font-size: clamp(28px, 3.5vw, 38px);
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin: 1.8em 0 0.6em;
          letter-spacing: -0.02em;
          padding-bottom: 12px;
          border-bottom: 3px solid #e2e8f0;
          position: relative;
        }
        .news-detail-content h1::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 72px;
          height: 3px;
          background: linear-gradient(90deg, #2563eb, #60a5fa);
          border-radius: 2px;
        }
        .news-detail-content h2 {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 700;
          color: #1e293b;
          line-height: 1.25;
          margin: 1.7em 0 0.55em;
          letter-spacing: -0.01em;
          padding: 14px 20px;
          background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
          border-left: 5px solid #2563eb;
          border-radius: 0 10px 10px 0;
        }
        .news-detail-content h3 {
          font-size: clamp(19px, 2.5vw, 24px);
          font-weight: 700;
          color: #1e293b;
          line-height: 1.3;
          margin: 1.5em 0 0.5em;
          padding-bottom: 8px;
          border-bottom: 1.5px solid #e2e8f0;
          position: relative;
        }
        .news-detail-content h3::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2563eb;
          margin-right: 10px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }
        .news-detail-content h4 {
          font-size: clamp(16px, 2vw, 20px);
          font-weight: 700;
          color: #334155;
          line-height: 1.4;
          margin: 1.4em 0 0.45em;
          padding: 8px 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        /* Paragraph & Text */
        .news-detail-content p {
          margin-bottom: 1.1em;
          color: #334155;
          font-size: 17px;
          line-height: 1.9;
          text-align: justify;
        }

        /* Lists */
        .news-detail-content ul,
        .news-detail-content ol {
          margin: 0.8em 0 1.2em;
          padding-left: 28px;
          color: #334155;
        }
        .news-detail-content ul li,
        .news-detail-content ol li {
          margin-bottom: 0.55em;
          line-height: 1.8;
          font-size: 17px;
        }
        .news-detail-content ul li::marker {
          color: #2563eb;
          font-size: 1.2em;
        }
        .news-detail-content ol li::marker {
          color: #2563eb;
          font-weight: 700;
        }

        /* Blockquote */
        .news-detail-content blockquote {
          margin: 1.5em 0;
          padding: 20px 28px;
          background: linear-gradient(135deg, #eff6ff, #f0f9ff);
          border-left: 5px solid #2563eb;
          border-radius: 0 14px 14px 0;
          color: #1e3a8a;
          font-style: italic;
          font-size: 18px;
          line-height: 1.75;
          box-shadow: 0 4px 16px rgba(37,99,235,0.08);
        }
        .news-detail-content blockquote p {
          color: #1e3a8a;
          margin-bottom: 0;
          text-align: left;
        }

        /* Images */
        .news-detail-content img {
          max-width: 100%;
          height: auto;
          border-radius: 16px;
          margin: 1.2em 0;
          box-shadow: 0 4px 20px rgba(15,23,42,0.1);
        }

        /* WordPress Captions / Figure */
        .news-detail-content figure {
          margin: 1.5em 0;
          padding: 0;
          border: none;
          background: none;
          box-shadow: none;
        }
        .news-detail-content figure img {
          margin: 0 0 10px;
          display: block;
        }
        .news-detail-content figcaption,
        .news-detail-content .wp-caption-text,
        .news-detail-content .wp-caption-dd {
          display: block;
          margin: 0;
          padding: 10px 16px;
          background: #f8fafc;
          border-radius: 0 0 12px 12px;
          border: 1px solid #e2e8f0;
          border-top: none;
          font-size: 14px;
          color: #64748b;
          text-align: center;
          line-height: 1.5;
          font-style: italic;
        }
        .news-detail-content .wp-caption {
          margin: 0;
          padding: 0;
          border: none;
          background: none;
        }
        .news-detail-content .wp-caption img {
          border-radius: 12px 12px 0 0;
          margin: 0;
        }
        .news-detail-content .aligncenter {
          display: block;
          margin: 1.5em auto;
        }
        .news-detail-content .alignleft {
          float: left;
          margin: 0.8em 20px 0.8em 0;
          max-width: 45%;
        }
        .news-detail-content .alignright {
          float: right;
          margin: 0.8em 0 0.8em 20px;
          max-width: 45%;
        }
        .news-detail-content .size-large,
        .news-detail-content .size-full {
          width: 100%;
          height: auto;
        }

        /* Clear floats */
        .news-detail-content .aligncenter,
        .news-detail-content br[style*="clear"] {
          clear: both;
        }
        .news-detail-content > *:after {
          content: '';
          display: table;
        }
        .news-detail-content > *:after {
          content: none;
        }
        .news-detail-content .alignleft::after,
        .news-detail-content .alignright::after {
          content: none;
        }

        /* Chặn text caption dạng thuần hiển thị lộn xộn sau ảnh */
        .news-detail-content img + *:not(img):not(p):not(figure):not(br) {
          display: none;
        }
        .news-detail-content img + br + * {
          display: none;
        }

        /* Links */
        .news-detail-content a {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s;
        }
        .news-detail-content a:hover {
          color: #1d4ed8;
        }

        /* Tables */
        .news-detail-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.2em 0;
          font-size: 16px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(15,23,42,0.08);
        }
        .news-detail-content th {
          background: #0f172a;
          color: #fff;
          padding: 14px 18px;
          text-align: left;
          font-weight: 700;
          font-size: 15px;
        }
        .news-detail-content td {
          padding: 12px 18px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .news-detail-content tr:nth-child(even) td {
          background: #f8fafc;
        }
        .news-detail-content tr:last-child td {
          border-bottom: none;
        }

        /* Strong & Emphasis */
        .news-detail-content strong,
        .news-detail-content b {
          font-weight: 700;
          color: #0f172a;
        }
        .news-detail-content em,
        .news-detail-content i {
          font-style: italic;
          color: #475569;
        }

        /* Code */
        .news-detail-content code {
          background: #f1f5f9;
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 0.9em;
          color: #2563eb;
          font-family: monospace;
        }
        .news-detail-content pre {
          background: #0f172a;
          color: #e2e8f0;
          padding: 20px 24px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 1.2em 0;
          font-size: 15px;
          line-height: 1.7;
        }
        .news-detail-content pre code {
          background: none;
          padding: 0;
          color: inherit;
          font-size: inherit;
        }

        /* Feedback Banner */
        .news-detail-feedback {
          background: #fff;
          padding: 22px 28px;
          border-radius: 18px;
          border: 1px solid rgba(15,23,42,0.08);
          box-shadow: 0 8px 24px rgba(15,23,42,0.05);
          font-size: 16px;
          line-height: 1.6;
          color: #475569;
          text-align: center;
        }
        .news-detail-feedback.is-error {
          background: #fef2f2;
          border-color: rgba(220,38,38,0.18);
          color: #b91c1c;
        }

        /* ===== Responsive ===== */
        @media (max-width: 1023px) {
          .news-detail-shell {
            padding: 20px 12px 48px;
          }
          .news-detail-hero {
            padding: 28px 22px 26px;
          }
          .news-detail-content {
            padding: 28px 22px;
          }
          .news-detail-card {
            border-radius: 22px;
          }
          .news-detail-content blockquote {
            padding: 16px 20px;
            font-size: 16px;
          }
        }
        @media (max-width: 640px) {
          .news-detail-shell {
            padding: 14px 10px 40px;
          }
          .news-detail-hero {
            padding: 22px 16px 20px;
          }
          .news-detail-content {
            padding: 22px 16px;
            font-size: 16px;
          }
          .news-detail-content p,
          .news-detail-content li {
            font-size: 16px;
            text-align: left;
          }
          .news-detail-meta {
            gap: 12px;
          }
        }
        @media (max-width: 640px) {
          [style*="padding: 0 48px"] {
            padding: 0 16px 28px !important;
          }
        }
      `}</style>

      <div className="news-detail-container">
        <Link className="news-detail-back" to="/">
          ← Quay lại trang chủ
        </Link>

        {isLoading ? <div className="news-detail-feedback">Đang tải bài viết...</div> : null}
        {errorMessage ? <div className="news-detail-feedback is-error">{errorMessage}</div> : null}

        {!isLoading && !errorMessage && article ? (
          <article className="news-detail-card">
            <div className="news-detail-hero">
              <div className="news-detail-label">
                <span>📰</span> Tin tức SQHOME
              </div>
              <h1 className="news-detail-title">{article.title}</h1>
              <div className="news-detail-meta">
                {publishedText ? (
                  <>
                    <span className="news-detail-date">
                      <span>📅</span> Ngày đăng: {publishedText}
                    </span>
                    {article.author ? (
                      <>
                        <span className="news-detail-divider" />
                        <span className="news-detail-date">
                          <span>✍️</span> Tác giả: {article.author}
                        </span>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {article.image ? (
              <div className="news-detail-cover">
                <img src={article.image} alt={article.title} />
              </div>
            ) : null}

            <div
              className="news-detail-content"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            <div style={{ padding: '0 48px 36px', maxWidth: '860px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              <div style={{
                marginTop: '40px',
                paddingTop: '24px',
                borderTop: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <Link
                  to="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '15px',
                    transition: 'gap 0.2s',
                  }}
                >
                  ← Quay lại trang chủ
                </Link>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  SQHOME — Thiết bị vệ sinh INAX chính hãng
                </span>
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  )
}
