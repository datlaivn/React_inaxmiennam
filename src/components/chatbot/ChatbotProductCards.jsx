import React from 'react'
import { Link } from 'react-router-dom'

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string' && value.includes('₫')) return value
  const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, '')))
  if (isNaN(numValue)) return value
  return `${numValue.toLocaleString('vi-VN')}₫`
}

export default function ChatbotProductCards({ products, onNavigate }) {
  if (!products || products.length === 0) return null

  return (
    <div className='chatbot-results'>
      <div className='chatbot-results__label'>Sản phẩm tìm được</div>
      <div className='chatbot-pro-grid'>
        {products.map((p) => {
          const hasDisc =
            p.price_original != null &&
            Number(p.price_original) > Number(p.price_display)
          const discPct = hasDisc
            ? Math.round((1 - Number(p.price_display) / Number(p.price_original)) * 100)
            : null
          return (
            <div key={p.slug} className='chatbot-pro-block'>
              <Link
                to={`/san-pham/${p.slug}`}
                className='chatbot-pro-summary'
                onClick={onNavigate}
              >
                <div className='chatbot-pro-summary__media'>
                  {p.image
                    ? <img src={p.image} alt='' loading='lazy' />
                    : <div className='chatbot-pro-summary__placeholder'>📦</div>}
                  {p.gifts && p.gifts.length > 0 && (
                    <span className='chatbot-pro-summary__badge'>Quà</span>
                  )}
                </div>
                <div className='chatbot-pro-summary__body'>
                  <div className='chatbot-pro-summary__name' title={p.name}>{p.name}</div>
                  <div className='chatbot-pro-summary__prices'>
                    <span className='chatbot-pro-summary__price'>{formatPrice(p.price_display)}</span>
                    {hasDisc && (
                      <span className='chatbot-pro-summary__orig'>{formatPrice(p.price_original)}</span>
                    )}
                  </div>
                </div>
              </Link>
              <div className='chatbot-pro-detail'>
                {p.sku
                  ? <div className='chatbot-pro-detail__row'><strong>Mã SKU:</strong> {p.sku}</div>
                  : null}
                {hasDisc && discPct
                  ? <div className='chatbot-pro-detail__row'>Giá niêm yết gạch ngang; đang giảm khoảng <strong>{discPct}%</strong> so với niêm yết.</div>
                  : null}
                {p.gifts && p.gifts.length > 0 && (
                  <div className='chatbot-pro-detail__gifts'>
                    <strong>Quà tặng kèm:</strong>
                    <ul>
                      {p.gifts.map((g) => (
                        <li key={g.name}>{g.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  to={`/san-pham/${p.slug}`}
                  className='chatbot-pro-detail__cta'
                  onClick={onNavigate}
                >
                  Xem chi tiết và mua hàng →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
