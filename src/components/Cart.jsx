import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { buildApiUrl, buildCartRequestConfig, syncCartTokenFromResponse } from '../utils/api'
import { buildAbsoluteUrl, useSeo } from '../utils/seo'

const formatPrice = (value) => {
	if (value === null || value === undefined || value === "") return "";
	if (typeof value === "string" && value.includes("₫")) return value;
	// Parse float keeps the decimal if present, floor removes it
	const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, "")));
	if (isNaN(numValue)) return value;
	return `${numValue.toLocaleString("vi-VN")}₫`;
};

const normalizeProductUrl = (item) => item?.url || `/san-pham/${item?.slug || item?.product_id || ''}`

const getItemPrice = (item) => {
	if (item?.price) return item.price
	if (item?.price_value !== undefined && item?.price_value !== null) return formatPrice(item.price_value)
	if (item?.line_total && Number(item?.quantity || 0) <= 1) return item.line_total
	if (item?.line_total_value !== undefined && item?.line_total_value !== null && Number(item?.quantity || 0) > 0) {
		return formatPrice(Number(item.line_total_value) / Number(item.quantity || 1))
	}
	return formatPrice(0)
}

const getLineTotal = (item) => item?.line_total || formatPrice(item?.line_total_value || 0)

const normalizeVietnamAddress = ({ city = '', ward = '', street = '' }) => {
	const segments = [street, ward, city]
		.map((value) => String(value || '').replace(/\s+/g, ' ').trim())
		.filter(Boolean)

	return segments.join(', ')
}

const parseVietnamAddress = (value) => {
	const normalized = String(value || '').trim()
	if (!normalized) {
		return { street: '', ward: '', city: '' }
	}

	const pieces = normalized
		.split(',')
		.map((item) => item.replace(/\s+/g, ' ').trim())
		.filter(Boolean)

	if (pieces.length >= 3) {
		const city = pieces[pieces.length - 1]
		const ward = pieces[pieces.length - 2]
		const street = pieces.slice(0, -2).join(', ')
		return { street, ward, city }
	}

	if (pieces.length === 2) {
		return { street: pieces[0], ward: '', city: pieces[1] }
	}

	return { street: pieces[0], ward: '', city: '' }
}

export default function Cart() {
	const navigate = useNavigate()
	useSeo({
		title: 'Giỏ hàng | SQHOME',
		description: 'Xem lại sản phẩm trong giỏ hàng SQHOME, cập nhật thông tin giao hàng và hoàn tất đơn mua nhanh chóng.',
		canonical: buildAbsoluteUrl('/cart'),
	})
	const fullNameRef = useRef(null)
	const phoneRef = useRef(null)
	const emailRef = useRef(null)
	const addressRef = useRef(null)
	const [cartData, setCartData] = useState({ items: [], summary: null })
	const [isLoading, setIsLoading] = useState(true)
	const [isUpdating, setIsUpdating] = useState(false)
	const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
	const [showTransferModal, setShowTransferModal] = useState(false)
	const [transferCopied, setTransferCopied] = useState('')
	const [cartMessage, setCartMessage] = useState('')
	const [cartMessageType, setCartMessageType] = useState('success')
	const [fieldErrors, setFieldErrors] = useState({})
	const [customerForm, setCustomerForm] = useState({
		fullName: '',
		phone: '',
		email: '',
		city: 'Thành phố Hồ Chí Minh',
		ward: '',
		street: '',
		addressLine: '',
		note: '',
	})

	const items = Array.isArray(cartData?.items) ? cartData.items : []
	const summary = cartData?.summary || null

	const totalRegular = useMemo(
		() =>
			items.reduce((total, item) => {
				const regular = Number(String(item?.regular_price || '').replace(/[^\d]/g, '')) || 0
				return total + regular * Number(item?.quantity || 0)
			}, 0),
		[items]
	)

	const totalRefund = useMemo(
		() =>
			items.reduce((total, item) => {
				const refund = Number(item?.refund_amount || 0)
				return total + refund * Number(item?.quantity || 0)
			}, 0),
		[items]
	)

	const hasRefundItems = items.some(item => Number(item?.refund_amount || 0) > 0)

	const totalQuantity = Number(summary?.total_quantity || items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0))
	const itemsCombinedTotal = summary?.subtotal || formatPrice(summary?.subtotal_value || 0)
	const totalPayableValue = useMemo(() => {
		const sub = Number(summary?.subtotal_value ?? 0)
		const ref = Number(summary?.total_refund_value ?? 0)
		if (summary?.total_payable_value != null && summary?.total_payable_value !== '')
			return Math.max(0, Number(summary.total_payable_value))
		return Math.max(0, sub - ref)
	}, [summary?.subtotal_value, summary?.total_refund_value, summary?.total_payable_value])
	const totalPayableDisplay = summary?.total_payable || formatPrice(totalPayableValue)
	const inputRefs = {
		fullName: fullNameRef,
		phone: phoneRef,
		email: emailRef,
		addressLine: addressRef,
	}

	const setFeedback = (message, type = 'success') => {
		setCartMessage(message)
		setCartMessageType(type)
	}

	const loadCart = async ({ withLoader = false } = {}) => {
		if (withLoader) setIsLoading(true)
		try {
			const response = await axios.get(buildApiUrl('/get/cart'), buildCartRequestConfig())
			syncCartTokenFromResponse(response?.data)
			setCartData({
				items: Array.isArray(response?.data?.items) ? response.data.items : [],
				summary: response?.data?.summary || null,
			})
			// Đồng bộ cart count trên toàn app
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('cart-count-updated', {
						detail: { count: Number(response?.data?.summary?.total_quantity || 0) },
					})
				)
			}
		} catch (error) {
			console.error('Cart API error:', error)
			setFeedback('Không thể tải giỏ hàng lúc này. Vui lòng thử lại.', 'error')
		} finally {
			if (withLoader) setIsLoading(false)
		}
	}


	useEffect(() => {
		loadCart({ withLoader: true })

		// Listen for cart reload event from anywhere in the app
		const reloadHandler = () => loadCart({ withLoader: true })
		window.addEventListener('force-cart-reload', reloadHandler)
		return () => {
			window.removeEventListener('force-cart-reload', reloadHandler)
		}
	}, [])

	useEffect(() => {
		if (!cartMessage) return undefined
		const timer = window.setTimeout(() => setCartMessage(''), 2600)
		return () => window.clearTimeout(timer)
	}, [cartMessage])

	useEffect(() => {
		const previousBackground = document.body.style.background
		const previousMinHeight = document.body.style.minHeight
		document.body.style.background = '#ece9e9'
		document.body.style.minHeight = '100vh'

		return () => {
			document.body.style.background = previousBackground
			document.body.style.minHeight = previousMinHeight
		}
	}, [])

	const handleUpdateQuantity = async (productId, quantity) => {
		if (!productId) return
		if (quantity <= 0) {
			await handleRemoveItem(productId)
			return
		}
		setIsUpdating(true)
		try {
			const response = await axios.post(
				buildApiUrl('/get/cart/update'),
				{ product_id: productId, quantity },
				buildCartRequestConfig()
			)
			syncCartTokenFromResponse(response?.data)
			await loadCart()
			setFeedback('Đã cập nhật số lượng sản phẩm.')
			// Đồng bộ cart count trên toàn app
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('cart-count-updated', {
						detail: { count: Number(response?.data?.summary?.total_quantity || 0) },
					})
				)
			}
		} catch (error) {
			console.error('Cart update API error:', error)
			setFeedback('Không thể cập nhật giỏ hàng lúc này.', 'error')
		} finally {
			setIsUpdating(false)
		}
	}

	const handleRemoveItem = async (productId) => {
		if (!productId) return
		setIsUpdating(true)
		try {
			const response = await axios.post(
				buildApiUrl('/get/cart/remove'),
				{ product_id: productId },
				buildCartRequestConfig()
			)
			syncCartTokenFromResponse(response?.data)
			await loadCart()
			setFeedback('Đã xoá sản phẩm khỏi giỏ hàng.')
			// Đồng bộ cart count trên toàn app
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('cart-count-updated', {
						detail: { count: Number(response?.data?.summary?.total_quantity || 0) },
					})
				)
			}
		} catch (error) {
			console.error('Cart remove API error:', error)
			setFeedback('Không thể xoá sản phẩm khỏi giỏ hàng.', 'error')
		} finally {
			setIsUpdating(false)
		}
	}

	const handleFormChange = (field) => (event) => {
		const nextValue = event.target.value

		setFieldErrors((prev) => {
			if (!prev[field]) return prev
			const nextErrors = { ...prev }
			delete nextErrors[field]
			return nextErrors
		})

		if (field === 'addressLine') {
			const parsed = parseVietnamAddress(nextValue)
			setCustomerForm((prev) => ({
				...prev,
				addressLine: nextValue,
				street: parsed.street,
				ward: parsed.ward,
				city: parsed.city,
			}))
			return
		}

		setCustomerForm((prev) => {
			const nextForm = { ...prev, [field]: nextValue }
			if (field === 'street' || field === 'ward' || field === 'city') {
				nextForm.addressLine = normalizeVietnamAddress(nextForm)
			}
			return nextForm
		})
	}

	const scrollToField = (field) => {
		const targetRef = inputRefs[field]
		const element = targetRef?.current
		if (!element) return

		const rect = element.getBoundingClientRect()
		const absoluteTop = window.scrollY + rect.top - 120
		window.scrollTo({ top: Math.max(absoluteTop, 0), behavior: 'smooth' })
		window.setTimeout(() => {
			element.focus({ preventScroll: true })
		}, 220)
	}

	const validateCheckoutForm = () => {
		const nextErrors = {}
		const fullName = customerForm.fullName.trim()
		const phone = customerForm.phone.trim()
		const email = customerForm.email.trim()
		const address = customerForm.addressLine.trim()

		if (!fullName) nextErrors.fullName = 'Vui lòng nhập họ và tên người nhận.'
		if (!phone) nextErrors.phone = 'Vui lòng nhập số điện thoại.'
		if (!address) nextErrors.addressLine = 'Vui lòng nhập địa chỉ nhận hàng.'
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			nextErrors.email = 'Email chưa đúng định dạng.'
		}

		setFieldErrors(nextErrors)

		const firstInvalidField = Object.keys(nextErrors)[0]
		if (firstInvalidField) {
			setFeedback('Vui lòng kiểm tra lại các thông tin đang được tô đỏ bên dưới.', 'error')
			scrollToField(firstInvalidField)
			return false
		}

		return true
	}

	const handleSubmitOrder = async () => {
		if (!validateCheckoutForm()) return

		const fullName = customerForm.fullName.trim()
		const phone = customerForm.phone.trim()
		const email = customerForm.email.trim()
		const address = customerForm.addressLine.trim()
		const note = customerForm.note.trim()
		const city = customerForm.city.trim()
		const state = customerForm.city.trim()

		setIsSubmittingOrder(true)
		try {
			const response = await axios.post(
				buildApiUrl('/get/buy'),
				{
					full_name: fullName,
					phone,
					address,
					email,
					city,
					state,
					note,
				},
				buildCartRequestConfig({
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
				})
			)
			syncCartTokenFromResponse(response?.data)

			const nextCart = response?.data?.cart
			if (nextCart) {
				setCartData({
					items: Array.isArray(nextCart?.items) ? nextCart.items : [],
					summary: nextCart?.summary || null,
				})
			}
			setFeedback(response?.data?.message || 'Đặt hàng thành công. Chúng tôi sẽ liên hệ với bạn sớm nhất.', 'success')
			navigate('/don-hang-da-mua', {
				state: {
					order: response?.data?.order || null,
					message: response?.data?.message || '',
				},
			})
		} catch (error) {
			console.error('Buy API error:', error)
			setFeedback(error?.response?.data?.message || 'Không thể gửi đơn hàng lúc này. Vui lòng thử lại.', 'error')
		} finally {
			setIsSubmittingOrder(false)
		}
	}

	if (isLoading) {
		return (
			<section>
				<div style={{ minHeight: '72vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
					<div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.08)', borderTopColor: '#1677e5', animation: 'spin 0.8s linear infinite' }} />
					<p style={{ color: '#5f6368', fontSize: 15 }}>Đang tải giỏ hàng...</p>
					<style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
				</div>
			</section>
		)
	}

	return (
		<section>
			<style>{`
				.cart-page { max-width: 780px; margin: 0 auto; padding: 18px 16px 42px; }
				.cart-frame { background: #fff; border: 1px solid #ebebeb; border-radius: 20px; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08); overflow: hidden; }
				.cart-empty { padding: 42px 24px; text-align: center; }
				.cart-empty h2 { font-size: 28px; line-height: 36px; color: #1f2937; margin-bottom: 10px; }
				.cart-empty p { color: #6b7280; font-size: 15px; line-height: 24px; margin-bottom: 18px; }
				.cart-empty a { display: inline-flex; align-items: center; justify-content: center; min-width: 200px; height: 48px; border-radius: 14px; background: #1677e5; color: #fff; font-weight: 700; }
				.cart-feedback { margin: 14px 20px 0; padding: 12px 14px; border-radius: 12px; font-size: 14px; }
				.cart-feedback.success { background: #edf7ee; color: #1f7a35; }
				.cart-feedback.error { background: linear-gradient(180deg, #fff1f2 0%, #ffe7ea 100%); color: #c62828; border: 1px solid #f8c7cf; box-shadow: 0 10px 28px rgba(198, 40, 40, 0.08); }
				.cart-section { padding: 22px 34px; border-top: 1px solid #ececec; }
				.cart-section:first-of-type { border-top: 0; }
				.cart-product-list { display: grid; gap: 18px; }
				.cart-product { display: grid; grid-template-columns: 84px minmax(0, 1fr) auto; gap: 16px; align-items: start; }
				.cart-product + .cart-product { padding-top: 18px; border-top: 1px solid #ececec; }
				.cart-product-thumb { width: 84px; height: 84px; background: #fff; border-radius: 14px; border: 1px solid #efefef; display: flex; align-items: center; justify-content: center; overflow: hidden; }
				.cart-product-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
				.cart-product-main { min-width: 0; }
				.cart-product-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
				.cart-product-name { font-size: 17px; line-height: 25px; font-weight: 600; color: #1f2937; }
				.cart-product-price { white-space: nowrap; font-size: 17px; line-height: 24px; font-weight: 700; color: #2f3136; }
				.cart-product-promo { margin-top: 6px; display: inline-flex; align-items: center; gap: 6px; color: #4b5563; font-size: 14px; }
					/* Gift items inside cart product */
					.cart-product-gifts { margin-top: 10px; padding: 10px; background: linear-gradient(180deg, #f8fffa 0%, #f1fff4 100%); border-radius: 12px; border: 1px solid rgba(20, 120, 60, 0.06); }
					.cart-product-gifts-title { font-size: 13px; font-weight: 700; color: #0f5132; margin-bottom: 8px; }
					.cart-product-gifts-list { display: flex; gap: 10px; flex-wrap: wrap; }
					.cart-gift-item { display: flex; gap: 10px; align-items: center; background: transparent; padding: 6px 8px; border-radius: 10px; min-width: 0; }
					.cart-gift-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid #e9f3ea; background: #fff; }
					.cart-gift-meta { min-width: 0; }
					.cart-gift-name { font-size: 13px; font-weight: 600; color: #0b2540; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
					.cart-gift-badge { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 999px; background: #13a059; color: #fff; font-size: 11px; font-weight: 700; }
				.cart-product-controls { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
				.cart-remove-link { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #f0d1d4; background: linear-gradient(180deg, #fff 0%, #fff7f8 100%); color: #c43d4b; font-size: 14px; font-weight: 600; box-shadow: 0 10px 24px rgba(196, 61, 75, 0.08); transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
				.cart-remove-link:hover { transform: translateY(-1px); border-color: #e7b9bf; box-shadow: 0 14px 28px rgba(196, 61, 75, 0.12); }
				.cart-remove-link::before { content: '✕'; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; background: rgba(196, 61, 75, 0.1); font-size: 11px; }
				.cart-qty { display: inline-flex; align-items: center; gap: 3px; }
				.cart-qty button, .cart-qty span { width: 28px; height: 28px; border-radius: 4px; border: 1px solid #e6e6e6; background: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; color: #374151; }
				.cart-qty span { font-size: 15px; font-weight: 600; background: #f7f7f7; }
				.cart-subtotal { margin-top: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 700; color: #2f3136; }
				.cart-subtotal span:first-child { font-weight: 600; }
				.cart-refund-badge { margin-top: 8px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid rgba(34,197,94,0.2); }
				.cart-refund-label { font-size: 13px; font-weight: 600; color: #15803d; }
				.cart-refund-value { font-size: 14px; font-weight: 700; color: #16a34a; }
				.summary-refund-row { margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 700; color: #15803d; }
				.summary-refund-row .refund-amount { color: #16a34a; font-size: 17px; }
				.cart-items-total { margin-top: 2px; padding-top: 18px; border-top: 1px solid #ececec; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 700; color: #2f3136; }
				.cart-items-total strong { color: #ef3232; font-size: 20px; }
				.section-title { font-size: 17px; line-height: 24px; font-weight: 700; color: #2f3136; margin-bottom: 18px; }
				.radio-row { display: flex; gap: 28px; flex-wrap: wrap; }
				.radio-item { display: inline-flex; align-items: center; gap: 10px; color: #3f3f46; font-size: 14px; }
				.radio-item input { width: 21px; height: 21px; accent-color: #1677e5; }
				.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
				.form-field { width: 100%; height: 58px; padding: 0 18px; border-radius: 14px; border: 1px solid #dedede; background: #fff; font-size: 15px; color: #2f3136; transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
				.form-field.field-error { border-color: #ef4444; background: #fff7f7; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1); color: #991b1b; }
				.form-field:focus { border-color: #1677e5; box-shadow: 0 0 0 4px rgba(22, 119, 229, 0.12); }
				.field-error-text { margin-top: 8px; color: #dc2626; font-size: 13px; line-height: 18px; font-weight: 600; }
				.field-stack { display: flex; flex-direction: column; }
				.delivery-box { background: #f6f6f6; border-radius: 16px; padding: 16px; margin-top: 16px; }
				.delivery-address-label { display: block; margin-bottom: 10px; color: #4b5563; font-size: 14px; font-weight: 600; }
				.note-field { margin-top: 18px; width: 100%; height: 58px; padding: 0 18px; border-radius: 14px; border: 1px solid #dedede; background: #fff; font-size: 15px; color: #2f3136; }
				.cart-delivery-note { margin-top: 16px; position: relative; overflow: hidden; border-radius: 18px; padding: 15px 16px 15px 18px; border: 1px solid #ffd7ae; background: linear-gradient(135deg, #fff8ec 0%, #fff2dc 100%); box-shadow: 0 14px 30px rgba(245, 158, 11, 0.08); }
				.cart-delivery-note::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 5px; background: linear-gradient(180deg, #f59e0b 0%, #ea580c 100%); }
				.cart-delivery-note strong { display: block; color: #9a3412; font-size: 14px; line-height: 22px; margin-bottom: 4px; }
				.cart-delivery-note p { color: #7c2d12; font-size: 14px; line-height: 22px; }
				.summary-section { padding-top: 18px; }
				.summary-total-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
				.summary-total-row { margin-top: 18px; font-size: 18px; font-weight: 700; color: #2f3136; }
				.summary-total-row strong { color: #ef3232; font-size: 18px; }
				.summary-row--muted { font-size: 16px; font-weight: 600; color: #4b5563; margin-top: 12px; }
				.summary-row--muted strong { color: #374151; font-size: 16px; font-weight: 700; }
				.summary-pay-row { margin-top: 14px; padding-top: 14px; border-top: 2px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 19px; font-weight: 800; color: #111827; }
				.summary-pay-row strong { color: #b91c1c; font-size: 21px; }
				.transfer-info-btn { margin-top: 12px; width: 100%; height: 46px; border-radius: 14px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 15px; font-weight: 700; border: none; cursor: pointer; transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s; box-shadow: 0 6px 20px rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; gap: 8px; }
				.transfer-info-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 10px 28px rgba(16,185,129,0.32); }
				.checkout-btn { margin-top: 10px; width: 100%; height: 56px; border-radius: 14px; background: #1677e5; color: #fff; font-size: 17px; font-weight: 700; transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
				.checkout-btn:not(:disabled):hover { background: #0f67c7; transform: translateY(-1px); box-shadow: 0 16px 30px rgba(22, 119, 229, 0.22); }
				.checkout-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
				.summary-footnote { margin-top: 12px; text-align: center; color: #4b5563; font-size: 14px; }
				/* === TRANSFER MODAL === */
				.transfer-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(3px); }
				.transfer-modal { background: #fff; border-radius: 20px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.22); }
				.transfer-modal-header { display: flex; align-items: flex-start; gap: 14px; padding: 22px 24px 18px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 20px 20px 0 0; position: relative; }
				.transfer-modal-icon { font-size: 32px; flex-shrink: 0; }
				.transfer-modal-title { color: #fff; font-size: 19px; font-weight: 800; line-height: 1.3; margin-bottom: 4px; }
				.transfer-modal-subtitle { color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.5; }
				.transfer-modal-subtitle strong { color: #fef08a; }
				.transfer-modal-close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.2); color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
				.transfer-modal-close:hover { background: rgba(255,255,255,0.35); }
				.transfer-modal-body { padding: 20px 24px 24px; }
				.transfer-account-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 14px; }
				.transfer-account-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; }
				.transfer-account-row + .transfer-account-row { border-top: 1px solid #f0f0f0; }
				.transfer-label { color: #64748b; font-size: 14px; font-weight: 500; }
				.transfer-value { color: #1e293b; font-size: 15px; font-weight: 700; }
				.transfer-value--mono { font-family: 'Courier New', monospace; letter-spacing: 0.5px; font-size: 15px; }
				.transfer-copy-row { display: flex; align-items: center; gap: 8px; }
				.transfer-copy-btn { height: 30px; padding: 0 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
				.transfer-copy-btn:hover { background: #f1f5f9; border-color: #10b981; color: #10b981; }
				.transfer-amount-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 14px; padding: 16px 20px; margin-bottom: 14px; text-align: center; }
				.transfer-amount-label { color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 6px; }
				.transfer-amount-value { color: #fff; font-size: 28px; font-weight: 900; letter-spacing: 0.5px; }
				.transfer-amount-note { color: rgba(255,255,255,0.65); font-size: 12px; margin-top: 4px; }
				.transfer-content-guide { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; }
				.transfer-guide-title { color: #92400e; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
				.transfer-content-example { color: #78350f; font-size: 16px; font-weight: 700; margin-bottom: 6px; }
				.transfer-content-note { color: #92400e; font-size: 13px; }
				.transfer-content-sample { background: #fef3c7; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
				.transfer-important { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; }
				.transfer-important-title { color: #9f1239; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
				.transfer-important-list { margin: 0; padding-left: 18px; color: #881337; font-size: 13px; line-height: 1.8; }
				.transfer-cta { display: flex; flex-direction: column; gap: 10px; }
				.transfer-zalo-btn { display: flex; align-items: center; justify-content: center; height: 50px; border-radius: 12px; background: linear-gradient(135deg, #0068ff, #004ecc); color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; transition: opacity 0.2s, transform 0.2s; }
				.transfer-zalo-btn:hover { opacity: 0.9; transform: translateY(-1px); }
				.transfer-call-btn { display: flex; align-items: center; justify-content: center; height: 50px; border-radius: 12px; background: #fff; color: #059669; font-size: 15px; font-weight: 700; text-decoration: none; border: 2px solid #059669; transition: all 0.2s; }
				.transfer-call-btn:hover { background: #ecfdf5; }
				.transfer-order-btn { height: 56px; border-radius: 14px; background: #10b981; color: #fff; font-size: 17px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 24px rgba(16,185,129,0.3); }
				.transfer-order-btn:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 12px 30px rgba(16,185,129,0.35); }
				.transfer-order-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
				.transfer-cancel-btn { height: 42px; border-radius: 10px; background: #f1f5f9; color: #64748b; font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: all 0.18s; }
				.transfer-cancel-btn:hover { background: #e2e8f0; }
				@media (max-width: 767px) {
					.cart-page { padding: 12px 8px 28px; }
					.cart-frame { border-radius: 16px; }
					.cart-section { padding: 18px 16px; }
					.cart-product { grid-template-columns: 72px minmax(0, 1fr); }
					.cart-product-thumb { width: 72px; height: 72px; }
					.cart-product-top { flex-direction: column; }
					.cart-product-price { white-space: normal; }
					.cart-product-controls { align-items: flex-start; }
					.form-grid { grid-template-columns: 1fr; }
					.radio-row { gap: 14px; flex-direction: column; }
					.transfer-modal { border-radius: 20px 20px 0 0; max-height: 95vh; }
					.transfer-modal-overlay { align-items: flex-end; padding: 0; }
				}
			`}</style>

			<div className="cart-page">
				<div className="cart-frame">
					{items.length === 0 ? (
						<div className="cart-empty">
							<h2>Giỏ hàng của bạn đang trống</h2>
							<p>Chọn thêm sản phẩm ngay!</p>
							<Link to="/">Tiếp tục mua sắm</Link>
						</div>
					) : (
						<>
							{cartMessage ? <div className={`cart-feedback ${cartMessageType}`}>{cartMessage}</div> : null}
							<div className="cart-section">
								<div className="cart-product-list">
									{items.map((item) => {
										const quantity = Number(item?.quantity || 0)
										return (
											<div className="cart-product" key={item?.product_id || item?.slug || item?.name}>
												<Link to={normalizeProductUrl(item)} className="cart-product-thumb">
													<img src={item?.image} alt={item?.name} />
												</Link>
												<div className="cart-product-main">
													<div className="cart-product-top">
														<div>
															<Link to={normalizeProductUrl(item)} className="cart-product-name">{item?.name}</Link>
														</div>
													</div>
													<div className="cart-product-controls">
														<button type="button" className="cart-remove-link" onClick={() => handleRemoveItem(item?.product_id)} disabled={isUpdating}>Xóa sản phẩm</button>
														<div className="cart-qty">
															<button type="button" onClick={() => handleUpdateQuantity(item?.product_id, quantity - 1)} disabled={isUpdating}>−</button>
															<span>{quantity}</span>
															<button type="button" onClick={() => handleUpdateQuantity(item?.product_id, quantity + 1)} disabled={isUpdating}>+</button>
														</div>
													</div>
													<div className="cart-subtotal">
														<span>Tạm tính ({quantity} sản phẩm):</span>
														<span>{getLineTotal(item)}</span>
													</div>
													{Number(item?.refund_amount || 0) > 0 ? (
														<div className="cart-refund-badge">
															<span className="cart-refund-label">Hoàn tiền:</span>
															<span className="cart-refund-value">{formatPrice(Number(item?.refund_amount || 0) * quantity)}</span>
														</div>
													) : null}
													{Array.isArray(item?.san_pham_qua_tang) && item.san_pham_qua_tang.length ? (
														<div className="cart-product-gifts" aria-hidden="false">
															<div className="cart-product-gifts-title">Quà tặng kèm</div>
															<div className="cart-product-gifts-list">
																{item.san_pham_qua_tang.map((gift) => (
																	<div className="cart-gift-item" key={gift?.id || gift?.slug || gift?.name}>
																		<img className="cart-gift-thumb" src={gift?.image || gift?.thumbnail || gift?.thumb} alt={gift?.name} />
																		<div className="cart-gift-meta">
																			<div className="cart-gift-name">{gift?.name}</div>
																			<span className="cart-gift-badge">Quà tặng</span>
																		</div>
																	</div>
																))}
															</div>
														</div>
													) : null}
												</div>
											</div>
										)
									})}
										<div className="cart-items-total">
											<span>Tổng giá sản phẩm:</span>
											<strong>{itemsCombinedTotal}</strong>
										</div>
								</div>
							</div>
							<div className="cart-section">
								<div className="section-title">Thông tin khách hàng</div>
								<div className="form-grid">
									<div className="field-stack">
										<input ref={fullNameRef} className={`form-field ${fieldErrors.fullName ? 'field-error' : ''}`} type="text" placeholder="Họ và Tên" value={customerForm.fullName} onChange={handleFormChange('fullName')} />
										{fieldErrors.fullName ? <span className="field-error-text">{fieldErrors.fullName}</span> : null}
									</div>
									<div className="field-stack">
										<input ref={phoneRef} className={`form-field ${fieldErrors.phone ? 'field-error' : ''}`} type="tel" placeholder="Số điện thoại" value={customerForm.phone} onChange={handleFormChange('phone')} />
										{fieldErrors.phone ? <span className="field-error-text">{fieldErrors.phone}</span> : null}
									</div>
									<div className="field-stack">
										<input ref={emailRef} className={`form-field ${fieldErrors.email ? 'field-error' : ''}`} type="email" placeholder="Email (không bắt buộc)" value={customerForm.email} onChange={handleFormChange('email')} />
										{fieldErrors.email ? <span className="field-error-text">{fieldErrors.email}</span> : null}
									</div>
								</div>
							</div>
							<div className="cart-section">
								<div className="section-title">Chọn hình thức nhận hàng</div>
								<div className="radio-row">
									<label className="radio-item"><input type="radio" name="deliveryMethod" checked readOnly /><span>Giao tận nơi</span></label>
								</div>
								<div className="delivery-box">
									<label className="delivery-address-label">Địa chỉ:</label>
									<div className="field-stack">
										<input ref={addressRef} className={`form-field ${fieldErrors.addressLine ? 'field-error' : ''}`} type="text" placeholder="Số nhà, tên đường, Phường / Xã, Thành phố / Tỉnh" value={customerForm.addressLine} onChange={handleFormChange('addressLine')} />
										{fieldErrors.addressLine ? <span className="field-error-text">{fieldErrors.addressLine}</span> : null}
									</div>
								</div>
								<input className="note-field" type="text" placeholder="Nhập ghi chú (nếu có)" value={customerForm.note} onChange={handleFormChange('note')} />
								<div className="transfer-important " style={{marginTop: '10px'}}>
												<div className="transfer-important-title">⚠️ Lưu ý quan trọng</div>
												<ul className="transfer-important-list">
												<li> Các đơn hàng giao đến ngoại thành TP. HCM chỉ nhận thanh toán <strong>CHUYỂN KHOẢN</strong> khi nhận hàng.</li>

													<li> Sau khi chuyển khoản, vui lòng <strong>nhấn "Đặt hàng ngay"</strong> bên dưới để hệ thống ghi nhận đơn hàng của bạn.</li>
													<li> <strong>Liên hệ ngay</strong> Zalo hoặc gọi điện trực tiếp để xác nhận đơn đã thanh toán — chúng tôi sẽ giao hàng nhanh nhất có thể!</li>
												</ul>
											</div>
							
							</div>
							<div className="cart-section summary-section">
								<div className="summary-total-row summary-row--muted"><span>Tạm tính (giá hàng):</span><strong>{summary?.subtotal || formatPrice(summary?.subtotal_value || 0)}</strong></div>
								{hasRefundItems ? (
									<div className="summary-refund-row">
										<span>Tổng hoàn tiền:</span>
										<span className="refund-amount">−{formatPrice(totalRefund)}</span>
									</div>
								) : null}
								<div className="summary-pay-row"><span>Cần thanh toán</span><strong>{totalPayableDisplay}</strong></div>
								<button type="button" className="transfer-info-btn" onClick={() => setShowTransferModal(true)}>
									💳 Xem thông tin chuyển khoản
								</button>
								<button type="button" className="checkout-btn" onClick={handleSubmitOrder} disabled={isUpdating || isSubmittingOrder}>{isSubmittingOrder ? 'Đang gửi đơn...' : 'Đặt hàng'}</button>
							</div>

							{/* ============ TRANSFER MODAL ============ */}
							{showTransferModal && (
								<div className="transfer-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTransferModal(false) }}>
									<div className="transfer-modal">
										<div className="transfer-modal-header">
											<div className="transfer-modal-icon">💳</div>
											<div>
												<div className="transfer-modal-title">Thông tin chuyển khoản</div>
												<div className="transfer-modal-subtitle">Vui lòng ghi rõ <strong>Họ tên + SĐT</strong> trong nội dung chuyển khoản</div>
											</div>
											<button className="transfer-modal-close" onClick={() => setShowTransferModal(false)}>✕</button>
										</div>

										<div className="transfer-modal-body">
											{/* Account info */}
											<div className="transfer-account-card">
												<div className="transfer-account-row">
													<span className="transfer-label">Ngân hàng</span>
													<span className="transfer-value">Ngân hàng TMCP Á Châu (ACB)</span>
												</div>
												<div className="transfer-account-row">
													<span className="transfer-label">Chi nhánh</span>
													<span className="transfer-value">ACB - CN Ba Tháng Hai</span>
												</div>
												<div className="transfer-account-row">
													<span className="transfer-label">Số tài khoản</span>
													<div className="transfer-copy-row">
														<span className="transfer-value transfer-value--mono">3698128</span>
														<button className="transfer-copy-btn" onClick={() => { navigator.clipboard.writeText('3698128'); setTransferCopied('stk'); setTimeout(() => setTransferCopied(''), 2000) }}>
															{transferCopied === 'stk' ? '✅ Đã copy' : '📋 Copy'}
														</button>
													</div>
												</div>
												<div className="transfer-account-row">
													<span className="transfer-label">Tên tài khoản</span>
													<div className="transfer-copy-row">
														<span className="transfer-value">CTY TNHH XD TM SQ HOME</span>
														<button className="transfer-copy-btn" onClick={() => { navigator.clipboard.writeText('CTY TNHH XD TM SQ HOME'); setTransferCopied('name'); setTimeout(() => setTransferCopied(''), 2000) }}>
															{transferCopied === 'name' ? '✅ Đã copy' : '📋 Copy'}
														</button>
													</div>
												</div>
											</div>

											{/* Amount */}
											<div className="transfer-amount-card">
												<div className="transfer-amount-label">Số tiền cần chuyển</div>
												<div className="transfer-amount-value">{totalPayableDisplay}</div>
												<div className="transfer-amount-note">(Vui lòng chuyển đúng số tiền trên)</div>
											</div>

											{/* Transfer content guide */}
											<div className="transfer-content-guide">
												<div className="transfer-guide-title">📝 Nội dung chuyển khoản</div>
												<div className="transfer-content-example">
													<strong>Họ Tên</strong> + <strong>Số điện thoại</strong>
												</div>
												<div className="transfer-content-note">
													Ví dụ: <span className="transfer-content-sample">Nguyễn Văn A 0901234567</span>
												</div>
											</div>

											{/* Important notice */}
											<div className="transfer-important">
												<div className="transfer-important-title">⚠️ Lưu ý quan trọng</div>
												<ul className="transfer-important-list">
												<li> Các đơn hàng giao đến ngoại thành TP. HCM chỉ nhận thanh toán <strong>CHUYỂN KHOẢN</strong> khi nhận hàng.</li>

													<li> Sau khi chuyển khoản, vui lòng <strong>nhấn "Đặt hàng ngay"</strong> bên dưới để hệ thống ghi nhận đơn hàng của bạn.</li>
													<li> <strong>Liên hệ ngay</strong> Zalo hoặc gọi điện trực tiếp để xác nhận đơn đã thanh toán — chúng tôi sẽ giao hàng nhanh nhất có thể!</li>
												</ul>
											</div>

											{/* CTA buttons */}
											<div className="transfer-cta">
												<a className="transfer-zalo-btn" href="https://zalo.me/4148759364050318477" target="_blank" rel="noopener noreferrer">
													📱 Liên hệ Zalo xác nhận thanh toán
												</a>
												<a className="transfer-call-btn" href="tel:0906369812">
													📞 Gọi ngay 0906.369.812
												</a>
												<button className="transfer-order-btn" onClick={() => { setShowTransferModal(false); handleSubmitOrder() }} disabled={isSubmittingOrder}>
													{isSubmittingOrder ? '⏳ Đang gửi...' : '✅ Đặt hàng ngay'}
												</button>
												<button className="transfer-cancel-btn" onClick={() => setShowTransferModal(false)}>
													Đóng
												</button>
											</div>
										</div>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</section>
	)
}
