import React, { useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buildApiUrl, buildCartRequestConfig, resolveApiBaseUrl, syncCartTokenFromResponse } from '../utils/api'
import { buildAbsoluteUrl, getSeoDescription, getSeoTitle, useSeo } from '../utils/seo'
import OpenAI from "openai";


const formatPrice = (value) => {
	if (value === null || value === undefined || value === "") return "";
	if (typeof value === "string" && value.includes("₫")) return value;
	const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, "")));
	if (isNaN(numValue)) return value;
	return `${numValue.toLocaleString("vi-VN")}₫`;
};

const normalizeProductUrl = (item) => item?.url || `/san-pham/${item?.slug || item?.id || ''}`

const normalizePromotionItems = (value) => {
	if (!value) return []
	if (Array.isArray(value)) return value.flatMap((item) => normalizePromotionItems(item)).filter(Boolean)
	if (typeof value !== 'string') {
		if (value && typeof value === 'object') return normalizePromotionItems(value.title || value.name || value.label || value.content || value.description || '')
		return []
	}
	const trimmed = value.trim()
	if (!trimmed) return []
	const result = []
	const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
	let lastIndex = 0, liMatch, hasLi = false
	while ((liMatch = liRegex.exec(trimmed)) !== null) {
		hasLi = true
		if (liMatch.index > lastIndex) {
			const before = trimmed.substring(lastIndex, liMatch.index).replace(/<[^>]+>/g, '').replace(/'/g, '').trim()
			if (before) result.push({ type: 'text', content: before })
		}
		const liText = liMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/'/g, '').trim()
		if (liText) result.push({ type: 'text', content: liText })
		lastIndex = liMatch.index + liMatch[0].length
	}
	if (hasLi) {
		const after = trimmed.substring(lastIndex).replace(/<[^>]+>/g, '').replace(/'/g, '').trim()
		if (after) result.push({ type: 'text', content: after })
		return result
	}
	const parts = trimmed.split(/\r?\n+|\s{2,}|\|\||<br\s*\/?>|\u2022|•{2,}/).map((p) => p.replace(/^[-*\s]+/, '').replace(/<[^>]+>/g, '').replace(/'/g, '').replace(/\.+$/, '').trim()).filter(Boolean)
	return parts.map((content) => ({ type: 'text', content }))
}

const sanitizeInaxDomainHref = (html) => {
	if (!html) return ''
	return String(html).replace(/href=(['"])(https?:\/\/(?:www\.)?inaxmiennam\.vn)([^'"]*)\1/gi, (match, quote, _domain, path) => `href=${quote}${path || '/'}${quote}`)
}

const getNumericPrice = (item) => {
	const raw = item?.pricing?.sale_price_value ?? item?.pricing?.regular_price_value ?? item?.price_value ?? item?.line_total_value ?? item?.price_sale ?? item?.sale_price ?? item?.price ?? item?.pricing?.sale_price ?? item?.pricing?.regular_price ?? item?.price_old ?? item?.regular_price ?? 0
	if (typeof raw === 'number') return Math.floor(raw)
	let cleaned = String(raw).replace(/[.,]00$/, '')
	if (/[.,]\d{1,2}$/.test(cleaned)) cleaned = cleaned.split(/[.,]/).slice(0, -1).join('')
	const parsed = cleaned.replace(/[^\d]/g, '')
	return parsed ? Number(parsed) : 0
}

const resolveProductId = (item) => {
	const candidates = [item?.product_id, item?.id, item?.id_sanpham, item?.product?.id, item?.product?.product_id]
	const found = candidates.find((value) => value !== undefined && value !== null && value !== '')
	return found ? Number(found) || found : null
}

const deriveOptionGroups = (product) => {
	const optionSources = [product?.options, product?.attributes, product?.variations, product?.thuoc_tinh, product?.option_groups]
	const source = optionSources.find((entry) => Array.isArray(entry) && entry.length > 0)
	if (!source) return []
	return source.map((group, index) => {
		const rawOptions = group?.options || group?.values || group?.items || group?.terms || group?.children || []
		const options = Array.isArray(rawOptions) ? rawOptions.map((option, optionIndex) => {
			if (typeof option === 'string' || typeof option === 'number') return { id: `${group?.name || group?.label || 'option'}-${optionIndex}`, label: String(option), value: String(option) }
			if (option && typeof option === 'object') return { id: option.id || option.slug || `${group?.name || group?.label || 'option'}-${optionIndex}`, label: option.label || option.name || option.value || `Tuỳ chọn ${optionIndex + 1}`, value: option.value || option.slug || option.label || option.name || '', swatch: option.swatch || option.color || option.hex || null }
			return null
		}).filter(Boolean) : []
		if (!options.length) return null
		return { id: group?.id || group?.slug || `${group?.name || group?.label || 'group'}-${index}`, label: group?.label || group?.name || `Tuỳ chọn ${index + 1}`, options }
	}).filter(Boolean)
}

export default function Sanpham() {
	const navigate = useNavigate()
	const { slug = '' } = useParams()
	const decodedSlug = useMemo(() => decodeURIComponent(slug).trim(), [slug])
	const baseUrl = useMemo(() => resolveApiBaseUrl(), [])

	const [product, setProduct] = useState(null)
	const [seoData, setSeoData] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [activeImage, setActiveImage] = useState('')
	const [isPreviewOpen, setIsPreviewOpen] = useState(false)
	const [isImageTransitioning, setIsImageTransitioning] = useState(false)
	const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 })
	const previewTouchRef = useRef({ startDistance: 0, startScale: 1, lastX: 0, lastY: 0 })
	const [flyingImage, setFlyingImage] = useState(null)
	const [selectedRecommendedIds, setSelectedRecommendedIds] = useState([])
	const [quantity, setQuantity] = useState(1)
	const [cartCount, setCartCount] = useState(0)
	const [cartSummary, setCartSummary] = useState(null)
	const [cartMessage, setCartMessage] = useState('')
	const [cartMessageType, setCartMessageType] = useState('success')
	const [isAddingToCart, setIsAddingToCart] = useState(false)
	const [isBuyingNow, setIsBuyingNow] = useState(false)
	const [activeTab, setActiveTab] = useState('thongtin')
	const [aiSpecs, setAiSpecs] = useState(null)
	const [aiSpecsLoading, setAiSpecsLoading] = useState(false)
	const [selectedPromoIndex, setSelectedPromoIndex] = useState(0)
	// Product colors state
	const [productColors, setProductColors] = useState([])
	const [selectedColorId, setSelectedColorId] = useState(null)
	// Countdown timer - đếm ngược đến cuối ngày
	const getTimeUntilEndOfDay = () => {
		const now = new Date()
		const endOfDay = new Date(now)
		endOfDay.setHours(23, 59, 59, 999)
		const diff = endOfDay.getTime() - now.getTime()
		if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 }
		const hours = Math.floor(diff / (1000 * 60 * 60))
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
		const seconds = Math.floor((diff % (1000 * 60)) / 1000)
		return { hours, minutes, seconds }
	}

	const [countdown, setCountdown] = useState(getTimeUntilEndOfDay)
	const [stockRemaining, setStockRemaining] = useState({ current: 10, total: 10 })

	const touchStartRef = useRef(null)
	const touchEndRef = useRef(null)

	const handleTouchStart = (event) => {
		if (!event.touches || !event.touches[0]) return
		const t = event.touches[0]
		touchStartRef.current = { x: t.clientX, y: t.clientY }
		touchEndRef.current = { x: t.clientX, y: t.clientY }
	}
	const handleTouchMove = (event) => {
		if (!event.touches || !event.touches[0]) return
		const t = event.touches[0]
		touchEndRef.current = { x: t.clientX, y: t.clientY }
	}
	const handleTouchEnd = () => {
		const s = touchStartRef.current, e = touchEndRef.current
		if (!s || !e) return
		const dx = e.x - s.x, absDx = Math.abs(dx), absDy = Math.abs(e.y - s.y)
		if (absDx > 50 && absDx > absDy) { if (dx < 0) handleNextImage(); else handlePrevImage() }
		touchStartRef.current = null; touchEndRef.current = null
	}

	// Preview zoom handlers
	const getDistance = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
	const lastTapRef = useRef({ time: 0, x: 0, y: 0 })

	const handlePreviewTouchStart = (e) => {
		const touch = e.touches[0]
		const now = Date.now()

		// Double tap detection
		if (e.touches.length === 1) {
			const timeDiff = now - lastTapRef.current.time
			const xDiff = Math.abs(touch.clientX - lastTapRef.current.x)
			const yDiff = Math.abs(touch.clientY - lastTapRef.current.y)

			if (timeDiff < 300 && xDiff < 30 && yDiff < 30) {
				// Double tap - toggle zoom
				e.preventDefault()
				setZoomState(prev => ({
					scale: prev.scale > 1 ? 1 : 2,
					x: 0,
					y: 0
				}))
				lastTapRef.current = { time: 0, x: 0, y: 0 }
				return
			}
			lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY }
		}

		if (e.touches.length === 2) {
			e.preventDefault()
			const [t1, t2] = e.touches
			previewTouchRef.current.startDistance = getDistance(t1, t2)
			previewTouchRef.current.startScale = zoomState.scale
			previewTouchRef.current.lastX = zoomState.x
			previewTouchRef.current.lastY = zoomState.y
		} else if (e.touches.length === 1) {
			previewTouchRef.current.lastX = touch.clientX - zoomState.x
			previewTouchRef.current.lastY = touch.clientY - zoomState.y
		}
	}

	const handlePreviewTouchMove = (e) => {
		if (e.touches.length === 2) {
			e.preventDefault()
			const [t1, t2] = e.touches
			const dist = getDistance(t1, t2)
			const newScale = Math.max(1, Math.min(4, previewTouchRef.current.startScale * (dist / previewTouchRef.current.startDistance)))
			setZoomState(prev => ({ ...prev, scale: newScale }))
		} else if (e.touches.length === 1 && zoomState.scale > 1) {
			e.preventDefault()
			const touch = e.touches[0]
			const maxX = (zoomState.scale - 1) * window.innerWidth / 2
			const maxY = (zoomState.scale - 1) * window.innerHeight / 2
			const newX = Math.max(-maxX, Math.min(maxX, touch.clientX - previewTouchRef.current.lastX))
			const newY = Math.max(-maxY, Math.min(maxY, touch.clientY - previewTouchRef.current.lastY))
			setZoomState(prev => ({ ...prev, x: newX, y: newY }))
		}
	}

	const handlePreviewMouseDown = (e) => {
		if (zoomState.scale > 1) {
			e.preventDefault()
			previewTouchRef.current.lastX = e.clientX - zoomState.x
			previewTouchRef.current.lastY = e.clientY - zoomState.y
		}
	}

	const handlePreviewMouseMove = (e) => {
		if (zoomState.scale > 1 && e.buttons === 1) {
			e.preventDefault()
			const maxX = (zoomState.scale - 1) * window.innerWidth / 2
			const maxY = (zoomState.scale - 1) * window.innerHeight / 2
			const newX = Math.max(-maxX, Math.min(maxX, e.clientX - previewTouchRef.current.lastX))
			const newY = Math.max(-maxY, Math.min(maxY, e.clientY - previewTouchRef.current.lastY))
			setZoomState(prev => ({ ...prev, x: newX, y: newY }))
		}
	}

	const handlePreviewWheel = (e) => {
		e.preventDefault()
		const delta = e.deltaY > 0 ? -0.3 : 0.3
		setZoomState(prev => {
			const newScale = Math.max(1, Math.min(4, prev.scale + delta))
			return { scale: newScale, x: newScale === 1 ? 0 : prev.x, y: newScale === 1 ? 0 : prev.y }
		})
	}

	const handlePreviewClick = (e) => {
		if (zoomState.scale > 1) {
			setZoomState({ scale: 1, x: 0, y: 0 })
		} else {
			setZoomState({ scale: 2, x: 0, y: 0 })
		}
	}

	const handlePreviewClose = () => { setIsPreviewOpen(false); setZoomState({ scale: 1, x: 0, y: 0 }) }

	useEffect(() => {
		let isMounted = true; const controller = new AbortController()
		if (!decodedSlug) { setProduct(null); setIsLoading(false); return () => controller.abort() }
		setIsLoading(true)
		axios.get(buildApiUrl(`/get/sanpham/${encodeURIComponent(decodedSlug)}`), { signal: controller.signal })
			.then((response) => {
				if (!isMounted) return
				const nextProduct = response?.data || null
				setProduct(nextProduct)
				setActiveImage(nextProduct?.image || nextProduct?.media?.featured_image || nextProduct?.gallery?.[0]?.image || '')
			})
			.catch((error) => { if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') { console.error('Product detail API error:', error); if (isMounted) setProduct(null) } })
			.finally(() => { if (isMounted) setIsLoading(false) })
		return () => { isMounted = false; controller.abort() }
	}, [baseUrl, decodedSlug])

	// Fetch product colors (REPLACED BY INTEGRATED VARIANTS IN MAIN API)
	const variants = useMemo(() => product?.variants || [], [product])
	
	useEffect(() => {
		if (product?.id) {
			setSelectedColorId(product.id)
		}
	}, [product?.id])

	// Combined gallery images - merge product gallery with color gallery (NO LONGER NEEDED AS EACH VARIANT IS A FULL PRODUCT)
	const colorGalleryImages = []

	useEffect(() => {
		let isMounted = true; const controller = new AbortController()
		if (!decodedSlug) { setSeoData(null); return () => controller.abort() }
		axios.get(buildApiUrl(`/get/seo/sanpham/${encodeURIComponent(decodedSlug)}`), { signal: controller.signal, withCredentials: true })
			.then((response) => { if (!isMounted) return; setSeoData(response?.data || null) })
			.catch((error) => { if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return; console.error('Product SEO API error:', error); if (isMounted) setSeoData(null) })
			return () => { isMounted = false; controller.abort() }
	}, [decodedSlug])

	useSeo(useMemo(() => {
		const seo = seoData?.seo || {}
		const fallbackTitle = product?.name ? `${product.name} | SQHOME` : 'Chi tiết sản phẩm SQHOME'
		const fallbackDescription = String(product?.description || product?.short_description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'Chi tiết sản phẩm SQHOME.'
		return { title: getSeoTitle(seo.title, seoData?.title || fallbackTitle), description: getSeoDescription(seo.description, fallbackDescription), canonical: seo.canonical || buildAbsoluteUrl(`/san-pham/${decodedSlug}`) }
	}, [decodedSlug, product?.description, product?.name, product?.short_description, seoData]))

	useEffect(() => {
		if (!decodedSlug || typeof window === 'undefined') return undefined
		const scrollToTop = () => { window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); document.documentElement.scrollTop = 0; document.body.scrollTop = 0 }
		scrollToTop()
		const rafId = window.requestAnimationFrame(scrollToTop)
		const timeoutId = window.setTimeout(scrollToTop, 180)
		return () => { window.cancelAnimationFrame(rafId); window.clearTimeout(timeoutId) }
	}, [decodedSlug])

	// Countdown timer - đếm ngược đến cuối ngày, reset mỗi ngày
	useEffect(() => {
		const tick = () => setCountdown(getTimeUntilEndOfDay())
		tick()
		const timer = setInterval(tick, 1000)
		return () => clearInterval(timer)
	}, [])

	const pad = (n) => String(n).padStart(2, '0')

	useEffect(() => {
		const controller = new AbortController()
		axios.get(buildApiUrl('/get/cart/count'), { ...buildCartRequestConfig({ signal: controller.signal }) })
			.then((response) => { syncCartTokenFromResponse(response?.data); setCartCount(Number(response?.data?.total_quantity || 0)) })
			.catch((error) => { if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') console.error('Cart count API error:', error) })
		return () => controller.abort()
	}, [baseUrl])

	const galleryImages = useMemo(() => {
		if (!product) return []
		const rawGallery = [...(Array.isArray(product.gallery) ? product.gallery : []), ...(Array.isArray(product?.media?.gallery) ? product.media.gallery : [])]
		const featuredImage = product?.image || product?.media?.featured_image
		
		// Merge with color gallery if a color is selected
		let merged = featuredImage ? [{ id: 'featured', image: featuredImage }, ...rawGallery] : rawGallery
		if (colorGalleryImages.length > 0) {
			// If color has gallery, use only color gallery (no mixing)
			merged = colorGalleryImages.map((img, index) => ({ id: `color-gallery-${index}`, image: img }))
		}
		
		const uniqueMap = new Map()
		merged.forEach((item, index) => { const image = item?.image || item; if (!image || uniqueMap.has(image)) return; uniqueMap.set(image, { id: item?.id || `${image}-${index}`, image }) })
		return Array.from(uniqueMap.values())
	}, [product, colorGalleryImages])

	const activeImageIndex = useMemo(() => { if (!galleryImages.length || !activeImage) return 0; const foundIndex = galleryImages.findIndex((item) => item.image === activeImage); return foundIndex >= 0 ? foundIndex : 0 }, [activeImage, galleryImages])
	const khuyenMaiItems = useMemo(() => normalizePromotionItems(product?.khuyen_mai || product?.khuyenmai || product?.promotion || product?.promotions), [product])
	const companionProducts = Array.isArray(product?.san_pham_mua_kem_khuyen_nghi) ? product.san_pham_mua_kem_khuyen_nghi : []
	const giftProducts = Array.isArray(product?.san_pham_qua_tang) ? product.san_pham_qua_tang : []
	const featuredGiftProducts = giftProducts.slice(0, 5)
	const companionOnly = companionProducts.filter((c) => !giftProducts.some((g) => (g?.id && c?.id && g.id === c.id) || (g?.slug && c?.slug && g.slug === c.slug) || (g?.name && c?.name && g.name === c.name)))
	const featuredCompanionProducts = companionOnly.slice(0, 8)
	const getRecommendedProductKey = (item, index) => item?.id || item?.slug || item?.url || `recommended-${index}`
	const optionGroups = useMemo(() => deriveOptionGroups(product), [product])
	const filteredOptionGroups = useMemo(() => optionGroups.filter((group) => !String(group?.label || '').toLowerCase().includes('dung luong')), [optionGroups])
	const primaryOptionGroup = filteredOptionGroups[0] || null
	const secondaryOptionGroups = filteredOptionGroups.slice(1)
	const salePrice = product?.pricing?.sale_price || product?.price_sale || product?.sale_price || product?.price
	const regularPrice = product?.pricing?.regular_price || product?.price_old || product?.regular_price
	const salePriceValue = getNumericPrice(product)
	const totalSelectedRecommendedPrice = featuredCompanionProducts.reduce((total, item, index) => { const itemKey = getRecommendedProductKey(item, index); return selectedRecommendedIds.includes(itemKey) ? total + getNumericPrice(item) : total }, 0)
	const combinedTotal = (salePriceValue + totalSelectedRecommendedPrice) * quantity
	const stockStatus = Number(product?.stock_quantity) > 0 ? 'Còn hàng' : 'Liên hệ'
	const isOutOfStock = stockStatus !== 'Còn hàng'
	const galleryCount = galleryImages.length

	// --- AI Specs via OpenAI ---
	const fetchAiSpecs = async (productName, productDesc) => {
		setAiSpecsLoading(true)
		try {
			const openai = new OpenAI({
				apiKey: import.meta.env.VITE_OPENAI_API_KEY,
				dangerouslyAllowBrowser: true
			})

	const prompt = `Bạn hãy giúp tôi lấy danh sách thông số kỹ thuật và bản vẽ của sản phẩm. Hãy tự động phân loại các thông số theo nhóm hợp lý. CHỉ trả JSON thuần, không giải thích gì thêm.

Tên sản phẩm: ${productName}
Mô tả: ${productDesc}


Format trả về bắt buộc (phân nhóm theo category):
[
  {
    "category": "Tên nhóm mẹ (VD: Thông số chính, Bản vẽ, Tính năng...)",
    "specs": [
      {"label": "Tên thông số", "value": "Giá trị"},
      {"label": "Tên thông số", "value": "Link ảnh bản vẽ (nếu có)"}
    ]
  }
]

Ví dụ combo sản phẩm:
[
  {"category": "Thông số - Bồn cầu INAX", "specs": [{"label": "Kích thước", "value": "730x410x725mm"}, ...]},
  {"category": "Thông số - Vòi sen INAX", "specs": [{"label": "Loại", "value": "Vòi hoa sen đứng"}, ...]},
  {"category": "Bản vẽ - Bồn cầu INAX", "specs": [{"label": "Sơ đồ lắp đặt", "value": "https://example.com/ban-ve.jpg"}]}
]

Quy tắc phân nhóm:
Nếu là combo thì hiển thị thêm:
- "Thông số combo": tên combo, mã combo, thương hiệu combo, xuất xứ combo, năm combo, bảo hành combo
Mặc định các sản phẩm bình thường
- "Thông số chính": tên, model, mã, SKU, thương hiệu, xuất xứ, năm, bảo hành
- "Kích thước & Trọng lượng": kích thước, trọng lượng, chiều dài, rộng, cao
- "Chất liệu": vật liệu, thành phần, cấu tạo
- "Bản vẽ": sơ đồ kỹ thuật, sơ đồ lắp đặt, bản vẽ CAD (chỉ link ảnh THỰC SỰ tồn tại)
- "Tính năng": công dụng, đặc điểm nổi bật, công nghệ
- "Quy cách đóng gói": kích thước đóng gói, số lượng, trọng lượng đóng gói
- "Hướng dẫn": cách lắp đặt, sử dụng, bảo quản
- "Màu sắc": có bao nhiêu loại màu có thể chọn

Bạn có thể tìm thêm thông tin bên ngoài liên quan đến công dụng của sản phẩm để hiển thị nhiều hơn. Nếu bản vẽ kỹ thuật mà không phải ảnh thì hãy tìm ảnh bản vẽ đúng sản phẩm đó và chỉ trả link ảnh THỰC SỰ tồn tại nhé!
Chỉ cần bạn lấy đúng các thông tin của sản phẩm! bạn có thể lấy thông tin ở bất cứ trang web nào miễn sao nó đúng thông tin chuẩn và hiển thị đầy đủ thông tin là được!
`
			const response = await openai.chat.completions.create({
				model: 'gpt-4.1-mini',
				messages: [{ role: 'user', content: prompt }],
				temperature: 0.2
			})
			const raw = response.choices?.[0]?.message?.content || ''
			const jsonMatch = raw.match(/\[[\s\S]*\]/)
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0])
				if (Array.isArray(parsed)) {
					setAiSpecs(parsed)
				}
			}
		} catch (err) {
			console.error('AI specs fetch error:', err)
		} finally {
			setAiSpecsLoading(false)
		}
	}

	// Gọi AI specs khi có sản phẩm
	useEffect(() => {
		if (product && productSpecs && productSpecs.length === 0) {
			fetchAiSpecs(product.name || product.title || '', product.description || '')
		}
	}, [product])

	// ===== ORIGINAL productSpecs extraction =====
	const productSpecs = useMemo(() => {
		const specSources = [product?.specifications, product?.specs, product?.thong_so]
		const source = specSources.find((entry) => Array.isArray(entry) && entry.length > 0)

		let extractedFromDesc = []
		const desc = product?.description || ''
		if (desc) {
			const sanitized = sanitizeInaxDomainHref(desc)
			const tempDiv = document.createElement('div')
			tempDiv.innerHTML = sanitized
			const tableRows = tempDiv.querySelectorAll('table tbody tr, table tr')
			tableRows.forEach((row) => {
				const cells = row.querySelectorAll('td, th')
				if (cells.length >= 2) {
					const label = cells[0].textContent.trim()
					const value = cells[1].textContent.trim()
					if (label && value) {
						extractedFromDesc.push({ label, value })
					}
				}
			})
		}

		if (!source && extractedFromDesc.length > 0) return extractedFromDesc
		if (!source) return []

		const sourceSpecs = source.map((item, index) => {
			if (typeof item === 'string') return { label: `Thông số ${index + 1}`, value: item }
			return {
				label: item?.label || item?.name || item?.title || `Thông số ${index + 1}`,
				value: item?.value || item?.content || item?.description || item?.detail || ''
			}
		}).filter((item) => item.value)

		const sourceLabels = new Set(sourceSpecs.map(s => s.label.toLowerCase()))
		const uniqueFromDesc = extractedFromDesc.filter(s => !sourceLabels.has(s.label.toLowerCase()))
		return [...sourceSpecs, ...uniqueFromDesc]
	}, [product])

	// ===== Group specs by category =====
	const groupSpecs = (specs) => {
		if (!specs || !Array.isArray(specs) || specs.length === 0) return []

		const categoryKeywords = {
			'Thông số chính': ['tên', 'name', 'model', 'mã', 'sku', 'thương hiệu', 'brand', 'xuất xứ', 'origin', 'năm', 'year', 'bảo hành', 'warranty'],
			'Hệ điều hành & CPU': ['hệ điều hành', 'os', 'cpu', 'chip', 'bộ xử lý', 'processor', 'ram', 'bộ nhớ ram', 'gpu', 'xử lý đồ họa'],
			'Màn hình': ['màn hình', 'display', 'screen', 'tần số', 'refresh', 'độ phân giải', 'resolution', 'kích thước', 'size', 'độ sáng', 'brightness'],
			'Camera': ['camera', 'lens', 'ảnh', 'photo', 'quay', 'video', 'zoom', 'chụp', 'fps'],
			'Kết nối': ['kết nối', 'connect', 'bluetooth', 'wifi', 'wi-fi', 'cổng', 'port', 'usb', 'hdmi', 'jack', 'sim', 'mạng', 'network', 'gps', 'nfc', 'ir'],
			'Pin & Năng lượng': ['pin', 'battery', 'sạc', 'charg', 'công suất', 'power', 'watt', 'mah', 'dung lượng', 'thời gian sử dụng'],
			'Âm thanh': ['âm thanh', 'sound', 'loa', 'speaker', 'micro', 'microphone', 'tai nghe', 'headphone', 'âm lượng', 'volume'],
			'Kích thước & Trọng lượng': ['kích thước', 'dimension', 'trọng lượng', 'weight', 'dày', 'thickness', 'rộng', 'dài', 'cao'],
			'Tính năng đặc biệt': ['tính năng', 'feature', 'chống nước', 'waterproof', 'chống bụi', 'dust', 'kháng khuẩn', 'nhận diện', 'face id', 'vân tay', 'fingerprint'],
			'Bảo mật': ['bảo mật', 'security', 'mã hóa', 'encrypt', 'pattern', 'khóa']
		}

		const categorized = specs.map(spec => {
			const labelLower = (spec.label || '').toLowerCase()
			let foundCategory = 'Thông số khác'

			for (const [category, keywords] of Object.entries(categoryKeywords)) {
				if (keywords.some(keyword => labelLower.includes(keyword))) {
					foundCategory = category
					break
				}
			}

			return { ...spec, _category: foundCategory }
		})

		const groups = {}
		categorized.forEach(item => {
			if (!groups[item._category]) groups[item._category] = []
			groups[item._category].push({ label: item.label, value: item.value })
		})

		const categoryOrder = ['Thông số chính', 'Hệ điều hành & CPU', 'Màn hình', 'Camera', 'Kết nối', 'Pin & Năng lượng', 'Âm thanh', 'Kích thước & Trọng lượng', 'Tính năng đặc biệt', 'Bảo mật', 'Thông số khác']

		const result = []
		categoryOrder.forEach(cat => {
			if (groups[cat] && groups[cat].length > 0) {
				result.push({ category: cat, specs: groups[cat] })
			}
		})

		Object.keys(groups).forEach(cat => {
			if (!categoryOrder.includes(cat) && groups[cat].length > 0) {
				result.push({ category: cat, specs: groups[cat] })
			}
		})

		return result
	}

	const groupedProductSpecs = useMemo(() => groupSpecs(productSpecs), [productSpecs])
	const sanitizedDescription = useMemo(() => { if (!product?.description) return ''; return sanitizeInaxDomainHref(product.description) }, [product])
	const sanitizedShortDescription = useMemo(() => { if (!product?.short_description) return ''; return sanitizeInaxDomainHref(product.short_description) }, [product])
	const discountPercent = useMemo(() => { if (!regularPrice || regularPrice === salePrice) return 0; const regularVal = getNumericPrice({ price: regularPrice }); const saleVal = getNumericPrice({ price: salePrice }); if (!regularVal) return 0; return Math.round((1 - saleVal / regularVal) * 100) }, [regularPrice, salePrice])

	const showImageAtIndex = (index) => { if (!galleryImages.length) return; const normalizedIndex = (index + galleryImages.length) % galleryImages.length; setIsImageTransitioning(true); setActiveImage(galleryImages[normalizedIndex]?.image || '') }
	const handlePrevImage = () => showImageAtIndex(activeImageIndex - 1)
	const handleNextImage = () => showImageAtIndex(activeImageIndex + 1)

	const setFeedback = (message, type = 'success') => { setCartMessage(message); setCartMessageType(type) }

	const runFlyToCartAnimation = (sourceElParam = null) => {
		if (typeof document === 'undefined' || !activeImage) return
		const sourceEl = sourceElParam || document.querySelector('.sp-btn-cart')
		const targetEl = document.querySelector('.cart, .cart-btn')
		if (!sourceEl || !targetEl) return
		const sourceRect = sourceEl.getBoundingClientRect(), targetRect = targetEl.getBoundingClientRect()
		setFlyingImage({ src: activeImage, startX: sourceRect.left + sourceRect.width / 2, startY: sourceRect.top + sourceRect.height / 2, endX: targetRect.left + targetRect.width / 2, endY: targetRect.top + targetRect.height / 2, curveY: Math.max(14, Math.min(44, Math.abs(sourceRect.top - targetRect.top) * 0.08)) })
		window.dispatchEvent(new CustomEvent('cart-preview-open'))
		window.setTimeout(() => setFlyingImage(null), 900)
	}

	const refreshCartSummary = async () => {
		const [countResponse, cartResponse] = await Promise.all([axios.get(buildApiUrl('/get/cart/count'), buildCartRequestConfig()), axios.get(buildApiUrl('/get/cart'), buildCartRequestConfig())])
		syncCartTokenFromResponse(countResponse?.data); syncCartTokenFromResponse(cartResponse?.data)
		const nextCartCount = Number(countResponse?.data?.total_quantity || 0)
		setCartCount(nextCartCount); setCartSummary(cartResponse?.data?.summary || null)
		if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cart-count-updated', { detail: { count: nextCartCount } }))
	}

	const addSingleItemToCart = async (item, itemQuantity = 1) => {
		const resolvedProductId = resolveProductId(item)
		if (!resolvedProductId) throw new Error(`Missing product_id`)
		const payload = new URLSearchParams({ product_id: String(resolvedProductId), quantity: String(itemQuantity) })
		const response = await axios.post(buildApiUrl('/get/cart/add'), payload, buildCartRequestConfig({ headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Accept: 'application/json' } }))
		syncCartTokenFromResponse(response?.data)
	}

	const handleAddToCart = async ({ redirectToCart = false, sourceEl = null } = {}) => {
		const resolvedProductId = resolveProductId(product)
		if (!resolvedProductId) { setFeedback('Sản phẩm này chưa có mã product_id hợp lệ.', 'error'); return }
		if (redirectToCart) setIsBuyingNow(true); else setIsAddingToCart(true)
		try {
			if (!redirectToCart) runFlyToCartAnimation(sourceEl)
			await addSingleItemToCart(product, quantity)
			for (const [index, item] of featuredCompanionProducts.entries()) { const itemKey = getRecommendedProductKey(item, index); if (selectedRecommendedIds.includes(itemKey)) await addSingleItemToCart(item, quantity) }
			await refreshCartSummary()
			if (typeof window !== 'undefined') window.dispatchEvent(new Event('force-cart-reload'))
			setFeedback(redirectToCart ? 'Đã thêm sản phẩm vào giỏ và chuyển bạn tới giỏ hàng.' : 'Đã thêm sản phẩm vào giỏ hàng thành công.')
			if (redirectToCart) navigate('/cart')
		} catch (error) {
			console.error('Cart add API error:', error)
			const apiMessage = error?.response?.data?.message || error?.response?.data?.error || error.message
			setFeedback(apiMessage || 'Không thể thêm sản phẩm vào giỏ lúc này.', 'error')
		} finally { setIsAddingToCart(false); setIsBuyingNow(false) }
	}

	useEffect(() => { if (!activeImage) return undefined; const timer = window.setTimeout(() => setIsImageTransitioning(false), 220); return () => window.clearTimeout(timer) }, [activeImage])
	useEffect(() => { setSelectedRecommendedIds([]); setQuantity(1); setCartMessage('') }, [decodedSlug])
	useEffect(() => {
		if (!product) return undefined
		const gifts = Array.isArray(product?.san_pham_qua_tang) ? product.san_pham_qua_tang : []
		const featuredGifts = gifts.slice(0, 5)
		if (!featuredGifts.length) return undefined
		const keys = featuredGifts.map((item, idx) => getRecommendedProductKey(item, idx))
		setSelectedRecommendedIds((cur) => Array.from(new Set([...(cur || []), ...keys])))
		return undefined
	}, [product])

	if (isLoading) return <section className="sp-section"><div className="sp-top"><div className="sp-loading"><div className="sp-loading-spinner" /><p>Đang tải chi tiết sản phẩm...</p></div></div></section>
	if (!product) return <section className="sp-section"><div className="sp-top"><div className="sp-error"><h2>Không tìm thấy sản phẩm</h2><p>Slug này hiện chưa có dữ liệu hoặc sản phẩm đã được cập nhật.</p></div></div></section>

	return (
		<section className="sp-section">
			<style>{`
				/* ===== BASE ===== */
				.sp-section { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; }
				.sp-loading { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #fff; }
				.sp-loading-spinner { width: 48px; height: 48px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spSpin 0.8s linear infinite; }
				@keyframes spSpin { to { transform: rotate(360deg); } }
				.sp-error { text-align: center; padding: 60px 20px; color: #fff; }

				/* ===== TOP - 2 COLUMNS DARK ===== */
				.sp-top { background: #3e3e3f; width: 100%; }
				.sp-top-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 400px; gap: 40px; padding: 30px 24px; align-items: start; }

				/* Left - Image (sticky) */
				.sp-left-img { position: sticky; top: 20px; align-self: start; }
				.sp-left-img-inner { position: relative; }
				.sp-main-img { width: 100%; display: block; object-fit: contain; max-height: 500px; border-radius: 16px; cursor: zoom-in; transition: opacity 0.2s; }
				.sp-main-img.is-switching { opacity: 0.5; }
				.sp-img-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; font-size: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; transition: background 0.2s; }
				.sp-img-nav:hover { background: rgba(0,0,0,0.9); }
				.sp-img-nav.prev { left: 10px; }
				.sp-img-nav.next { right: 10px; }
				.sp-back-btn { display: none; position: absolute; top: 16px; left: 16px; width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; cursor: pointer; z-index: 11; align-items: center; justify-content: center; transition: background 0.2s; }
				.sp-back-btn:hover { background: rgba(0,0,0,0.8); }
				.sp-back-btn svg { width: 22px; height: 22px; }
				.sp-thumb-row { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
				.sp-thumb-row::-webkit-scrollbar { height: 4px; }
				.sp-thumb-row::-webkit-scrollbar-track { background: rgba(255,255,255,0.2); border-radius: 4px; }
				.sp-thumb-row::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 4px; }
				.sp-thumb { width: 64px; height: 64px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; overflow: hidden; background: rgba(255,255,255,0.1); transition: all 0.2s; flex-shrink: 0; }
				.sp-thumb:hover { border-color: rgba(255,255,255,0.6); }
				.sp-thumb.active { border-color: #fff; }
				.sp-thumb img { width: 100%; height: 100%; object-fit: cover; }

				/* Right - Purchase Box */
				.sp-right-purchase { display: flex; flex-direction: column; gap: 10px; }
				.sp-breadcrumb { font-size: 12px; color: rgba(255,255,255,0.5); }
				.sp-breadcrumb a { color: rgba(255,255,255,0.5); text-decoration: none; }
				.sp-breadcrumb a:hover { color: #fff; }
				.sp-breadcrumb span { margin: 0 6px; }
				.sp-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 4px; line-height: 1.3; }
				.sp-sku { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 0; }

				/* ===== Product Color Selector ===== */
				.sp-color-selector { margin-bottom: 20px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
				.sp-color-label { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; color: rgba(255,255,255,0.6); }
				.sp-color-label span { font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
				.sp-color-label strong { color: #fff; font-weight: 700; font-size: 14px; }
				.sp-color-options { display: flex; flex-wrap: wrap; gap: 12px; }
				.sp-color-btn {
					width: 38px; height: 38px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); overflow: hidden;
				}
				.sp-color-btn:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.4); box-shadow: 0 6px 16px rgba(0,0,0,0.5); }
				.sp-color-btn.active { border-color: #0071e3; transform: scale(1.1) translateY(-2px); box-shadow: 0 0 0 2px rgba(0,113,227,0.3), 0 8px 20px rgba(0,0,0,0.6); }
				.sp-color-btn svg { width: 16px; height: 16px; drop-shadow: 0 1px 2px rgba(0,0,0,0.3); }
				.sp-color-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%); pointer-events: none; }

				/* ===== TGDĐ BOX SAVING ===== */
				.sp-box-saving {background: linear-gradient(272.75deg, #f38c25 38.99%, #fb6848 76.29%); border-radius: 12px; overflow: hidden; }
				.sp-saving-header { background: linear-gradient(272.75deg, #f38c25 38.99%, #fb6848 76.29%); display: flex; align-items: center; padding: 14px; background-image: url('https://cdnv2.tgdd.vn/webmwg/2024/ContentMwg/images/bg-oltk-dt-min.png'); background-repeat: no-repeat; background-position: top right; background-size: auto 100%; }
				.sp-saving-price { width: 55%; }
				.sp-saving-price > b { display: block; font-size: 14px; font-weight: 500; color:rgb(255, 255, 255); margin-bottom: 6px; }
				.sp-saving-price > strong { display: block; color:rgb(255, 255, 255); font-size: 26px; font-weight: 700; margin-bottom: 4px; }
				.sp-saving-price > em { font-style: normal; color: rgba(255,255,255,0.75); font-size: 14px; text-decoration: line-through; margin-bottom: 4px; display: block; }
				.sp-saving-price > i { font-style: normal; background: #d43232; color: #fff; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
				.sp-saving-time { width: 45%; text-align: right; }
				.sp-saving-time-label { font-size: 12px; color: rgba(255,255,255,0.8); margin-bottom: 4px; }
				.sp-saving-clock { display: flex; align-items: center; justify-content: flex-end; gap: 2px; margin-bottom: 6px; }
				.sp-saving-clock b { background: #fff; color: #e2252d; font-size: 15px; font-weight: 700; padding: 2px 5px; border-radius: 4px; min-width: 26px; text-align: center; }
				.sp-saving-clock i { color: #fff; font-size: 15px; font-style: normal; }
				.sp-saving-stock { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
				.sp-saving-stock img { width: 16px; height: 16px; }
				.sp-saving-stock-bar { position: relative; width: 80px; height: 16px; background: rgba(0,0,0,0.3); border-radius: 8px; overflow: hidden; }
				.sp-saving-stock-bar em { position: absolute; left: 0; top: 0; height: 100%; background: #fff; border-radius: 8px; transition: width 0.3s; }
				.sp-saving-stock-bar b { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #e2252d; }
				.sp-saving-content { background: #2f3033; border: 1px solid #2f3033; padding: 12px; border-top: none; }
				.sp-promo-section { margin-bottom: 12px; }
				.sp-promo-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 8px; }
				.sp-promo-label small { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 400; }
				.sp-promo-choose-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-radius: 8px; margin-bottom: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
				.sp-promo-choose-item:hover { background: rgba(255,255,255,0.06); }
				.sp-promo-choose-item.active { background: rgba(0,113,227,0.2); border-color: #0071e3; }
				.sp-promo-choose-item .sp-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; }
				.sp-promo-choose-item.active .sp-radio { border-color: #0071e3; background: #0071e3; }
				.sp-promo-choose-item.active .sp-radio::after { content: ''; width: 6px; height: 6px; background: #fff; border-radius: 50%; }
				.sp-promo-choose-item .sp-promo-text { flex: 1; }
				.sp-promo-choose-item .sp-promo-text b { display: block; font-size: 13px; color: #fff; margin-bottom: 2px; }
				.sp-promo-choose-item .sp-promo-text span { font-size: 11px; color: rgba(255,255,255,0.6); }
				.sp-promo-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 13px; color: #fff; }
				.sp-promo-item:last-child { border-bottom: none; }
				.sp-promo-item::before { content: '•'; color: #d43232; font-size: 12px; font-weight: 700; flex-shrink: 0; }
				.sp-loyalty { display: flex; align-items: center; gap: 8px; padding: 10px; background: rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 12px; }
				.sp-loyalty-icon { width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
				.sp-loyalty-icon img { width: 100%; height: 100%; object-fit: cover; }
				.sp-loyalty p { font-size: 13px; color: #fff; margin: 0; flex: 1; }
				.sp-loyalty p b { color: #ffd028; font-weight: 700; }
				.sp-saving-rules { margin-bottom: 12px; }
				.sp-saving-rules ul { list-style: none; padding: 0; margin: 0; }
				.sp-saving-rules li { font-size: 12px; color: rgba(255,255,255,0.7); padding: 3px 0; display: flex; align-items: center; gap: 6px; }
				.sp-saving-rules li::before { content: ''; width: 4px; height: 4px; background: rgba(255,255,255,0.5); border-radius: 50%; flex-shrink: 0; }
				.sp-payment-promo { background: #3e3e3f; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
				.sp-payment-promo > b { display: block; font-size: 13px; color: #fff; margin-bottom: 8px; font-weight: 600; }
				.sp-payment-promo > b i { font-style: normal; font-weight: 400; font-size: 11px; color: rgba(255,255,255,0.6); }
				.sp-payment-slider { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
				.sp-payment-slider::-webkit-scrollbar { height: 4px; }
				.sp-payment-slider::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
				.sp-payment-slider::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
				.sp-payment-option { min-width: calc(50% - 4px); background: #fff; border: 2px solid transparent; border-radius: 8px; padding: 8px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; display: flex; align-items: center; gap: 8px; }
				.sp-payment-option:hover { border-color: #2f80ed; }
				.sp-payment-option.active { border-color: #2f80ed; }
				.sp-payment-option figure { width: 40px; height: 20px; border-radius: 4px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
				.sp-payment-option figure img { max-width: 100%; max-height: 100%; object-fit: contain; }
				.sp-payment-option > div { flex: 1; min-width: 0; }
				.sp-payment-option > div > b { display: block; font-size: 12px; color: #000; font-weight: 600; margin-bottom: 2px; }
				.sp-payment-option > div > a { font-size: 11px; color: #fb6e2e; }
				.sp-qty-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
				.sp-qty-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); white-space: nowrap; }
				.sp-qty-control { display: inline-flex; align-items: center; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); }
				.sp-qty-control button { width: 36px; height: 36px; background: transparent; border: none; color: rgba(255,255,255,0.7); font-size: 18px; cursor: pointer; transition: all 0.2s; }
				.sp-qty-control button:hover { background: rgba(255,255,255,0.15); color: #fff; }
				.sp-qty-control span { width: 44px; text-align: center; font-size: 15px; font-weight: 600; color: #fff; }
				.sp-buy-buttons { display: flex; flex-direction: column; gap: 8px; }
				.sp-btn { height: 46px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
				.sp-btn-buy-main { background: #d43232; color: #fff; font-size: 16px; }
				.sp-btn-buy-main:hover { background: #e53935; transform: translateY(-1px); }
				.sp-btn-buy-main:disabled { background: rgba(212,50,50,0.5); cursor: not-allowed; transform: none; }
				.sp-btn-cart { background: #0071e3; color: #fff; }
				.sp-btn-cart:hover { background: #0077ed; transform: translateY(-1px); }
				.sp-btn-cart:disabled { background: rgba(0,113,227,0.5); cursor: not-allowed; transform: none; }
				.sp-btn-installment { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); height: 40px; font-size: 13px; }
				.sp-btn-installment:hover { background: rgba(255,255,255,0.2); }
				.sp-btn-installment span { display: block; font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.6); margin-top: -2px; }

				/* Price Breakdown */
				.sp-price-breakdown { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
				.sp-breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; color: rgba(255,255,255,0.7); }
				.sp-breakdown-row span:last-child, .sp-breakdown-row strong { color: #fff; }
				.sp-breakdown-row.highlight span:first-child { color: #34c759; }
				.sp-breakdown-row.highlight span:last-child { color: #34c759; font-weight: 600; }
				.sp-breakdown-total { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.15); }
				.sp-breakdown-total span { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); }
				.sp-breakdown-total strong { font-size: 18px; font-weight: 800; color: #34c759; }
				.sp-feedback { padding: 10px 14px; border-radius: 8px; font-size: 13px; }
				.sp-feedback.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
				.sp-feedback.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
				.sp-cart-summary { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.06); border-radius: 8px; }
				.sp-cart-summary p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.6); }
				.sp-cart-summary strong { font-size: 13px; color: #fff; }
				.sp-cart-count { width: 28px; height: 28px; background: #0071e3; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
				.sp-policy-box { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; }
				.sp-policy-title { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 10px; }
				.sp-policy-item { display: flex; align-items: flex-start; gap: 8px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
				.sp-policy-item:last-child { border-bottom: none; padding-bottom: 0; }
				.sp-policy-icon { width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
				.sp-policy-icon.blue { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
				.sp-policy-icon.green { background: rgba(34, 197, 94, 0.2); color: #86efac; }
				.sp-policy-icon.orange { background: rgba(249, 115, 22, 0.2); color: #fdba74; }
				.sp-policy-icon.purple { background: rgba(168, 85, 247, 0.2); color: #d8b4fe; }
				.sp-policy-text strong { display: block; font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 1px; }
				.sp-policy-text span { font-size: 11px; color: rgba(255,255,255,0.6); }

				/* Sản phẩm khuyến nghị mua kèm */
				.sp-combo-promo { background: rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; margin-bottom: 12px; }
				.sp-combo-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
				.sp-combo-title b { font-size: 13px; font-weight: 600; color: #fff; }
				.sp-combo-title a { font-size: 12px; color: #2a83e9; text-decoration: none; }
				.sp-combo-list { display: flex; flex-direction: column; gap: 6px; }
				.sp-combo-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
				.sp-combo-item:hover { background: rgba(255,255,255,0.06); }
				.sp-combo-item.active { background: rgba(0,113,227,0.15); border-color: #0071e3; }
				.sp-combo-check { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
				.sp-combo-item.active .sp-combo-check { border-color: #0071e3; background: #0071e3; }
				.sp-combo-item.active .sp-combo-check-inner { width: 8px; height: 8px; background: #fff; border-radius: 50%; }
				.sp-combo-img { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: rgba(255,255,255,0.1); }
				.sp-combo-img img { width: 100%; height: 100%; object-fit: cover; }
				.sp-combo-info { flex: 1; min-width: 0; }
				.sp-combo-name { font-size: 12px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px; }
				.sp-combo-price { font-size: 12px; color: #ffd028; font-weight: 600; }

				/* ===== BOTTOM - WHITE ===== */
				.sp-bottom { background: #fff; padding: 40px 0 80px; }
				.sp-bottom-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

				/* Short Desc */
				.sp-short-desc { font-size: 15px; color: #424245; line-height: 1.7; margin-bottom: 24px; padding: 20px; background: #f9f9f9; border-radius: 12px; }
				.sp-short-desc ul { margin: 12px 0; padding-left: 20px; }
				.sp-short-desc li { margin-bottom: 8px; }

				/* Short Desc */
				.sp-related { margin-bottom: 32px; }
				.sp-related h2 { font-size: 20px; font-weight: 700; color: #1d1d1f; margin-bottom: 16px; }
				.sp-related-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
				.sp-related-card { background: #fff; border: 1px solid #e8e8ed; border-radius: 12px; overflow: hidden; text-decoration: none; transition: all 0.2s; display: block; }
				.sp-related-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: #0071e3; }
				.sp-related-img { height: 140px; background: #fafafa; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
				.sp-related-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
				.sp-related-info { padding: 14px; }
				.sp-related-name { font-size: 13px; font-weight: 500; color: #1d1d1f; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8px; min-height: 36px; }
				.sp-related-price-wrap { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
				.sp-related-price { font-size: 15px; font-weight: 700; color: #d43232; }
				.sp-related-add-btn { width: 32px; height: 32px; border-radius: 50%; background: #0071e3; color: #fff; border: none; font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
				.sp-related-add-btn:hover { background: #0077ed; transform: scale(1.1); }
				.sp-related-add-btn.selected { background: #16a34a; }

				/* Tabs */
				.sp-tabs { display: flex; background: #fff; border: 1px solid #e8e8ed; border-radius: 12px; padding: 4px; margin-bottom: 0; overflow: hidden; }
				.sp-tab { flex: 1; padding: 14px 24px; border: none; background: transparent; font-size: 15px; font-weight: 500; color: #86868b; cursor: pointer; border-radius: 8px; transition: all 0.25s; position: relative; }
				.sp-tab:hover { color: #1d1d1f; }
				.sp-tab.active { background: #0071e3; color: #fff; font-weight: 600; box-shadow: 0 4px 12px rgba(0,113,227,0.3); }

				/* Tab Content */
				.sp-tab-content { background: #fff; border: 1px solid #e8e8ed; border-top: none; border-radius: 0 0 16px 16px; padding: 32px; margin-bottom: 24px; }
				.sp-tab-content h2 { font-size: 28px; font-weight: 700; color: #1d1d1f; margin: 0 0 24px; letter-spacing: -0.3px; }
				.sp-tab-content h3 { font-size: 18px; font-weight: 600; color: #1d1d1f; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #0071e3; display: inline-block; }

				/* ===== GROUPED SPECS - Professional Two-Column Layout ===== */
				.sp-specs-grouped-wrap {
					margin: 24px 0 0;
					background: #fff;
					border: 1px solid #e8e8ed;
					border-radius: 16px;
					overflow: hidden;
					box-shadow: 0 2px 16px rgba(0,0,0,0.06);
				}

				/* Main Header */
				.sp-specs-grouped-header {
					background: linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%);
					padding: 22px 28px;
					display: flex;
					align-items: center;
					gap: 16px;
					border-bottom: 1px solid rgba(255,255,255,0.08);
					position: relative;
				}
				.sp-specs-grouped-header::after {
					content: '';
					position: absolute;
					bottom: -1px;
					left: 0;
					right: 0;
					height: 1px;
					background: linear-gradient(90deg, transparent, rgba(0,113,227,0.3), transparent);
				}
				.sp-specs-grouped-header-icon {
					width: 48px;
					height: 48px;
					background: rgba(255,255,255,0.1);
					backdrop-filter: blur(10px);
					border-radius: 12px;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
					border: 1px solid rgba(255,255,255,0.1);
				}
				.sp-specs-grouped-header-text {
					flex: 1;
				}
				.sp-specs-grouped-header-text h3 {
					margin: 0;
					font-size: 18px;
					font-weight: 700;
					color: #fff;
					letter-spacing: -0.3px;
				}
				.sp-specs-grouped-header-text p {
					margin: 4px 0 0;
					font-size: 13px;
					color: rgba(255,255,255,0.5);
				}

				.sp-specs-grouped-header.ai {
					background: linear-gradient(135deg, #0071e3 0%, #0051b8 100%);
				}

				/* Categories Container */
				.sp-specs-categories {
					padding: 8px 0;
				}

				/* Single Category Block */
				.sp-specs-category {
					margin: 0 16px;
					border-radius: 12px;
					border: 1px solid #f0f0f2;
					margin-bottom: 12px;
					transition: all 0.2s ease;
					background: #fafafa;
				}
				.sp-specs-category:hover {
					border-color: #e0e0e5;
					box-shadow: 0 4px 16px rgba(0,0,0,0.04);
				}

				/* Category Header - H1 Style */
				.sp-specs-category-header {
					display: flex;
					align-items: center;
					gap: 10px;
					padding: 16px 20px;
					background: #fff;
					border-bottom: 1px solid #e8e8ed;
					border-radius: 12px 12px 0 0;
					position: relative;
				}
				.sp-specs-category-header::after {
					content: '';
					position: absolute;
					bottom: 0;
					left: 20px;
					right: 20px;
					height: 1px;
					background: linear-gradient(90deg, transparent, #f0f0f2, transparent);
				}
				.sp-specs-category-icon {
					width: 28px;
					height: 28px;
					background: #f0f8ff;
					color: #0071e3;
					border-radius: 7px;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
					border: 1px solid rgba(0,113,227,0.15);
				}
				.sp-specs-category-header span:first-of-type {
					font-size: 16px;
					font-weight: 700;
					color: #1d1d1f;
					letter-spacing: -0.2px;
				}
				.sp-specs-category-count {
					font-size: 11px;
					color: #86868b;
					background: #f5f5f7;
					padding: 3px 8px;
					border-radius: 10px;
					font-weight: 500;
					margin-left: auto;
				}

				/* Spec Items - H2/H1 Child Style */
				.sp-specs-category-items {
					padding: 4px 0;
				}

				/* Premium Refund Styles (Global) */
				.sp-refund-badge { 
					display: inline-flex; align-items: center; gap: 6px; 
					background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
					color: #fff !important; padding: 5px 14px; border-radius: 999px; 
					font-size: 13px; font-weight: 800; margin-top: 8px;
					vertical-align: middle; 
					box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
					position: relative; overflow: hidden;
					border: 1px solid rgba(255, 255, 255, 0.3);
					text-shadow: 0 1px 2px rgba(0,0,0,0.2);
					width: fit-content;
				}
				.sp-refund-badge::after {
					content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
					background: linear-gradient(to bottom right, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 60%, rgba(255,255,255,0) 100%);
					transform: rotate(45deg); animation: sp-shimmer 3s infinite;
				}
				@keyframes sp-shimmer {
					0% { transform: translateX(-150%) rotate(45deg); }
					20%, 100% { transform: translateX(150%) rotate(45deg); }
				}
				.sp-refund-badge svg { width: 16px !important; height: 16px !important; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2)); flex-shrink: 0; }
				
				.sp-breakdown-row.refund { color: #10b981; background: rgba(16, 185, 129, 0.08); padding: 8px 12px; border-radius: 6px; margin: 6px 0; }
				.sp-breakdown-row.refund span:last-of-type { font-weight: 800; font-size: 14px; }
				.sp-breakdown-row.final-price { border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 15px; margin-top: 10px; }
				.sp-breakdown-row.final-price strong { color: #facc15; font-size: 24px; text-shadow: 0 2px 10px rgba(250, 204, 21, 0.4); }

				.sp-specs-item {
					display: grid;
					grid-template-columns: 1fr 1.5fr;
					gap: 16px;
					padding: 14px 20px;
					transition: all 0.2s ease;
					position: relative;
					border-bottom: 1px solid #f5f5f7;
				}
				.sp-specs-item:last-child {
					border-bottom: none;
				}
				.sp-specs-item:hover {
					background: #f8faff;
				}
				.sp-specs-item:hover .sp-specs-item-label {
					color: #0071e3;
				}
				.sp-specs-item-label {
					font-size: 14px;
					font-weight: 600;
					color: #1d1d1f;
					display: flex;
					align-items: flex-start;
					gap: 8px;
					line-height: 1.5;
					transition: color 0.2s ease;
				}
				.sp-specs-item-label::before {
					content: '';
					width: 4px;
					height: 4px;
					border-radius: 50%;
					background: #d1d1d6;
					flex-shrink: 0;
					margin-top: 7px;
					transition: background 0.2s ease;
				}
				.sp-specs-item:hover .sp-specs-item-label::before {
					background: #0071e3;
				}
				.sp-specs-item-value {
					font-size: 14px;
					color: #424245;
					line-height: 1.5;
					word-break: break-word;
				}

				/* States */
				.sp-specs-empty {
					padding: 56px 32px;
					text-align: center;
				}
				.sp-specs-empty-icon {
					width: 64px;
					height: 64px;
					background: #f5f5f7;
					border-radius: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					margin: 0 auto 20px;
					font-size: 28px;
				}
				.sp-specs-empty p {
					margin: 0;
					font-size: 15px;
					color: #86868b;
					font-weight: 500;
				}
				.sp-specs-loading {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 32px 28px;
					color: #86868b;
					font-size: 14px;
					font-weight: 500;
				}
				.sp-specs-spinner {
					width: 22px;
					height: 22px;
					border: 2.5px solid #e8e8ed;
					border-top-color: #0071e3;
					border-radius: 50%;
					animation: spSpin 0.8s linear infinite;
					flex-shrink: 0;
				}

				/* Desc Content - Clean & Modern */
				.sp-desc-content { font-size: 15px; line-height: 1.8; color: #424245; }
				.sp-desc-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
				.sp-desc-content h2 { font-size: 22px; font-weight: 700; color: #1d1d1f; margin: 36px 0 16px; letter-spacing: -0.2px; }
				.sp-desc-content h3 { font-size: 17px; font-weight: 600; color: #1d1d1f; margin: 28px 0 12px; }
				.sp-desc-content p { margin: 0 0 16px; }
				.sp-desc-content ul, .sp-desc-content ol { margin: 16px 0; padding-left: 24px; }
				.sp-desc-content li { margin-bottom: 8px; }
				.sp-desc-content table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
				.sp-desc-content table th, .sp-desc-content table td { padding: 12px 16px; border: 1px solid #e8e8ed; text-align: left; }
				.sp-desc-content table th { background: #f5f5f7; font-weight: 600; color: #1d1d1f; }
				.sp-desc-content table tr:nth-child(even) { background: #fafafa; }

				/* Fly Image */
				.sp-fly-image { position: fixed; left: 0; top: 0; width: 50px; height: 50px; object-fit: contain; background: #fff; border-radius: 8px; padding: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); pointer-events: none; z-index: 9998; animation: spFly 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
				@keyframes spFly { 0% { transform: translate(calc(var(--start-x) - 25px), calc(var(--start-y) - 25px)) scale(1); opacity: 1; } 70% { transform: translate(calc((var(--start-x) * 0.4) + (var(--end-x) * 0.6) - 25px), calc(((var(--start-y) * 0.4) + (var(--end-y) * 0.6)) - var(--curve-y) - 25px)) scale(0.6); opacity: 0.9; } 100% { transform: translate(calc(var(--end-x) - 12px), calc(var(--end-y) - 12px)) scale(0.1); opacity: 0; } }

				/* Preview */
				.sp-preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000001; display: flex; align-items: center; justify-content: center; padding: 0; touch-action: none; }
				.sp-preview-close { position: absolute; top: 80px; right: 20px; width: 48px; height: 48px; border-radius: 50%; background: rgba(80,80,80,0.8); color: #fff; border: 1px solid rgba(255,255,255,0.3); font-size: 26px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: background 0.2s; }
				.sp-preview-close:hover { background: rgba(100,100,100,0.95); }
				.sp-preview-img-wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: grab; touch-action: none; padding: 100px 20px 120px; box-sizing: border-box; }
				.sp-preview-img-wrap:active { cursor: grabbing; }
				.sp-preview-img { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.1s ease-out; will-change: transform; user-select: none; }
				.sp-preview-zoom-hint { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.15); color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 13px; pointer-events: none; backdrop-filter: blur(4px); white-space: nowrap; }
				.sp-preview-zoom-controls { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; background: rgba(60,60,60,0.85); border-radius: 28px; padding: 8px 12px; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); }
				.sp-preview-zoom-btn { width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
				.sp-preview-zoom-btn:hover { background: rgba(255,255,255,0.35); }
				.sp-preview-zoom-btn:disabled { opacity: 0.35; cursor: not-allowed; }
				.sp-preview-zoom-scale { color: #fff; font-size: 14px; font-weight: 600; min-width: 50px; text-align: center; font-variant-numeric: tabular-nums; }
				.sp-preview-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 56px; height: 56px; border-radius: 50%; background: rgba(80,80,80,0.8); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 28px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: background 0.2s; }
				.sp-preview-nav:hover { background: rgba(100,100,100,0.95); }
				.sp-preview-nav.prev { left: 24px; }
				.sp-preview-nav.next { right: 24px; }

				/* ===== RESPONSIVE ===== */
				@media (max-width: 1024px) {
					.sp-top-inner { grid-template-columns: 1fr 360px !important; gap: 24px !important; padding: 20px 16px !important; }
					.sp-left-img { padding: 0; position: static; }
					.sp-right-purchase { gap: 10px; padding: 0; }
					.sp-related-grid { grid-template-columns: repeat(3, 1fr) !important; }
					.sp-bottom-inner { padding: 0 16px; }
				}
				@media (max-width: 768px) {
					.sp-top { background: #3e3e3f; padding: 0 !important; }
					.sp-top-inner { display: flex !important; flex-direction: column !important; grid-template-columns: unset !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; gap: 0 !important; box-sizing: border-box; }
					.sp-left-img { width: 100%; padding: 0; position: static; box-sizing: border-box; }
					.sp-left-img-inner { border-radius: 0; overflow: hidden; position: relative; }
					.sp-left-img-inner img { width: 100% !important; max-height: 320px; }
					.sp-img-nav { display: flex !important; position: absolute; top: 50%; transform: translateY(-50%); width: 40px !important; height: 40px !important; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; font-size: 24px; z-index: 10; }
					.sp-img-nav:hover { background: rgba(0,0,0,0.8); }
					.sp-img-nav.prev { left: 12px; }
					.sp-img-nav.next { right: 12px; }
					.sp-back-btn { display: flex !important; position: absolute; top: 16px; left: 16px; width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; cursor: pointer; z-index: 11; align-items: center; justify-content: center; transition: background 0.2s; }
					.sp-back-btn:hover { background: rgba(0,0,0,0.8); }
					.sp-back-btn svg { width: 22px; height: 22px; }
					.sp-thumb-row { padding: 10px 16px 0; margin-top: 0; }
					.sp-right-purchase { width: 100%; display: flex; flex-direction: column; gap: 0; padding: 0 16px 16px; box-sizing: border-box; }
					.sp-title { font-size: 18px; padding: 12px 0 0; margin: 0; }
					.sp-sku { padding: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.5); }
					.sp-color-selector { margin-bottom: 10px; }
					.sp-color-label { font-size: 12px; }
					.sp-color-btn { width: 32px; height: 32px; }
					.sp-box-saving { margin: 12px 0 0; border-radius: 10px; box-sizing: border-box; }
					.sp-saving-header { padding: 12px; box-sizing: border-box; }
					.sp-saving-price { width: 60%; }
					.sp-saving-price > strong { font-size: 22px; }
					.sp-saving-time { width: 40%; }
					.sp-saving-content { padding: 12px; box-sizing: border-box; }
					.sp-promo-label { font-size: 12px; }
					.sp-promo-choose-item { padding: 8px 10px; }
					.sp-loyalty { padding: 10px; }
					.sp-loyalty p { font-size: 12px; }
					.sp-combo-promo { padding: 10px; }
					.sp-combo-title { margin-bottom: 8px; }
					.sp-combo-title b { font-size: 12px; }
					.sp-saving-rules { padding: 0 4px; }
					.sp-saving-rules li { font-size: 11px; }
					.sp-qty-row { margin: 10px 0; padding: 0; }
					.sp-buy-buttons { gap: 6px; padding: 0; box-sizing: border-box; }
					.sp-btn-buy-main { height: 44px; font-size: 14px; }
					.sp-btn-cart { height: 42px; font-size: 13px; }
					.sp-btn-installment { height: 38px; font-size: 12px; }
					.sp-price-breakdown { padding: 12px 14px; margin-bottom: 12px; }
					.sp-breakdown-row { font-size: 12px; padding: 4px 0; }
					.sp-breakdown-total { padding-top: 8px; margin-top: 4px; }
					.sp-breakdown-total span { font-size: 13px; }
					.sp-breakdown-total strong { font-size: 15px; }
					.sp-policy-box { padding: 12px; box-sizing: border-box; }
					.sp-policy-title { font-size: 12px; margin-bottom: 8px; }
					.sp-related { padding: 20px 16px 0 !important; }
					.sp-related h2 { font-size: 16px; margin-bottom: 12px; }
					.sp-related-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px; box-sizing: border-box; }
					.sp-related-img { height: 100px; }
					.sp-related-name { font-size: 12px; }
					.sp-bottom { padding: 20px 0 calc(80px + env(safe-area-inset-bottom, 10px)) !important; box-sizing: border-box; }
					.sp-bottom-inner { padding: 0 16px; box-sizing: border-box; }
					.sp-tabs { flex-direction: column; border-radius: 10px; }
					.sp-tab { text-align: center; padding: 12px; font-size: 14px; }
					.sp-tab.active { box-shadow: none; }
					.sp-tab-content { padding: 20px 16px; border-radius: 0 0 12px 12px; }
					.sp-tab-content h2 { font-size: 22px; }
					.sp-tab-content { padding: 20px 16px; border-radius: 0 0 12px 12px; }
					.sp-tab-content h2 { font-size: 22px; }
					.sp-specs-grouped-wrap { margin: 16px 0 0; }
					.sp-specs-grouped-header { padding: 16px; gap: 12px; }
					.sp-specs-grouped-header-icon { width: 40px; height: 40px; border-radius: 10px; }
					.sp-specs-grouped-header-text h3 { font-size: 15px; }
					.sp-specs-grouped-header-text p { font-size: 11px; }
					.sp-specs-category { margin: 0 12px 10px; border-radius: 10px; }
					.sp-specs-category-header { padding: 12px 16px; gap: 8px; }
					.sp-specs-category-icon { width: 24px; height: 24px; border-radius: 6px; }
					.sp-specs-category-header span:first-of-type { font-size: 14px; }
					.sp-specs-category-count { font-size: 10px; padding: 2px 6px; }
					.sp-specs-item { padding: 12px 16px; }
					.sp-specs-item-label { font-size: 13px; }
					.sp-specs-item-value { font-size: 13px; }
					.sp-specs-empty { padding: 32px 16px; }
					.sp-specs-empty-icon { width: 48px; height: 48px; }
					.sp-specs-loading { padding: 20px 16px; }
					.sp-desc-content { font-size: 14px; }
					.sp-desc-content h2 { font-size: 18px; }
					.sp-mobile-nav { display: flex; position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1px solid #e8e8ed; padding: 10px 16px; padding-bottom: calc(10px + env(safe-area-inset-bottom, 10px)); z-index: 1000; box-shadow: 0 -4px 20px rgba(0,0,0,0.08); gap: 10px; align-items: center; box-sizing: border-box; }
					.sp-mobile-price { min-width: 90px; }
					.sp-mobile-price span { font-size: 11px; color: #86868b; display: block; }
					.sp-mobile-price strong { font-size: 16px; font-weight: 800; color: #d43232; }
					.sp-mobile-actions { flex: 1; display: flex; gap: 8px; }
					.sp-mobile-actions .sp-btn { flex: 1; height: 46px; font-size: 13px; }
					.sp-mobile-actions .sp-btn-cart { background: #0071e3; color: #fff; }
					.sp-mobile-actions .sp-btn-buy { background: #d43232; color: #fff; }
					.sp-mobile-actions .sp-btn-cart:hover { background: #0077ed; }
					.sp-mobile-actions .sp-btn-buy:hover { background: #e53935; }
				}
				@media (min-width: 769px) {
					.sp-mobile-nav { display: none; }
				}
			`}</style>

			{flyingImage && <img src={flyingImage.src} alt="" className="sp-fly-image" style={{ '--start-x': `${flyingImage.startX}px`, '--start-y': `${flyingImage.startY}px`, '--end-x': `${flyingImage.endX}px`, '--end-y': `${flyingImage.endY}px`, '--curve-y': `${flyingImage.curveY || 48}px` }} />}

			{/* ===== TOP - 2 COLUMNS DARK ===== */}
			<div className="sp-top">
				<div className="sp-top-inner">
					{/* Left - Image */}
					<div className="sp-left-img">
						<div className="sp-left-img-inner">
							<button type="button" className="sp-img-nav prev" onClick={handlePrevImage} aria-label="Ảnh trước">‹</button>
							<button type="button" className="sp-img-nav next" onClick={handleNextImage} aria-label="Ảnh tiếp">›</button>
							<button type="button" className="sp-back-btn" onClick={() => navigate(-1)} aria-label="Quay lại">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
							</button>
							{activeImage ? (
								<img src={activeImage} alt={product?.name} className={`sp-main-img ${isImageTransitioning ? 'is-switching' : ''}`} onClick={() => setIsPreviewOpen(true)} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} />
							) : (<div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#2a2a2b', borderRadius: 16 }}>Không có hình ảnh</div>)}
						</div>
						{galleryImages.length > 1 && (
							<div className="sp-thumb-row">
								{galleryImages.map((item, index) => (
									<div key={item.id || `thumb-${index}`} className={`sp-thumb ${activeImage === item.image ? 'active' : ''}`} onClick={() => showImageAtIndex(index)}>
										<img src={item.image} alt="" />
									</div>
								))}
							</div>
						)}
					</div>

					{/* Right - Purchase Box */}
					<div className="sp-right-purchase">
						{/* Title */}
						<h1 className="sp-title">{product?.name}</h1>
						{product?.sku && <div className="sp-sku">Mã SP: {product.sku}</div>}

						{/* ===== Product Color Selector ===== */}
						{variants.length > 1 && (
							<div className="sp-color-selector">
								<div className="sp-color-label">
									<span>Màu:</span>
									<strong style={{ 
										color: (product?.color_code && (product.color_code.startsWith('#') || product.color_code.startsWith('rgb'))) ? product.color_code : 'inherit',
										background: (product?.color_code && product.color_code.includes('gradient')) ? product.color_code : 'none',
										WebkitBackgroundClip: (product?.color_code && product.color_code.includes('gradient')) ? 'text' : 'unset',
										WebkitTextFillColor: (product?.color_code && product.color_code.includes('gradient')) ? 'transparent' : 'unset',
                                        fontWeight: 800
									}}>
										{product?.color_name || 'Mặc định'}
									</strong>
								</div>
								<div className="sp-color-options">
									{variants.map((v) => {
										const isActive = v.id === product?.id;
										const isHex = v.color_code && (v.color_code.startsWith('#') || v.color_code.startsWith('rgb'));
                                        const isGradient = v.color_code && v.color_code.includes('gradient');
										
										return (
											<div 
												key={v.id} 
												className={`sp-color-btn ${isActive ? 'active' : ''}`}
												onClick={() => {
													if (!isActive) {
														navigate(`/san-pham/${v.slug}`);
													}
												}}
												title={v.color_name || v.name}
												style={{ 
													background: isGradient ? v.color_code : (isHex ? v.color_code : `url(${v.color_code})`),
													backgroundSize: 'cover'
												}}
											>
												{isActive && (
													<svg viewBox="0 0 24 24" fill="none" stroke={(isHex && v.color_code.toLowerCase() === '#ffffff') ? '#000' : '#fff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
														<polyline points="20 6 9 17 4 12"/>
													</svg>
												)}
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* ===== TGDĐ Box Saving ===== */}
						<div className="sp-box-saving">
							{/* Header gradient */}
							<div className="sp-saving-header">
								<div className="sp-saving-price">
									<b>Online Giá Rẻ Quá</b>
									<strong>{formatPrice(salePrice)}</strong>
									{regularPrice && regularPrice !== salePrice && <em>{formatPrice(regularPrice)}</em>}
									{discountPercent > 0 && <i>-{discountPercent}%</i>}
									{product?.refund_amount > 0 && (
										<span className="sp-refund-badge">
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="14" rx="2"/><path d="M12 11h4v2h-4zM6 15v-1M18 15v-1M12 15v-1"/></svg>
											Hoàn tiền {formatPrice(product.refund_amount)}
										</span>
									)}
								</div>
								<div className="sp-saving-time">
									<div className="sp-saving-time-label">Kết thúc sau</div>
									<div className="sp-saving-clock">
										<b>{pad(countdown.hours)}</b><i>:</i><b>{pad(countdown.minutes)}</b><i>:</i><b>{pad(countdown.seconds)}</b>
									</div>
									<div className="sp-saving-stock">
										<img src="https://cdnv2.tgdd.vn/webmwg/2024/ContentMwg/images/fs-iconfire.png" alt="" />
										<div className="sp-saving-stock-bar">
											<em style={{ width: `${(stockRemaining.current / stockRemaining.total) * 100}%` }} />
											<b>Còn {stockRemaining.current}/{stockRemaining.total}</b>
										</div>
									</div>
								</div>
							</div>

							{/* Content dark */}
							<div className="sp-saving-content">
								{/* Promo section */}
								{khuyenMaiItems.length > 0 && (
									<div className="sp-promo-section">
										<div className="sp-promo-choose-item active" onClick={() => setSelectedPromoIndex(0)}>
											<div className="sp-radio" />
											<div className="sp-promo-text">
												<b>Giảm giá sốc</b>
												<span>Đã giảm vào giá sản phẩm</span>
											</div>
										</div>
										{khuyenMaiItems.map((item, index) => (
											<div key={`promo-${index}`} className="sp-promo-item">
												{item.content}
											</div>
										))}
									</div>
								)}

								{/* Loyalty / Quà tặng */}
								{giftProducts.length > 0 ? (
									<div className="sp-loyalty">
										<div className="sp-loyalty-icon"><img src="https://sqhome.vn/wp-content/uploads/2022/08/cropped-favicon-192x192.png" alt="" /></div>
										<p><b>Quà tặng kèm:</b> {giftProducts.map(g => g.name || g.ten_san_pham || g.ten || g.title).join(', ')}</p>
									</div>
								) : (
									<></>
								)}

								{/* Rules */}
								<div className="sp-saving-rules">
									<ul>
										<li>100% Chính hãng (Sản phẩm authentic, đầy đủ VAT)</li>
										<li>Giao hàng nhanh (Miễn phí giao hàng trong Thanh Phố HCM)</li>
										<li>Đổi trả dễ dàng (Dễ dàng khi chưa lắp đặt, còn nguyên kiện hàng!)</li>
										<li>Thời gian bảo hành: Sứ 10 năm, Phụ kiện 2 năm!</li>
									</ul>
								</div>

								{/* Sản phẩm khuyến nghị mua kèm */}
								{featuredCompanionProducts.length > 0 && (
									<div className="sp-combo-promo">
										<div className="sp-combo-title">
											<b>Mua kèm tiết kiệm</b>
											<a href="javascript:void(0)" onClick={() => setActiveTab('sanpham')}>Xem tất cả</a>
										</div>
										<div className="sp-combo-list">
											{featuredCompanionProducts.slice(0, 3).map((item, index) => {
												const itemKey = getRecommendedProductKey(item, index)
												const isSelected = selectedRecommendedIds.includes(itemKey)
												const itemPrice = item?.sale_price || item?.price_sale || item?.price
												return (
													<div key={itemKey} className={`sp-combo-item ${isSelected ? 'active' : ''}`} onClick={() => {
														const next = isSelected ? selectedRecommendedIds.filter(k => k !== itemKey) : [...selectedRecommendedIds, itemKey]
														setSelectedRecommendedIds(next)
													}}>
														<div className="sp-combo-check">
															<div className="sp-combo-check-inner" />
														</div>
														<div className="sp-combo-img"><img src={item?.image} alt={item?.name} /></div>
														<div className="sp-combo-info">
															<div className="sp-combo-name">{item?.name}</div>
															<div className="sp-combo-price">{formatPrice(itemPrice)}</div>
														</div>
													</div>
												)
											})}
										</div>
									</div>
								)}

								{/* Quantity */}
								<div className="sp-qty-row">
									<span className="sp-qty-label">Số lượng</span>
									<div className="sp-qty-control">
										<button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
										<span>{quantity}</span>
										<button type="button" onClick={() => setQuantity((q) => q + 1)}>+</button>
									</div>
								</div>

								{/* Price Breakdown */}
								<div className="sp-price-breakdown">
									<div className="sp-breakdown-row">
										<span>Giá sản phẩm</span>
										<span>{formatPrice(salePriceValue)}</span>
									</div>
									{totalSelectedRecommendedPrice > 0 && (
										<div className="sp-breakdown-row highlight">
											<span>Khuyến nghị mua kèm</span>
											<span>+{formatPrice(totalSelectedRecommendedPrice)}</span>
										</div>
									)}
									<div className="sp-breakdown-row">
										<span>Số lượng</span>
										<span>× {quantity}</span>
									</div>
									<div className="sp-breakdown-total">
										<span>Tổng thanh toán</span>
										<strong>{formatPrice(combinedTotal)}</strong>
									</div>
									{product?.refund_amount > 0 && (
										<>
											<div className="sp-breakdown-row refund">
												<span>Tiết kiệm (Hoàn tiền)</span>
												<span>-{formatPrice(product.refund_amount * quantity)}</span>
											</div>
											<div className="sp-breakdown-row final-price">
												<span>Giá thực tế sau hoàn tiền</span>
												<strong>{formatPrice(combinedTotal - (product.refund_amount * quantity))}</strong>
											</div>
										</>
									)}
								</div>

								{/* Buy Buttons */}
								<div className="sp-buy-buttons">
									<button type="button" className="sp-btn sp-btn-buy-main" onClick={() => handleAddToCart({ redirectToCart: true })} disabled={isOutOfStock || isAddingToCart || isBuyingNow}>
										{isBuyingNow ? 'Đang xử lý...' : `MUA NGAY — TỔNG: ${formatPrice(combinedTotal)}`}
									</button>
									<button type="button" className="sp-btn sp-btn-cart" onClick={(e) => handleAddToCart({ redirectToCart: false, sourceEl: e.currentTarget })} disabled={isOutOfStock || isAddingToCart || isBuyingNow}>
										{isAddingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
									</button>
								</div>
							</div>
						</div>

						{/* Feedback */}
						{cartMessage && <div className={`sp-feedback ${cartMessageType}`}>{cartMessage}</div>}

						{/* Cart Summary */}
						{cartSummary && (
							<div className="sp-cart-summary">
								<div><p>Giỏ hàng hiện tại</p><strong>{cartSummary.total_quantity || 0} sản phẩm</strong></div>
								<span className="sp-cart-count">{cartCount}</span>
							</div>
						)}

						{/* Policy Box */}
						
					</div>
				</div>
			</div>

			{/* ===== BOTTOM - WHITE ===== */}
			<div className="sp-bottom">
				<div className="sp-bottom-inner">
					{/* Short Desc */}
					{sanitizedShortDescription && <div className="sp-short-desc" dangerouslySetInnerHTML={{ __html: sanitizedShortDescription }} />}

					{/* Related Products */}
					{featuredCompanionProducts.length > 0 && (
						<div className="sp-related">
							<h2>Sản phẩm khuyến nghị</h2>
							<div className="sp-related-grid">
								{featuredCompanionProducts.map((item, index) => {
									const itemKey = getRecommendedProductKey(item, index)
									const isSelected = selectedRecommendedIds.includes(itemKey)
									return (
										<Link key={item?.id || `related-${index}`} to={normalizeProductUrl(item)} className="sp-related-card">
											<div className="sp-related-img"><img src={item?.image} alt={item?.name} /></div>
											<div className="sp-related-info">
												<div className="sp-related-name">{item?.name}</div>
												<div className="sp-related-price-wrap">
													<div className="sp-related-price">{formatPrice(item?.sale_price || item?.price)}</div>
													<button type="button" className={`sp-related-add-btn ${isSelected ? 'selected' : ''}`}
														onClick={(e) => { e.preventDefault(); e.stopPropagation(); const next = isSelected ? selectedRecommendedIds.filter(k => k !== itemKey) : [...selectedRecommendedIds, itemKey]; setSelectedRecommendedIds(next) }}
														title={isSelected ? 'Đã chọn' : 'Chọn mua kèm'}>+</button>
												</div>
											</div>
										</Link>
									)
								})}
							</div>
						</div>
					)}

					{/* Tabs */}
					<div className="sp-tabs">
						<button type="button" className={`sp-tab ${activeTab === 'thongtin' ? 'active' : ''}`} onClick={() => setActiveTab('thongtin')}>Thông tin sản phẩm</button>
						<button type="button" className={`sp-tab ${activeTab === 'thongsokythuat' ? 'active' : ''}`} onClick={() => setActiveTab('thongsokythuat')}>Thông số kỹ thuật</button>
					</div>

					{/* Tab Content */}
					<div className="sp-tab-content">
						{activeTab === 'thongtin' && (
							<div>
								<h2>Chi tiết sản phẩm</h2>
								{sanitizedDescription ? <div className="sp-desc-content" dangerouslySetInnerHTML={{ __html: sanitizedDescription }} /> : <p style={{ color: '#86868b' }}>Nội dung đang được cập nhật...</p>}
							</div>
						)}
						{activeTab === 'thongsokythuat' && (
							<div>
								<h2>Thông số kỹ thuật</h2>
								{groupedProductSpecs.length > 0 ? (
									<div className="sp-specs-grouped-wrap">
										<div className="sp-specs-grouped-header">
											<div className="sp-specs-grouped-header-icon">
												<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
											</div>
											<div className="sp-specs-grouped-header-text">
												<h3>Thông số kỹ thuật chi tiết</h3>
												<p>{productSpecs.length} thông số được ghi nhận</p>
											</div>
										</div>
										<div className="sp-specs-categories">
											{groupedProductSpecs.map((group, groupIndex) => (
												<div key={`specs-group-${groupIndex}`} className="sp-specs-category">
													<div className="sp-specs-category-header">
														<div className="sp-specs-category-icon">
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
														</div>
														<span>{group.category}</span>
														<span className="sp-specs-category-count">{group.specs.length} thông số</span>
													</div>
													<div className="sp-specs-category-items">
														{group.specs.map((item, itemIndex) => (
															<div key={`specs-item-${groupIndex}-${itemIndex}`} className="sp-specs-item">
																<div className="sp-specs-item-label">{item.label}</div>
																<div className="sp-specs-item-value">{item.value}</div>
															</div>
														))}
													</div>
												</div>
											))}
										</div>
									</div>
								) : aiSpecsLoading ? (
									<div className="sp-specs-grouped-wrap">
										<div className="sp-specs-loading">
											<div className="sp-specs-spinner" />
											<span>Đang tải thông số kỹ thuật bằng AI...</span>
										</div>
									</div>
								) : aiSpecs && aiSpecs.length > 0 ? (
									<div className="sp-specs-grouped-wrap">
										<div className="sp-specs-grouped-header ai">
											<div className="sp-specs-grouped-header-icon">
												<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
											</div>
											<div className="sp-specs-grouped-header-text">
												<h3>Thông số kỹ thuật</h3>
												<p>{aiSpecs.reduce((sum, g) => sum + g.specs.length, 0)} thông số được trích xuất </p>
											</div>
										</div>
										<div className="sp-specs-categories">
											{aiSpecs.map((group, groupIndex) => (
												<div key={`ai-specs-group-${groupIndex}`} className="sp-specs-category">
													<div className="sp-specs-category-header">
														<div className="sp-specs-category-icon">
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
														</div>
														<span>{group.category}</span>
														<span className="sp-specs-category-count">{group.specs.length} thông số</span>
													</div>
													<div className="sp-specs-category-items">
														{group.specs.map((item, itemIndex) => (
															<div key={`ai-specs-item-${groupIndex}-${itemIndex}`} className="sp-specs-item">
																<div className="sp-specs-item-label">{item.label}</div>
																<div className="sp-specs-item-value">
																	{/\.(jpg|jpeg|png|gif|webp|svg|pdf)(\?.*)?$/i.test(item.value) ? (
																		<img src={item.value} alt={item.label} style={{ maxWidth: '200px', maxHeight: '150px', cursor: 'pointer' }} onClick={() => window.open(item.value, '_blank')} />
																	) : (
																		item.value
																	)}
																</div>
															</div>
														))}
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className="sp-specs-grouped-wrap">
										<div className="sp-specs-empty">
											<div className="sp-specs-empty-icon">
												<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
											</div>
											<p>Thông số kỹ thuật đang được cập nhật...</p>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Mobile Bottom Nav */}
			<div className="sp-mobile-nav">
				<div className="sp-mobile-price"><span>Tạm tính</span><strong>{formatPrice(combinedTotal)}</strong></div>
				<div className="sp-mobile-actions">
					<button type="button" className="sp-btn sp-btn-cart" onClick={() => handleAddToCart({ redirectToCart: false })} disabled={isOutOfStock || isAddingToCart || isBuyingNow}>Thêm vào giỏ</button>
					<button type="button" className="sp-btn sp-btn-buy" onClick={() => handleAddToCart({ redirectToCart: true })} disabled={isOutOfStock || isAddingToCart || isBuyingNow}>Mua ngay</button>
				</div>
			</div>

		{/* Preview */}
		{isPreviewOpen && activeImage && (
			<div className="sp-preview-overlay" onClick={handlePreviewClose}>
				<button type="button" className="sp-preview-close" onClick={handlePreviewClose} aria-label="Đóng">×</button>
				{galleryImages.length > 1 && <><button type="button" className="sp-preview-nav prev" onClick={(e) => { e.stopPropagation(); handlePrevImage(); setZoomState({ scale: 1, x: 0, y: 0 }) }} aria-label="Ảnh trước">‹</button><button type="button" className="sp-preview-nav next" onClick={(e) => { e.stopPropagation(); handleNextImage(); setZoomState({ scale: 1, x: 0, y: 0 }) }} aria-label="Ảnh tiếp">›</button></>}
				<div className="sp-preview-img-wrap"
					onClick={(e) => e.stopPropagation()}
					onTouchStart={handlePreviewTouchStart}
					onTouchMove={handlePreviewTouchMove}
					onTouchEnd={() => {}}
					onWheel={handlePreviewWheel}
					onMouseDown={handlePreviewMouseDown}
					onMouseMove={handlePreviewMouseMove}
					onMouseUp={() => {}}
				>
					<img
						src={activeImage}
						alt={product?.name}
						className="sp-preview-img"
						style={{ transform: `scale(${zoomState.scale}) translate(${zoomState.x / zoomState.scale}px, ${zoomState.y / zoomState.scale}px)` }}
						onClick={handlePreviewClick}
						draggable={false}
					/>
				</div>
				<div className="sp-preview-zoom-controls" onClick={(e) => e.stopPropagation()}>
					<button type="button" className="sp-preview-zoom-btn" onClick={(e) => { e.stopPropagation(); setZoomState(prev => ({ ...prev, scale: Math.max(1, prev.scale - 0.5), x: 0, y: 0 })) }} disabled={zoomState.scale <= 1} aria-label="Thu nhỏ">−</button>
					<span className="sp-preview-zoom-scale">{Math.round(zoomState.scale * 100)}%</span>
					<button type="button" className="sp-preview-zoom-btn" onClick={(e) => { e.stopPropagation(); setZoomState(prev => ({ ...prev, scale: Math.min(4, prev.scale + 0.5), x: 0, y: 0 })) }} disabled={zoomState.scale >= 4} aria-label="Phóng to">+</button>
				</div>
				{zoomState.scale === 1 && <div className="sp-preview-zoom-hint">Nhấn 2 lần để zoom · Kéo để xem chi tiết</div>}
			</div>
		)}
		</section>
	)
}
