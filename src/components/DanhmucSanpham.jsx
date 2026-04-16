import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { buildApiUrl } from '../utils/api'
import { buildAbsoluteUrl, getSeoDescription, getSeoTitle, useSeo } from '../utils/seo'

const formatPrice = (value) => {
	if (value === null || value === undefined || value === "") return "";
	if (typeof value === "string" && value.includes("₫")) return value;
	const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, "")));
	if (isNaN(numValue)) return value;
	return `${numValue.toLocaleString("vi-VN")}₫`;
};

const SORT_OPTIONS = [
	{ value: 'newest', label: 'Mới nhất' },
	{ value: 'featured', label: 'Nổi bật' },
	{ value: 'price_asc', label: 'Giá tăng dần' },
	{ value: 'price_desc', label: 'Giá giảm dần' },
]

const normalizeProductUrl = (item) => item?.url || `/san-pham/${item?.slug || item?.id || ''}`

const normalizeSubcategories = (subcategories) => {
	const source = Array.isArray(subcategories) ? subcategories : []
	if (!source) return []

	return source
		.map((item, index) => {
			if (!item) return null
			if (typeof item === 'string') {
				return {
					id: `subcategory-${index}`,
					name: item,
					slug: item,
				}
			}

			return {
				id: item.id || `subcategory-${index}`,
				name: item.name || item.label || item.title || item.slug || `Loại ${index + 1}`,
				slug: item.slug || item.value || item.name || '',
			}
		})
		.filter((term) => term?.slug)
}

export default function DanhmucSanpham() {
	// initial 9 items, first load expands to 100, subsequent loads add 100
	const initialDisplay = 9
	const batchSize = 100
	const [displayCount, setDisplayCount] = useState(initialDisplay)
	const { slug = '' } = useParams()
	const decodedSlug = useMemo(() => decodeURIComponent(slug).trim(), [slug])
	const [searchParams, setSearchParams] = useSearchParams()
	const [categoryData, setCategoryData] = useState({ category: null, items: [], filters: null, total: 0 })
	const [seoData, setSeoData] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isTransitioning, setIsTransitioning] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	// pagination by page removed; using displayCount/load-more instead
	const productGridRef = useRef(null)
	const hasInitializedScrollRef = useRef(false)

	const sortValue = searchParams.get('sort') || null
	const selectedChildSlug =
		searchParams.get('child_slug') ||
		searchParams.get('product_type_slug') ||
		searchParams.get('loai_slug') ||
		''
	const selectedPriceMin = searchParams.get('price_min') ? parseInt(searchParams.get('price_min')) : null
	const selectedPriceMax = searchParams.get('price_max') ? parseInt(searchParams.get('price_max')) : null
	const [showFilterPanel, setShowFilterPanel] = useState(false)

	useEffect(() => {
		if (!decodedSlug || typeof window === 'undefined') return undefined

		const scrollToTop = () => {
			window.scrollTo({
				top: 0,
				left: 0,
				behavior: 'smooth',
			})

			document.documentElement.scrollTop = 0
			document.body.scrollTop = 0
		}

		hasInitializedScrollRef.current = false
		scrollToTop()
		const rafId = window.requestAnimationFrame(scrollToTop)
		const timeoutId = window.setTimeout(scrollToTop, 180)

		return () => {
			window.cancelAnimationFrame(rafId)
			window.clearTimeout(timeoutId)
		}
	}, [decodedSlug])

	useEffect(() => {
		let isMounted = true
		const controller = new AbortController()

		if (!decodedSlug) {
			setCategoryData({ category: null, items: [], filters: null, total: 0 })
			setIsLoading(false)
			return () => controller.abort()
		}

		setIsLoading(true)
		setIsTransitioning(true)
		setErrorMessage('')

		if (typeof window !== 'undefined') {
			window.scrollTo({
				top: 0,
				behavior: 'smooth',
			})
		}

		axios
			.get(buildApiUrl(`/get/danhmuc/${encodeURIComponent(decodedSlug)}`), {
				signal: controller.signal,
				params: {
					sort: sortValue || undefined,
					child_slug: selectedChildSlug || undefined,
				},
			})
			.then((response) => {
				if (!isMounted) return
				const data = response?.data || {}
				setCategoryData({
					category: data?.category || null,
					items: Array.isArray(data?.items) ? data.items : [],
					filters: data?.filters || null,
					total: Number(data?.total || 0),
				})
			})
			.catch((error) => {
				if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
				console.error('Category API error:', error)
				if (isMounted) {
					setCategoryData({ category: null, items: [], filters: null, total: 0 })
					setErrorMessage('Không tải được danh mục lúc này. Vui lòng thử lại sau.')
				}
			})
			.finally(() => {
				if (isMounted) {
					setIsLoading(false)
					window.setTimeout(() => {
						if (isMounted) setIsTransitioning(false)
					}, 220)
				}
			})

		return () => {
			isMounted = false
			controller.abort()
		}
	}, [decodedSlug, selectedChildSlug, sortValue])

	useEffect(() => {
		let isMounted = true
		const controller = new AbortController()

		if (!decodedSlug) {
			setSeoData(null)
			return () => controller.abort()
		}

		axios
			.get(buildApiUrl(`/get/seo/danhmuc/${encodeURIComponent(decodedSlug)}`), {
				signal: controller.signal,
				withCredentials: true,
			})
			.then((response) => {
				if (!isMounted) return
				setSeoData(response?.data || null)
			})
			.catch((error) => {
				if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
				console.error('Category SEO API error:', error)
				if (isMounted) setSeoData(null)
			})

		return () => {
			isMounted = false
			controller.abort()
		}
	}, [decodedSlug])

	const category = categoryData.category
	const items = Array.isArray(categoryData.items) ? categoryData.items : []
	const filters = categoryData.filters || {}
	const subcategories = normalizeSubcategories(filters?.subcategories)
	const priceRanges = filters?.price_ranges || []
	const effectiveSelectedChildSlug = filters?.selected_child_slug || selectedChildSlug
	const categoryDescription = String(category?.description || '').trim()
	const visibleItems = useMemo(() => {
		let result = items
		if (selectedPriceMin !== null) {
			result = result.filter(item => {
				const price = parseFloat(item?.price || item?.sale_price || 0)
				return price >= selectedPriceMin
			})
		}
		if (selectedPriceMax !== null) {
			result = result.filter(item => {
				const price = parseFloat(item?.price || item?.sale_price || 0)
				return price <= selectedPriceMax
			})
		}
		return result.slice(0, displayCount)
	}, [items, displayCount, selectedPriceMin, selectedPriceMax])
	const filteredTotal = useMemo(() => {
		let result = items
		if (selectedPriceMin !== null) {
			result = result.filter(item => (parseFloat(item?.price || item?.sale_price || 0)) >= selectedPriceMin)
		}
		if (selectedPriceMax !== null) {
			result = result.filter(item => (parseFloat(item?.price || item?.sale_price || 0)) <= selectedPriceMax)
		}
		return result.length
	}, [items, selectedPriceMin, selectedPriceMax])
	const remainingCount = Math.max(0, filteredTotal - displayCount)
	const sanitizedCategoryDescription = useMemo(() => {
		if (!categoryDescription) return ''
		return categoryDescription
	}, [categoryDescription])

	useSeo(
		useMemo(() => {
			const seo = seoData?.seo || {}
			const fallbackTitle = category?.name ? `${category.name} | Danh mục sản phẩm SQHOME` : 'Danh mục sản phẩm SQHOME'
			const fallbackDescription =
				sanitizedCategoryDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
				'Tham khảo danh mục sản phẩm SQHOME với nhiều lựa chọn thiết bị vệ sinh chính hãng, giá tốt và thông tin rõ ràng.'

			return {
				title: getSeoTitle(seo.title, seoData?.title || fallbackTitle),
				description: getSeoDescription(seo.description, fallbackDescription),
				canonical: seo.canonical || buildAbsoluteUrl(`/danh-muc-san-pham/${decodedSlug}`),
			}
		}, [category?.name, decodedSlug, sanitizedCategoryDescription, seoData])
	)

	useEffect(() => {
		// reset shown count when category/filters/sort changes
		setDisplayCount(initialDisplay)
	}, [decodedSlug, selectedChildSlug, sortValue, selectedPriceMin, selectedPriceMax])


	useEffect(() => {
		if (typeof window === 'undefined') return
		if (!productGridRef.current) return
		if (!hasInitializedScrollRef.current) {
			hasInitializedScrollRef.current = true
			return
		}

		const headerElement = document.querySelector('header.sticky, .sticky')
		const headerOffset = headerElement instanceof HTMLElement ? headerElement.offsetHeight : 0
		const extraOffset = window.innerWidth <= 1023 ? 138 : 26 // tăng offset cho mobile
		const targetTop = productGridRef.current.getBoundingClientRect().top + window.scrollY - headerOffset - extraOffset

		window.scrollTo({
			top: Math.max(0, targetTop),
			behavior: 'smooth',
		})
	}, [selectedChildSlug, sortValue])

	const handleSortChange = (nextSort) => {
		setIsTransitioning(true)
		const nextParams = new URLSearchParams(searchParams)
		if (!nextSort || nextSort === 'default') nextParams.delete('sort')
		else nextParams.set('sort', nextSort)
		setSearchParams(nextParams)
	}

	const handleChildSlugChange = (childSlug) => {
		setIsTransitioning(true)
		const nextParams = new URLSearchParams(searchParams)
		if (!childSlug) {
			nextParams.delete('child_slug')
			nextParams.delete('product_type_slug')
			nextParams.delete('loai_slug')
		} else {
			nextParams.set('child_slug', childSlug)
			nextParams.delete('product_type_slug')
			nextParams.delete('loai_slug')
		}
		setSearchParams(nextParams)
	}

	const handlePriceRangeChange = (range) => {
		setIsTransitioning(true)
		const nextParams = new URLSearchParams(searchParams)
		if (!range) {
			nextParams.delete('price_min')
			nextParams.delete('price_max')
		} else {
			nextParams.set('price_min', String(range.min))
			nextParams.set('price_max', String(range.max))
		}
		setSearchParams(nextParams)
	}

	const handleCloseFilterPanel = () => setShowFilterPanel(false)

	const clearAllFilters = () => {
		const nextParams = new URLSearchParams()
		setSearchParams(nextParams)
	}



	return (
		<section>
			<style>{`
				.category-page {
					max-width: 1280px;
					margin: 0 auto;
					padding: 24px 16px 56px;
				}
				.category-shell {
				}
				.category-heading {
					text-align: center;
					margin-bottom: 18px;
				}
				.category-heading h1 {
					color: #fff;
					font-size: 38px;
					line-height: 44px;
					font-weight: 700;
					margin-bottom: 10px;
				}
				.category-heading p {
					color: rgba(255,255,255,0.7);
					font-size: 14px;
					line-height: 20px;
				}
				.category-heading .category-description-html,
				.category-hero-copy .category-description-html {
					color: rgba(255,255,255,0.78);
				}
				.category-description-html p,
				.category-description-html div,
				.category-description-html span,
				.category-description-html li {
					color: inherit;
					line-height: 24px;
				}
				.category-description-html a {
					color: #fff;
					text-decoration: underline;
				}
				.category-description-html ul,
				.category-description-html ol {
					padding-left: 18px;
					margin: 8px 0;
				}
				.category-hero {
					position: relative;
					border-radius: 24px;
					overflow: hidden;
					min-height: 224px;
					background: linear-gradient(135deg, #100f10 0%, #262224 48%, #111111 100%);
					border: 1px solid rgba(255,255,255,0.06);
					padding: 28px 34px;
					display: grid;
					grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
					gap: 18px;
					align-items: center;
					margin-bottom: 14px;
				}
				.category-hero::before {
					content: '';
					position: absolute;
					inset: 0;
					background: radial-gradient(circle at left center, rgba(255, 111, 0, 0.2), transparent 38%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 34%);
					pointer-events: none;
				}
				.category-hero-copy,
				.category-hero-visual {
					position: relative;
					z-index: 1;
				}
				.category-hero-kicker {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					padding: 7px 12px;
					border-radius: 999px;
					background: rgba(255,255,255,0.08);
					color: rgba(255,255,255,0.78);
					font-size: 12px;
					margin-bottom: 14px;
				}
				.category-hero-copy h2 {
					color: #fff;
					font-size: 34px;
					line-height: 42px;
					margin-bottom: 12px;
				}
				.category-hero-copy p {
					max-width: 540px;
					color: rgba(255,255,255,0.78);
					font-size: 15px;
					line-height: 24px;
				}
				.category-hero-stats {
					display: flex;
					gap: 12px;
					flex-wrap: wrap;
					margin-top: 18px;
				}
				.category-hero-stats span {
					display: inline-flex;
					align-items: center;
					padding: 8px 12px;
					border-radius: 14px;
					background: rgba(255,255,255,0.08);
					color: #fff;
					font-size: 13px;
				}
				.category-hero-visual {
						display: flex;
						justify-content: stretch;
						align-items: stretch;
						width: 100%;
						height: 100%;
				}
				

.category-hero-device {
	width: 100%;
	height: 100%;
	min-height: 340px;
	border-radius: 26px;
	padding: 0;
	display: flex;
	align-items: stretch;
	justify-content: stretch;
}
				.category-hero-device img {
							width: 100%;
							height: auto;
							max-height: 320px;
							object-fit: contain;
							border-radius: 26px;
							box-shadow: 0 18px 32px rgba(0,0,0,0.34);
				}
				
				
				.category-chip,
				.category-filter-trigger {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					min-height: 34px;
					padding: 0 14px;
					border-radius: 10px;
					border: 1px solid rgba(255,255,255,0.1);
					background: rgba(30,30,31,0.72);
					color: #f2f2f2;
					font-size: 13px;
					font-weight: 600;
					transition: transform .2s ease, background .2s ease, border-color .2s ease, opacity .2s ease;
				}
				.category-chip:hover,
				.category-filter-trigger:hover {
					transform: translateY(-1px);
				}
				.category-filter-trigger.has-price-filter {
					border-color: #0066B3;
					color: #00a8ff;
				}
				.category-filter-badge {
					display: inline-block;
					width: 6px;
					height: 6px;
					border-radius: 50%;
					background: #0066B3;
					margin-left: 6px;
				}

				/* Filter Overlay */
				.category-filter-overlay {
					position: fixed;
					inset: 0;
					background: rgba(0,0,0,0.55);
					z-index: 999;
					animation: fadeInOverlay .2s ease;
				}
				@keyframes fadeInOverlay {
					from { opacity: 0; }
					to { opacity: 1; }
				}

				/* Filter Panel */
				.category-filter-panel {
					position: fixed;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					width: min(480px, calc(100vw - 32px));
					max-height: 70vh;
					background: #1a1a1f;
					border-radius: 20px;
					box-shadow: 0 24px 80px rgba(0,0,0,0.5);
					z-index: 1000;
					overflow-y: auto;
					animation: filterPanelIn .25s cubic-bezier(0.22, 1, 0.36, 1);
				}
				@keyframes filterPanelIn {
					from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)) scale(0.95); }
					to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
				}
				.category-filter-panel__header {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 18px 20px;
					border-bottom: 1px solid rgba(255,255,255,0.07);
					position: sticky;
					top: 0;
					background: #1a1a1f;
					z-index: 1;
				}
				.category-filter-panel__header > span {
					font-size: 16px;
					font-weight: 700;
					color: #f1f5f9;
					flex: 1;
				}
				.category-filter-clear {
					font-size: 13px;
					color: #ef4444;
					background: none;
					border: none;
					cursor: pointer;
					padding: 4px 8px;
					border-radius: 6px;
					transition: background 0.15s;
				}
				.category-filter-clear:hover { background: rgba(239,68,68,0.1); }
				.category-filter-panel__close {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 32px;
					height: 32px;
					border-radius: 50%;
					border: none;
					background: rgba(255,255,255,0.07);
					color: #94a3b8;
					cursor: pointer;
					flex-shrink: 0;
					transition: background 0.15s;
				}
				.category-filter-panel__close:hover { background: rgba(255,255,255,0.12); color: #f1f5f9; }

				/* Filter Sections */
				.category-filter-section {
					padding: 16px 20px;
					border-bottom: 1px solid rgba(255,255,255,0.05);
				}
				.category-filter-section:last-child { border-bottom: none; }
				.category-filter-section__title {
					font-size: 13px;
					font-weight: 700;
					color: #94a3b8;
					text-transform: uppercase;
					letter-spacing: 0.06em;
					margin-bottom: 12px;
				}
				.category-filter-price-grid {
					display: flex;
					flex-wrap: wrap;
					gap: 8px;
				}
				.category-filter-price-chip {
					display: inline-flex;
					align-items: center;
					padding: 8px 14px;
					border-radius: 10px;
					border: 1px solid rgba(255,255,255,0.1);
					background: rgba(255,255,255,0.04);
					color: #cbd5e1;
					font-size: 13px;
					font-weight: 500;
					cursor: pointer;
					transition: background 0.15s, border-color 0.15s, color 0.15s;
				}
				.category-filter-price-chip:hover {
					background: rgba(255,255,255,0.08);
					border-color: rgba(255,255,255,0.2);
					color: #f1f5f9;
				}
				.category-filter-price-chip.is-active {
					background: #0066B3;
					border-color: #0066B3;
					color: #fff;
					font-weight: 600;
				}

				.category-chip.is-active {
					background: #5a5a5c;
					border-color: rgba(255,255,255,0.18);
				}
				.category-toolbar {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 16px;
					flex-wrap: wrap;
					margin: 10px 0 18px;
				}
				.category-chip-row {
					display: flex;
					gap: 8px;
					flex-wrap: nowrap;
					margin-bottom: 12px;
					overflow-x: auto;
					-webkit-overflow-scrolling: touch;
					max-width: 100vw;
				}
				.category-chip-row > * {
					flex: 0 0 auto;
				}

				.category-toolbar-left {
					display: flex;
					align-items: center;
					gap: 12px;
					flex-wrap: nowrap;
					color: rgba(255,255,255,0.75);
					font-size: 13px;
					overflow-x: auto;
					-webkit-overflow-scrolling: touch;
					max-width: 100vw;
				}
				.category-toolbar-left > * {
					flex: 0 0 auto;
				}
				}
				.category-toolbar-right {
					display: flex;
					align-items: center;
					gap: 10px;
					flex-wrap: wrap;
				}
				.category-select {
					height: 38px;
					border-radius: 10px;
					border: 1px solid rgba(255,255,255,0.12);
					background: rgba(30,30,31,0.75);
					color: #f2f2f2;
					padding: 0 14px;
					font-size: 13px;
				}
				.category-select option {
					color: #111;
				}
				.category-grid {
					display: grid;
					grid-template-columns: repeat(3, minmax(0, 1fr));
					gap: 16px;
					transition: opacity .24s ease, transform .24s ease, filter .24s ease;
				}
				.category-grid.is-transitioning {
					opacity: .46;
					transform: translateY(8px);
					filter: blur(1.2px);
				}
				.category-card {
					display: flex;
					flex-direction: column;
					justify-content: flex-start;
					min-height: 100%;
					background: linear-gradient(180deg, #373739 0%, #2a2a2c 100%);
					border-radius: 22px;
					padding: 18px 18px 16px;
					border: 1px solid rgba(255,255,255,0.05);
					box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
					transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
				}
				.category-card:hover {
					transform: translateY(-4px);
					box-shadow: -4px -4px 8px rgba(134,134,134,.08), 10px 16px 28px rgba(0,0,0,.28);
					border-color: rgba(255,255,255,0.12);
				}
				.category-card-media {
					min-height: 210px;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 10px 6px 4px;
				}
				.category-card-media img {
					max-width: 140%;
					max-height: 296px;
					object-fit: contain;
				}
				.category-card-tags {
					display: flex;
					gap: 6px;
					flex-wrap: wrap;
					margin-bottom: 10px;
				}
				.category-card-tags span {
					display: inline-flex;
					align-items: center;
					min-height: 28px;
					padding: 0 10px;
					border-radius: 8px;
					background: rgba(0,0,0,0.24);
					color: #f2f2f2;
					font-size: 12px;
					font-weight: 600;
				}
				.category-gift-item {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 12px;
					margin-top: 12px;
					background: rgba(255,255,255,0.04);
					border: 1px solid rgba(255,255,255,0.08);
					border-radius: 16px;
					box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
				}
				.category-gift-thumb {
					width: 52px;
					height: 52px;
					object-fit: contain;
					border-radius: 12px;
					background: rgba(255,255,255,0.06);
					padding: 6px;
					border: 1px solid rgba(255,255,255,0.08);
					flex-shrink: 0;
				}
				.category-gift-desc {
					flex: 1;
					min-width: 0;
				}
				.category-gift-title {
					color: #f7f7f7;
					font-size: 13px;
					line-height: 18px;
					font-weight: 600;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					margin-bottom: 4px;
					letter-spacing: -0.01em;
				}
				.category-gift-badge {
					display: inline-flex;
					align-items: center;
					padding: 0;
					background: transparent;
					color: rgba(255,255,255,0.62);
					font-size: 10px;
					font-weight: 700;
					text-transform: uppercase;
					letter-spacing: 0.08em;
				}
				.product-gift-tag {
					position: absolute;
					top: 12px;
					right: 12px;
					z-index: 10;
					display: flex;
					align-items: center;
					gap: 6px;
					background: rgba(255, 190, 0, 0.92);
					color: #000;
					padding: 6px 14px;
					font-size: 12px;
					font-weight: 800;
					border-radius: 999px;
					box-shadow: 0 8px 20px rgba(255,190,0,0.3);
					backdrop-filter: blur(8px);
					border: 1px solid rgba(255,255,255,0.25);
					animation: giftTagFloat 3s ease-in-out infinite;
				}
				@keyframes giftTagFloat {
					0%, 100% { transform: translateY(0); }
					50% { transform: translateY(-4px); }
				}
				.category-card h3 {
					color: #fff;
					font-size: 18px;
					line-height: 24px;
					margin-bottom: 10px;
					min-height: 48px;
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
					overflow: hidden;
				}
				.category-card-price {
					display: flex;
					align-items: baseline;
					gap: 8px;
					flex-wrap: wrap;
					margin-bottom: 8px;
				}
				.category-card-price strong {
					color: #fff;
					font-size: 31px;
					line-height: 34px;
					font-weight: 700;
				}
				.category-card-price strike {
					color: rgba(255,255,255,0.4);
					font-size: 15px;
				}
				.category-refund-chip {
					display: inline-flex;
					align-items: center;
					margin-top: 4px;
					padding: 3px 8px;
					border-radius: 8px;
					background: linear-gradient(135deg, #dcfce7, #bbf7d0);
					border: 1px solid rgba(34, 197, 94, 0.3);
				}
				.category-refund-chip span {
					font-size: 12px;
					font-weight: 700;
					color: #15803d;
				}
				.category-card-sub {
					display: flex;
					gap: 8px;
				 flex-wrap: wrap;
					align-items: center;
					color: rgba(255,255,255,0.72);
					font-size: 13px;
				}
				.category-card-sub .is-hot {
					color: #ffcf75;
				}
				.category-loading,
				.category-empty,
				.category-error {
					padding: 30px 12px;
					border-radius: 20px;
					background: rgba(0,0,0,0.16);
					text-align: center;
					color: #fff;
				}
				.category-loading p,
				.category-empty p,
				.category-error p {
					color: rgba(255,255,255,0.76);
				}
				.category-pagination {
					display: flex;
					justify-content: center;
					align-items: center;
					gap: 10px;
					flex-wrap: wrap;
					margin-top: 22px;
				}
				.category-page-btn {
					min-width: 42px;
					height: 42px;
					padding: 0 14px;
					border-radius: 999px;
					border: 1px solid rgba(255,255,255,0.12);
					background: rgba(30,30,31,0.75);
					color: #fff;
					font-size: 13px;
					font-weight: 700;
					transition: transform .2s ease, background .2s ease, border-color .2s ease, opacity .2s ease;
				}
				.category-page-btn:hover:not(:disabled) {
					transform: translateY(-1px);
					background: #4d4d50;
				}
				.category-page-btn.is-active {
					background: #fff;
					color: #151515;
					border-color: #fff;
				}
				.category-page-btn:disabled {
					opacity: .4;
					cursor: not-allowed;
				}
				@media (max-width: 1023px) {
					.category-page {
						padding: 16px 10px 34px;
					}
					.category-chip-row {
						/* display: none; */
					}
					.category-shell {
						padding: 14px 12px 18px;
						border-radius: 22px;
					}
					.category-heading h1 {
						font-size: 28px;
						line-height: 34px;
					}
					.category-hero {
						grid-template-columns: 1fr;
						padding: 18px 16px;
						min-height: 0;
						gap: 14px;
					}
					.category-hero-copy h2 {
						font-size: 24px;
						line-height: 30px;
					}
					.category-hero-visual {
						order: -1;
					}
					.category-hero-device {
						max-width: 250px;
						margin: 0 auto;
					}
					.category-grid {
						grid-template-columns: repeat(2, minmax(0, 1fr));
						gap: 10px;
					}
					.category-card {
						padding: 12px 12px 14px;
						border-radius: 18px;
					}
					.category-card-media {
						min-height: 132px;
					}
					.category-card-media img {
						max-height: 204px;
					}
					.category-card h3 {
						font-size: 15px;
						line-height: 21px;
						min-height: 42px;
					}
					.category-card-price strong {
						font-size: 22px;
						line-height: 25px;
					}
					.category-card-price strike {
						font-size: 13px;
					}
					.category-toolbar {
						align-items: stretch;
					}
					.category-toolbar-right {
						width: 100%;
					}
					.category-select {
						width: 100%;
						min-width: 0;
					}
				}
			`}</style>

			<div className="category-page">
				<div className="category-shell">
					<div className='box-slide' style={{margin: "0"}}>
						<a class="logo-cate  " style={{margin: "5px auto"}}><h2 class="title-text">{category?.name || decodedSlug}</h2></a>
					</div>

					
					<div className="category-banner-container" style={{ marginBottom: "20px" }}>
						{category?.banner || seoData?.banner ? (
							<div className="category-banner-wrapper" style={{ 
								width: '100%', 
								borderRadius: '24px', 
								overflow: 'hidden',
								boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
								border: '1px solid rgba(255,255,255,0.08)'
							}}>
								<img 
									src={category?.banner || seoData?.banner} 
									alt={category?.name || decodedSlug} 
									onLoad={(e) => e.target.style.opacity = 1}
									style={{
										width: '100%',
										height: 'auto',
										maxHeight: '400px',
										objectFit: 'cover',
										display: 'block',
										opacity: 0,
										transition: 'opacity 0.6s ease-in-out'
									}}
								/>
							</div>
						) : null}
					</div>
					<div className="category-chip-row">
						<button
							type="button"
							className={`category-filter-trigger${showFilterPanel ? ' is-active' : ''}${(selectedPriceMin !== null || selectedPriceMax !== null) && !showFilterPanel ? ' has-price-filter' : ''}`}
							onClick={() => setShowFilterPanel(v => !v)}
						>
							<i className={showFilterPanel ? 'is-active' : 'is-default'} />
							{showFilterPanel ? 'Đóng lọc' : 'Lọc'}
							{(selectedPriceMin !== null || selectedPriceMax !== null) && !showFilterPanel && (
								<span className="category-filter-badge" />
							)}
						</button>
						{subcategories.slice(0, 8).map((subcategory, index) => {
							const childSlug = subcategory?.slug || ''
							const label = subcategory?.name || `Loại ${index + 1}`
							return (
								<button
									key={subcategory?.id || `${childSlug}-${index}`}
									type="button"
									className={`category-chip ${effectiveSelectedChildSlug === childSlug ? 'is-active' : ''}`}
									onClick={() => handleChildSlugChange(effectiveSelectedChildSlug === childSlug ? '' : childSlug)}
								>
									{label}
								</button>
							)
						})}
					</div>

					{/* ── Filter Panel ── */}
					{showFilterPanel && (
						<>
							<div className="category-filter-overlay" onClick={handleCloseFilterPanel} />
							<div className="category-filter-panel">
								<div className="category-filter-panel__header">
									<span>Bộ lọc</span>
									{(selectedPriceMin !== null || selectedPriceMax !== null || effectiveSelectedChildSlug) && (
										<button type="button" className="category-filter-clear" onClick={clearAllFilters}>
											Xóa lọc
										</button>
									)}
									<button type="button" className="category-filter-panel__close" onClick={handleCloseFilterPanel} aria-label="Đóng">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
											<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
										</svg>
									</button>
								</div>

								{/* Price Ranges */}
								{priceRanges.length > 0 && (
									<div className="category-filter-section">
										<div className="category-filter-section__title">Khoảng giá</div>
										<div className="category-filter-price-grid">
											{priceRanges.map((range, idx) => {
												const isSelected = selectedPriceMin === range.min && selectedPriceMax === range.max
												return (
													<button
														key={idx}
														type="button"
														className={`category-filter-price-chip${isSelected ? ' is-active' : ''}`}
														onClick={() => {
															handlePriceRangeChange(isSelected ? null : range)
															handleCloseFilterPanel()
														}}
													>
														{formatPrice(range.min)} – {formatPrice(range.max)}
													</button>
												)
											})}
										</div>
									</div>
								)}

								{/* Subcategories in panel */}
								{subcategories.length > 0 && (
									<div className="category-filter-section">
										<div className="category-filter-section__title">Loại sản phẩm</div>
										<div className="category-filter-price-grid">
											{subcategories.map((subcategory, index) => {
												const childSlug = subcategory?.slug || ''
												const label = subcategory?.name || `Loại ${index + 1}`
												const isActive = effectiveSelectedChildSlug === childSlug
												return (
													<button
														key={subcategory?.id || `${childSlug}-${index}`}
														type="button"
														className={`category-filter-price-chip${isActive ? ' is-active' : ''}`}
														onClick={() => {
															handleChildSlugChange(isActive ? '' : childSlug)
														}}
													>
														{label}
													</button>
												)
											})}
										</div>
									</div>
								)}
							</div>
						</>
					)}

					<div className="category-toolbar">
						<div className="category-toolbar-left">
							<span>Sắp xếp theo:</span>
							{SORT_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									className={`category-chip ${sortValue === option.value ? 'is-active' : ''}`}
									onClick={() => handleSortChange(option.value)}
								>
									{option.label}
								</button>
							))}
						</div>

						<div className="category-toolbar-right">
							<select
								className="category-select"
								value={effectiveSelectedChildSlug}
								onChange={(event) => handleChildSlugChange(event.target.value)}
							>
								<option value="">Chọn loại sản phẩm</option>
								{subcategories.map((subcategory, index) => {
									const childSlug = subcategory?.slug || ''
									const label = subcategory?.name || `Loại ${index + 1}`
									return (
										<option key={subcategory?.id || `${childSlug}-${index}`} value={childSlug}>
											{label}
										</option>
									)
								})}
							</select>
						</div>
					</div>

					<div ref={productGridRef} />

					{isLoading ? (
						<div className="category-loading">
							<p>Đang tải danh mục <strong>{category?.name || decodedSlug}</strong>...</p>
						</div>
					) : errorMessage ? (
						<div className="category-error">
							<p>{errorMessage}</p>
						</div>
					) : items.length > 0 ? (
						<>
							<div className={`category-grid ${isTransitioning ? 'is-transitioning' : ''}`}>
							{visibleItems.map((item, index) => {
								const salePrice = formatPrice(item?.sale_price || item?.price)
								const regularPrice = formatPrice(item?.regular_price)
								const tags = [item?.sku, item?.hot ? 'Hot' : null].filter(Boolean)

								return (
									<Link
										to={normalizeProductUrl(item)}
										key={item?.id || `${item?.slug || 'category-item'}-${index}`}
										className="category-card"
									>
										<div className="category-card-media" style={{ position: 'relative' }}>
												<img src={item?.image} alt={item?.name} />
												{Array.isArray(item?.san_pham_qua_tang) && item.san_pham_qua_tang.length ? (
													<div className="product-gift-tag" aria-hidden="true">
														<span>🎁 Tặng quà</span>
													</div>
												) : null}
											</div>
										<div className="category-card-tags">
											{tags.length ? tags.map((tag, tagIndex) => <span key={`${tag}-${tagIndex}`}>{tag}</span>) : <span>SQHOME</span>}
										</div>
																				<h3>{item?.name}</h3>
																			
																				<div className="category-card-price">
											<strong>{salePrice}</strong>
											{regularPrice && regularPrice !== salePrice ? <strike>{regularPrice}</strike> : null}
										</div>
										{Number(item?.refund_amount || 0) > 0 ? (
											<div className="category-refund-chip">
												<span>Hoàn {formatPrice(item?.refund_amount)}</span>
											</div>
										) : null}
										<div className="category-card-stock" style={{ fontSize: '12px', marginTop: '4px', color: Number(item?.stock_quantity) > 0 ? '#4ade80' : '#fbbf24' }}>
											{Number(item?.stock_quantity) > 0 ? 'Còn hàng' : 'Liên hệ'}
										</div>

																				{Array.isArray(item?.san_pham_qua_tang) && item.san_pham_qua_tang.length ? (
																					<div className="category-gift-item" aria-hidden="true">
																						<img className="category-gift-thumb" src={item.san_pham_qua_tang[0]?.image} alt={item.san_pham_qua_tang[0]?.name} />
																						<div className="category-gift-desc">
																							<div className="category-gift-title">{item.san_pham_qua_tang[0]?.name}</div>
																							<span className="category-gift-badge">Quà tặng kèm</span>
																						</div>
																					</div>
																				) : null}
										<div className="category-card-sub">
											{item?.hot ? <span className="is-hot">Online giá rẻ quá</span> : null}
											{!item?.hot && item?.sku ? <span>{item.sku}</span> : null}
										</div>
									</Link>
								)
								})}
							</div>

							{remainingCount > 0 ? (
								<div style={{ textAlign: 'center', marginTop: 18 }}>
									<button
										type="button"
										className="category-page-btn"
										onClick={() => setDisplayCount((prev) => {
											if (prev < batchSize) return Math.min(batchSize, filteredTotal)
											return Math.min(prev + batchSize, filteredTotal)
										})}
									>
										Xem thêm {remainingCount} sản phẩm
									</button>
								</div>
							) : null}
						</>
					) : (
						<div className="category-empty">
							<p>Danh mục này hiện chưa có sản phẩm phù hợp với bộ lọc bạn chọn.</p>
						</div>
					)}
				</div>
			</div>
		</section>
	)
}