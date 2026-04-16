import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import { buildApiUrl, resolveApiBaseUrl } from '../utils/api'
import { buildAbsoluteUrl, useSeo } from '../utils/seo'

const formatPrice = (value) => {
	if (value === null || value === undefined || value === '') return ''
	// Parse as float to handle decimals like .00, then floor to remove them
	const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, '')))
	if (isNaN(numValue)) return value
	return `${numValue.toLocaleString('vi-VN')}₫`
}

const getSearchTitle = (keyword, total) => {
	if (!keyword) return 'Kết quả tìm kiếm'
	if (!total) return `Không tìm thấy kết quả cho "${keyword}"`
	return `Tìm thấy ${total} sản phẩm cho "${keyword}"`
}

export default function Search() {
	const { keyword: routeKeyword = '' } = useParams()
	const decodedKeyword = useMemo(() => decodeURIComponent(routeKeyword).trim(), [routeKeyword])
	const baseUrl = resolveApiBaseUrl()
	const [searchData, setSearchData] = useState({ keyword: decodedKeyword, items: [] })
	const [isLoading, setIsLoading] = useState(true)
	// show 9 items initially; first "Xem thêm" expands to 100, subsequent clicks add 100 each
	const initialDisplay = 8
	const batchSize = 100
	const [displayCount, setDisplayCount] = useState(initialDisplay)
	const [sortOption, setSortOption] = useState('relevance')
	const resultsTopRef = useRef(null)

	useEffect(() => {
		let isMounted = true
		const controller = new AbortController()

		if (!decodedKeyword) {
			setSearchData({ keyword: '', items: [] })
			setIsLoading(false)
			return () => controller.abort()
		}

		setIsLoading(true)

		axios
			.get(`${baseUrl}/get/search?q=${encodeURIComponent(decodedKeyword)}`, {
				signal: controller.signal,
			})
			.then((response) => {
				if (!isMounted) return

				setSearchData({
					keyword: response?.data?.keyword || decodedKeyword,
					items: Array.isArray(response?.data?.items) ? response.data.items : [],
				})
			})
			.catch((error) => {
				if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
					console.error('Search API error:', error)
					if (isMounted) {
						setSearchData({ keyword: decodedKeyword, items: [] })
					}
				}
			})
			.finally(() => {
				if (isMounted) {
					setIsLoading(false)
				}
			})

		return () => {
			isMounted = false
			controller.abort()
		}
	}, [baseUrl, decodedKeyword])

	const items = Array.isArray(searchData.items) ? searchData.items : []
	const activeKeyword = searchData.keyword || decodedKeyword
	const sortedItems = useMemo(() => {
		const normalizedItems = [...items]

		const parseNumericPrice = (item) => {
			const rawValue = item?.sale_price ?? item?.price ?? item?.regular_price ?? 0
			if (typeof rawValue === 'number') return rawValue
			const parsed = String(rawValue).replace(/[^\d]/g, '')
			return parsed ? Number(parsed) : 0
		}

		if (sortOption === 'price-asc') {
			return normalizedItems.sort((a, b) => parseNumericPrice(a) - parseNumericPrice(b))
		}

		if (sortOption === 'price-desc') {
			return normalizedItems.sort((a, b) => parseNumericPrice(b) - parseNumericPrice(a))
		}

		return normalizedItems
	}, [items, sortOption])
	const visibleItems = sortedItems.slice(0, displayCount)
	const remainingCount = Math.max(0, sortedItems.length - displayCount)

	useSeo({
		title: activeKeyword ? `Tìm kiếm "${activeKeyword}" | SQHOME` : 'Tìm kiếm sản phẩm | SQHOME',
		description: activeKeyword
			? `Kết quả tìm kiếm cho ${activeKeyword} tại SQHOME. Xem sản phẩm phù hợp cùng giá bán và thông tin chi tiết.`
			: 'Tìm kiếm nhanh sản phẩm thiết bị vệ sinh tại SQHOME.',
		canonical: buildAbsoluteUrl(activeKeyword ? `/search/${encodeURIComponent(activeKeyword)}` : '/search'),
	})

	useEffect(() => {
		// reset shown item count when keyword or sort changes
		setDisplayCount(initialDisplay)
	}, [decodedKeyword, sortOption])

	// no page-number pagination anymore; we use incremental displayCount + optional load-more

	return (
		<section>
			<style>{`
				.search-page {
					max-width: 1200px;
					margin: 0 auto;
					padding: 32px 16px 56px;
				}
				.search-hero {
					background: linear-gradient(135deg, #151517 0%, #232326 100%);
					border: 1px solid rgba(255,255,255,0.06);
					border-radius: 24px;
					padding: 24px 28px;
					box-shadow: 0 24px 60px rgba(0,0,0,0.28);
					margin-bottom: 24px;
				}
				.search-hero small,
				.search-hero h1,
				.search-hero p {
					color: #fff;
				}
				.search-hero small {
					display: inline-block;
					font-size: 12px;
					letter-spacing: .08em;
					text-transform: uppercase;
					color: rgba(255,255,255,0.58);
					margin-bottom: 10px;
				}
				.search-hero h1 {
					font-size: 28px;
					line-height: 36px;
					margin-bottom: 8px;
				}
				.search-hero p {
					font-size: 15px;
					line-height: 24px;
					color: rgba(255,255,255,0.72);
				}
				.search-results-shell {
					background: linear-gradient(180deg, rgba(28,28,31,0.96) 0%, rgba(18,18,21,0.98) 100%);
					border-radius: 24px;
					border: 1px solid rgba(255,255,255,0.06);
					padding: 22px;
					box-shadow: 0 24px 60px rgba(0,0,0,0.22);
				}
				.search-toolbar {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 14px;
					flex-wrap: wrap;
					margin-bottom: 18px;
				}
				.search-toolbar-label {
					font-size: 14px;
					line-height: 20px;
					color: rgba(255,255,255,0.72);
				}
				.search-sort-select {
					min-width: 220px;
					height: 42px;
					border-radius: 12px;
					border: 1px solid rgba(255,255,255,0.08);
					background: rgba(255,255,255,0.06);
					color: #fff;
					padding: 0 14px;
					font-size: 14px;
				}
				.search-sort-select option {
					color: #111;
				}
				.search-results-shell .owl-stage-outer {
					overflow: hidden;
					border-radius: 18px;
				}
				.search-results-shell .owl-stage {
					display: grid;
					grid-template-columns: repeat(4, minmax(0, 1fr));
					gap: 16px;
				}
				.search-card {
					display: flex;
					flex-direction: column;
					height: 100%;
					background: linear-gradient(180deg, #323236 0%, #29292c 100%);
					border-radius: 20px;
					padding: 16px;
					border: 1px solid rgba(255,255,255,0.04);
					transition: transform .25s ease, box-shadow .25s ease;
				}
				.search-card:hover {
					transform: translateY(-4px);
					box-shadow: -4px -4px 8px rgba(134,134,134,.11), 8px 12px 24px rgba(0,0,0,.28);
				}
				.search-card-image {
					display: flex;
					align-items: center;
					justify-content: center;
					min-height: 200px; /* slightly bigger */
					margin-bottom: 12px;
				}
				.search-card-image img {
					max-width: 100%;
					max-height: 200px; /* slightly bigger */
					object-fit: contain;
				}
				.search-card-title {
					font-size: 15px;
					line-height: 22px;
					color: #fff;
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
					overflow: hidden;
					min-height: 44px;
					margin-bottom: 8px;
				}
				.search-card-meta {
					color: #9ba0a8;
					font-size: 13px;
					line-height: 18px;
					margin-bottom: 10px;
				}
				.search-card-price {
					margin-top: auto;
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}
				.search-card-price b {
					font-size: 20px;
					line-height: 24px;
					color: #fff;
				}
				.search-card-price strike {
					font-size: 14px;
					line-height: 18px;
					color: #8f949c;
				}
				.search-pagination {
					display: flex;
					flex-wrap: wrap;
					justify-content: center;
					gap: 10px;
					margin-top: 22px;
				}
				.search-pagination button {
					min-width: 42px;
					height: 42px;
					border-radius: 999px;
					border: 1px solid rgba(255,255,255,0.08);
					background: rgba(255,255,255,0.06);
					color: #fff;
					cursor: pointer;
					font-weight: 600;
				}
				.search-pagination button.is-active {
					background: #fff;
					color: #161616;
				}
				.search-load-more {
					margin-top: 18px;
				}
				.load-more-btn {
					background: rgba(255,255,255,0.06);
					border: 1px solid rgba(255,255,255,0.08);
					color: #fff;
					padding: 12px 18px;
					border-radius: 12px;
					cursor: pointer;
					font-weight: 700;
				}
				.load-more-btn:hover {
					background: rgba(255,255,255,0.12);
				}
				.search-empty,
				.search-loading {
					padding: 28px 4px 8px;
					text-align: center;
					color: #d8dbe0;
				}
				.search-empty p,
				.search-loading p {
					color: #d8dbe0;
				}
				.search-empty p:last-child {
					color: #9ba0a8;
					margin-top: 8px;
				}
				@media (max-width: 1023px) {
					.search-page {
						max-width: 640px;
						padding: 18px 10px 36px;
					}
					.search-hero {
						border-radius: 18px;
						padding: 18px 16px;
					}
					.search-hero h1 {
						font-size: 22px;
						line-height: 28px;
					}
					.search-results-shell {
						border-radius: 18px;
						padding: 12px;
					}
					.search-toolbar {
						align-items: stretch;
						margin-bottom: 14px;
					}
					.search-sort-select {
						width: 100%;
						min-width: 0;
					}
					.search-results-shell .owl-stage {
						grid-template-columns: repeat(2, minmax(0, 1fr));
						gap: 10px;
					}
					.search-card {
						border-radius: 14px;
						padding: 12px;
					}
					.search-card-image {
						min-height: 140px;
					}
					.search-card-image img {
						max-height: 140px;
					}
					.search-card-title {
						font-size: 14px;
						line-height: 20px;
						min-height: 40px;
					}
					.search-card-meta {
						font-size: 12px;
					}
					.search-card-price b {
						font-size: 17px;
						line-height: 22px;
					}
				}
			`}</style>
			<div className="search-page">
				<div className="search-hero">
					<small>Tìm kiếm SQHOME</small>
					<h1>{getSearchTitle(activeKeyword, items.length)}</h1>
					<p>
					</p>
				</div>

				<div className="search-results-shell" ref={resultsTopRef}>
					<div className="search-toolbar">
						<div className="search-toolbar-label">
							Sắp xếp hiển thị sản phẩm theo lựa chọn của bạn
						</div>
						<select
							className="search-sort-select"
							value={sortOption}
							onChange={(event) => setSortOption(event.target.value)}
						>
							<option value="relevance">Độ chính xác</option>
							<option value="price-asc">Giá thấp đến cao</option>
							<option value="price-desc">Giá cao đến thấp</option>
						</select>
					</div>

					{isLoading ? (
						<div className="search-loading">
							<p>Đang tìm sản phẩm phù hợp với từ khóa <strong>{activeKeyword}</strong>...</p>
						</div>
					) : items.length > 0 ? (
						<>
							<div className="owl-stage-outer dragging">
								<div className="owl-stage">
									{visibleItems.map((item, index) => {
										const productUrl = item?.url || `/san-pham/${item?.slug || item?.id || index}`
										const salePrice = formatPrice(item?.sale_price || item?.price)
										const regularPrice = formatPrice(item?.regular_price)
										const categories = Array.isArray(item?.categories) ? item.categories.filter(Boolean) : []

										return (
											<Link to={productUrl} className="search-card" key={item?.id || `${item?.slug || 'search-item'}-${index}`}>
												<div className="search-card-image" style={{ position: 'relative' }}>
													<img src={item?.image} alt={item?.name} />
													{Array.isArray(item?.san_pham_qua_tang) && item.san_pham_qua_tang.length ? (
														<div className="nen" aria-hidden="true">
															<span className="chu" style={{ color: "black" }}>
																🎁 Tặng quà
															</span>
														</div>
													) : null}
												</div>
												<div className="search-card-title">{item?.name}</div>
												<div className="search-card-meta">
													{categories.length > 0 ? categories.join(' • ') : (item?.sku ? `Mã SP: ${item.sku}` : 'Sản phẩm tại SQHOME')}
												</div>
												<div className="search-card-price">
													<b>{salePrice}</b>
													{regularPrice && regularPrice !== salePrice ? <strike>{regularPrice}</strike> : null}
												</div>
												<div className="search-card-stock" style={{ fontSize: '11px', marginTop: '4px', color: Number(item?.stock_quantity) > 0 ? '#4ade80' : '#fbbf24' }}>
													{Number(item?.stock_quantity) > 0 ? 'Còn hàng' : 'Liên hệ'}
												</div>
											</Link>
										)
									})}
								</div>
							</div>

							{remainingCount > 0 ? (
								<div className="search-load-more" style={{ textAlign: 'center', marginTop: 18 }}>
									<button
										type="button"
										className="load-more-btn"
										onClick={() => setDisplayCount((prev) => {
											// first click: expand to batchSize (100) if currently less than batchSize
											if (prev < batchSize) {
												return Math.min(batchSize, sortedItems.length)
											}
											// subsequent clicks: add another batchSize
											return Math.min(prev + batchSize, sortedItems.length)
										})}
									>
										Xem thêm {remainingCount} sản phẩm
									</button>
								</div>
							) : null}
						</>
					) : (
						<div className="search-empty">
							<p>Chưa có sản phẩm phù hợp với từ khóa <strong>{activeKeyword || 'bạn nhập'}</strong>.</p>
							<p>Thử rút gọn từ khóa hoặc nhập theo tên sản phẩm / mã hàng để kết quả chính xác hơn.</p>
						</div>
					)}
				</div>
			</div>
		</section>
	)
}
