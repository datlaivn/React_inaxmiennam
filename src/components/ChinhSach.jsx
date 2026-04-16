import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
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

const getExcerpt = (htmlContent = '', maxLength = 180) => {
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

export default function ChinhSach() {
  const baseUrl = resolveApiBaseUrl()
  const [policies, setPolicies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setErrorMessage('')

    axios.get(`${baseUrl}/get/chinh-sach`, { withCredentials: true })
      .then((response) => {
        if (!isMounted) return
        setPolicies(Array.isArray(response.data) ? response.data : [])
      })
      .catch((error) => {
        if (!isMounted) return
        console.error('Chinh sach API error:', error)
        setErrorMessage('Không thể tải danh sách chính sách lúc này. Vui lòng thử lại sau.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [baseUrl])

  const heroCountText = useMemo(() => {
    if (!policies.length) return 'Đang cập nhật các chính sách mới nhất từ SQHOME.'
    return `${policies.length} chính sách và trang nội dung đang có sẵn để khách hàng tra cứu nhanh.`
  }, [policies.length])

  useSeo({
    title: 'Chính sách SQHOME',
    description: 'Tra cứu nhanh các chính sách thanh toán, vận chuyển, bảo hành, đổi trả và bảo mật thông tin tại SQHOME.',
    canonical: buildAbsoluteUrl('/chinh-sach'),
  })

  return (
    <section className="policy-page-shell">
      <style>{`
        .policy-page-shell {
          width: 100%;
          padding: 32px 16px 56px;
          background: linear-gradient(180deg, #f6f3ef 0%, #ffffff 42%, #f8f8f8 100%);
        }
        .policy-page-container {
          width: min(1200px, 100%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .policy-page-hero {
          background: linear-gradient(135deg, #101010 0%, #222 55%, #353535 100%);
          border-radius: 28px;
          padding: 34px;
          color: #fff;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
        }
        .policy-page-hero span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: #d6d9df;
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .policy-page-hero h1 {
          margin: 18px 0 14px;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.12;
          font-weight: 800;
          color: #fff;
        }
        .policy-page-hero p {
          margin: 0;
          max-width: 760px;
          color: #d6d9df;
          font-size: 16px;
          line-height: 1.8;
        }
        .policy-page-feedback {
          border-radius: 22px;
          padding: 18px 22px;
          font-size: 15px;
          line-height: 1.6;
          background: #fff;
          border: 1px solid rgba(16,16,16,0.08);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
        }
        .policy-page-feedback.is-error {
          border-color: rgba(220, 38, 38, 0.2);
          color: #b91c1c;
          background: #fff5f5;
        }
        .policy-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }
        .policy-card {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .policy-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
        }
        .policy-card-media {
          aspect-ratio: 16 / 9;
          background: linear-gradient(135deg, #ece9e9, #dfe6ef);
          overflow: hidden;
        }
        .policy-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .policy-card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 14px;
          padding: 22px;
        }
        .policy-card-date {
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
        }
        .policy-card-title {
          margin: 0;
          color: #101010;
          font-size: 22px;
          line-height: 1.35;
          font-weight: 800;
        }
        .policy-card-excerpt {
          margin: 0;
          color: #4b5563;
          font-size: 15px;
          line-height: 1.7;
        }
        .policy-card-link {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
        }
        .policy-card-link::after {
          content: '→';
          transition: transform 0.2s ease;
        }
        .policy-card-link:hover::after {
          transform: translateX(3px);
        }
        @media (max-width: 1023px) {
          .policy-page-shell {
            padding: 22px 12px 36px;
          }
          .policy-page-hero {
            padding: 24px 20px;
            border-radius: 22px;
          }
          .policy-grid {
            grid-template-columns: 1fr;
          }
          .policy-card-title {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="policy-page-container">
        <div className="policy-page-hero">
          <span>Chính sách SQHOME</span>
          <h1>Chính sách mua sắm, bảo hành và vận chuyển tại SQHOME</h1>
          <p>{heroCountText}</p>
        </div>

        {isLoading ? <div className="policy-page-feedback">Đang tải danh sách chính sách...</div> : null}
        {errorMessage ? <div className="policy-page-feedback is-error">{errorMessage}</div> : null}

        {!isLoading && !errorMessage ? (
          <div className="policy-grid">
            {policies.map((item) => {
              const policySlug = item.slug || item.id
              const policyLink = `/chinh-sach/${policySlug}`
              const excerpt = getExcerpt(item.content)

              return (
                <article className="policy-card" key={item.id || policySlug}>
                
                  <div className="policy-card-body">
                    <div className="policy-card-date">{formatDate(item.date)}</div>
                    <h2 className="policy-card-title">{item.title}</h2>
                    {excerpt ? <p className="policy-card-excerpt">{excerpt}</p> : null}
                    <Link className="policy-card-link" to={policyLink}>
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}

        {!isLoading && !errorMessage && !policies.length ? (
          <div className="policy-page-feedback">Hiện chưa có trang chính sách nào được đồng bộ từ WordPress.</div>
        ) : null}
      </div>
    </section>
  )
}
