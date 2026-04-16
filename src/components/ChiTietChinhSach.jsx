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

export default function ChiTietChinhSach() {
  const { slug } = useParams()
  const baseUrl = resolveApiBaseUrl()
  const [policy, setPolicy] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!slug) return undefined

    let isMounted = true
    setIsLoading(true)
    setErrorMessage('')
    setPolicy(null)

    axios.get(`${baseUrl}/get/chinh-sach/${slug}`, { withCredentials: true })
      .then((response) => {
        if (!isMounted) return
        setPolicy(response.data && typeof response.data === 'object' ? response.data : null)
      })
      .catch((error) => {
        if (!isMounted) return
        console.error('Chi tiet chinh sach API error:', error)
        setErrorMessage('Không thể tải nội dung chính sách này. Vui lòng thử lại sau.')
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

  const publishedText = useMemo(() => formatDate(policy?.date), [policy?.date])

  useSeo({
    title: policy?.title ? `${policy.title} | SQHOME` : 'Chi tiết chính sách | SQHOME',
    description: policy?.title
      ? `Thông tin chi tiết về ${policy.title.toLowerCase()} tại SQHOME.`
      : 'Xem chi tiết chính sách tại SQHOME.',
    canonical: buildAbsoluteUrl(slug ? `/chinh-sach/${slug}` : '/chinh-sach'),
  })

  return (
    <section className="policy-detail-shell">
      <style>{`
        .policy-detail-shell {
          width: 100%;
          padding: 28px 16px 56px;
          background: linear-gradient(180deg, #f8f6f3 0%, #fff 36%, #f6f7fb 100%);
        }
        .policy-detail-container {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .policy-detail-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          color: #1d4ed8;
          text-decoration: none;
          font-weight: 700;
        }
        .policy-detail-card {
          background: #fff;
          border-radius: 28px;
          border: 1px solid rgba(15,23,42,0.08);
          box-shadow: 0 20px 48px rgba(15,23,42,0.1);
          overflow: hidden;
        }
        .policy-detail-hero {
          padding: 34px;
          background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%);
          color: #fff;
        }
        .policy-detail-date {
          display: inline-flex;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: #d1d5db;
          font-size: 13px;
          font-weight: 700;
        }
        .policy-detail-title {
          margin: 16px 0 0;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.14;
          font-weight: 800;
          color: #fff;
        }
        .policy-detail-cover {
          background: #f3f4f6;
        }
        .policy-detail-cover img {
          display: block;
          width: 100%;
          max-height: 440px;
          object-fit: cover;
        }
        .policy-detail-content {
          padding: 34px;
          color: #1f2937;
          font-size: 17px;
          line-height: 1.82;
        }
        .policy-detail-content > :first-child {
          margin-top: 0 !important;
        }
        .policy-detail-content h1,
        .policy-detail-content h2,
        .policy-detail-content h3 {
          color: #0f172a !important;
          line-height: 1.28;
          letter-spacing: -0.015em;
          margin-bottom: 0.62em;
        }
        .policy-detail-content h1 {
          font-size: clamp(30px, 3vw, 38px) !important;
          margin-top: 1.15em;
          font-weight: 800;
        }
        .policy-detail-content h2 {
          font-size: clamp(24px, 2.3vw, 31px) !important;
          margin-top: 1.35em;
          font-weight: 800;
          border-bottom: 1px solid rgba(15, 23, 42, 0.12);
          padding-bottom: 8px;
        }
        .policy-detail-content h3 {
          font-size: clamp(20px, 1.9vw, 24px) !important;
          margin-top: 1.22em;
          font-weight: 700;
        }
        .policy-detail-content h4,
        .policy-detail-content h5,
        .policy-detail-content h6 {
          color: #0f172a;
          line-height: 1.35;
          margin-top: 1.1em;
          margin-bottom: 0.55em;
          font-weight: 700;
        }
        .policy-detail-content p {
          margin-bottom: 1em;
          color: #273449;
        }
        .policy-detail-content ul,
        .policy-detail-content ol {
          margin: 0 0 1em;
          padding-left: 1.35em;
        }
        .policy-detail-content li {
          margin: 0.4em 0;
        }
        .policy-detail-content blockquote {
          margin: 1.2em 0;
          padding: 12px 16px;
          border-left: 4px solid #1d4ed8;
          border-radius: 10px;
          background: #f8fafc;
          color: #334155;
        }
        .policy-detail-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.2em;
          border: 1px solid #e5e7eb;
          background: #fff;
        }
        .policy-detail-content th,
        .policy-detail-content td {
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          text-align: left;
          vertical-align: top;
        }
        .policy-detail-content th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 700;
        }
        .policy-detail-content img {
          max-width: 100%;
          height: auto;
          border-radius: 18px;
        }
        .policy-detail-content a {
          color: #2563eb;
          word-break: break-word;
          font-weight: 600;
        }
        .policy-detail-feedback {
          background: #fff;
          padding: 18px 22px;
          border-radius: 18px;
          border: 1px solid rgba(15,23,42,0.08);
          box-shadow: 0 12px 28px rgba(15,23,42,0.06);
          font-size: 15px;
          line-height: 1.6;
        }
        .policy-detail-feedback.is-error {
          background: #fff5f5;
          border-color: rgba(220,38,38,0.18);
          color: #b91c1c;
        }
        @media (max-width: 1023px) {
          .policy-detail-shell {
            padding: 18px 12px 36px;
          }
          .policy-detail-hero,
          .policy-detail-content {
            padding: 22px 18px;
          }
          .policy-detail-card {
            border-radius: 22px;
          }
        }
      `}</style>

      <div className="policy-detail-container">
        <Link className="policy-detail-back" to="/chinh-sach">
          ← Quay lại danh sách chính sách
        </Link>

        {isLoading ? <div className="policy-detail-feedback">Đang tải nội dung chính sách...</div> : null}
        {errorMessage ? <div className="policy-detail-feedback is-error">{errorMessage}</div> : null}

        {!isLoading && !errorMessage && policy ? (
          <article className="policy-detail-card">
            <div className="policy-detail-hero">
              {publishedText ? <div className="policy-detail-date">Cập nhật: {publishedText}</div> : null}
              <h1 className="policy-detail-title">{policy.title}</h1>
            </div>

            {policy.image ? (
              <div className="policy-detail-cover">
                <img src={policy.image} alt={policy.title} />
              </div>
            ) : null}

            <div
              className="policy-detail-content"
              dangerouslySetInnerHTML={{ __html: policy.content || '<p>Nội dung đang được cập nhật.</p>' }}
            />
          </article>
        ) : null}
      </div>
    </section>
  )
}
