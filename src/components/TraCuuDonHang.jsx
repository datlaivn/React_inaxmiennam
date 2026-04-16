import React, { useState, useMemo } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { buildApiUrl } from '../utils/api'
import { buildAbsoluteUrl, useSeo } from '../utils/seo'

const safeText = (value, fallback = '—') => {
	if (value === null || value === undefined || value === '') return fallback
	return String(value)
}

const formatPrice = (value) => {
	if (value === null || value === undefined || value === "") return "";
	if (typeof value === "string" && value.includes("₫")) return value;
	const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, "")));
	if (isNaN(numValue)) return value;
	return `${numValue.toLocaleString("vi-VN")}₫`;
}

export default function TraCuuDonHang() {
	useSeo({
		title: 'Tra cứu đơn hàng | SQHOME',
		description: 'Tra cứu thông tin chi tiết đơn hàng của bạn tại SQHOME bằng mã đơn hàng và số điện thoại.',
		canonical: buildAbsoluteUrl('/tra-cuu-don-hang'),
	})

	const [orderCode, setOrderCode] = useState('')
	const [phone, setPhone] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [order, setOrder] = useState(null)

	const handleLookup = async (e) => {
		e.preventDefault()
		if (!orderCode || !phone) {
			setError('Vui lòng nhập đầy đủ Mã đơn hàng và Số điện thoại.')
			return
		}

		setLoading(true)
		setError(null)
		try {
			const response = await axios.post(buildApiUrl('/get/order-lookup'), {
				order_code: orderCode.trim(),
				phone: phone.trim()
			})
			if (response.data?.order) {
				setOrder(response.data.order)
			} else {
				setError('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại thông tin.')
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Có lỗi xảy ra trong quá trình tra cứu. Vui lòng thử lại sau.')
		} finally {
			setLoading(false)
		}
	}

	const wpOrder = order?.wordpress || null
	const products = useMemo(() => {
		if (Array.isArray(wpOrder?.san_pham) && wpOrder.san_pham.length > 0) return wpOrder.san_pham
		if (Array.isArray(order?.items) && order.items.length > 0) {
			return order.items
		}
		return []
	}, [order, wpOrder])

	const paymentAddress = wpOrder?.dia_chi_thanh_toan || {}

	const grossTotalText = wpOrder?.tong_tam_tinh || order?.summary?.subtotal
	const payableText = wpOrder?.tong_cong || order?.summary?.total_payable || order?.summary?.total
	const refundTotalText = wpOrder?.tong_hoan_tien || order?.summary?.total_refund
	const refundValueNum = Number(order?.summary?.total_refund_value ?? 0)
	const showRefundBreakdown =
		refundValueNum > 0 ||
		(Boolean(refundTotalText) && parseInt(String(refundTotalText).replace(/\D/g, '') || '0', 10) > 0)

	return (
		<section>
			<style>{`
				.lookup-page { max-width: 1080px; margin: 0 auto; padding: 28px 16px 60px; min-height: 600px; }
				.lookup-card { background: #fff; border-radius: 24px; padding: 42px 32px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); border: 1px solid #ececec; max-width: 540px; margin: 0 auto; }
				.lookup-card h1 { color: #0f172a; font-size: 30px; margin-bottom: 8px; text-align: center; }
				.lookup-card p { color: #64748b; font-size: 15px; margin-bottom: 30px; text-align: center; }
				.lookup-form { display: grid; gap: 18px; }
				.form-group { display: grid; gap: 8px; }
				.form-group label { color: #0f172a; font-size: 14px; font-weight: 700; }
				.form-group input { height: 50px; border-radius: 12px; border: 1px solid #e2e8f0; padding: 0 16px; font-size: 15px; transition: border-color 0.2s; }
				.form-group input:focus { outline: none; border-color: #1677e5; box-shadow: 0 0 0 4px rgba(22, 119, 229, 0.1); }
				.lookup-btn { height: 52px; border-radius: 14px; background: #1677e5; color: #fff; font-weight: 700; font-size: 16px; margin-top: 10px; border: none; cursor: pointer; transition: background 0.2s; }
				.lookup-btn:hover { background: #125bb0; }
				.lookup-btn:disabled { opacity: 0.6; cursor: not-allowed; }
				.error-msg { background: #fff1f2; color: #e11d48; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 20px; text-align: center; border: 1px solid #ffe4e6; }
				
				/* Result Styles (Shared with success page) */
				.order-success-hero { display: grid; gap: 22px; margin-bottom: 22px; }
				.order-back-link { display: inline-flex; align-items: center; gap: 8px; color: #0f172a; font-size: 15px; font-weight: 600; cursor: pointer; border: none; background: none; padding: 0; }
				.order-success-card { position: relative; overflow: hidden; background: linear-gradient(135deg, #0f172a 0%, #1677e5 100%); border-radius: 30px; padding: 30px 28px; color: #fff; box-shadow: 0 28px 80px rgba(22, 119, 229, 0.24); }
				.order-success-title { color: #fff; font-size: 34px; line-height: 42px; font-weight: 800; margin-bottom: 10px; }
				.order-success-subtitle { max-width: 720px; color: rgba(255,255,255,0.86); font-size: 16px; line-height: 25px; }
				.order-success-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
				.order-success-pill { display: inline-flex; align-items: center; min-height: 38px; padding: 7px 14px; border-radius: 999px; background: rgba(255,255,255,0.14); color: #fff; font-size: 14px; font-weight: 700; }
				.order-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr); gap: 22px; align-items: start; }
				.order-panel { background: #fff; border: 1px solid #ececec; border-radius: 24px; box-shadow: 0 18px 50px rgba(15,23,42,0.08); padding: 22px; }
				.order-panel h2 { color: #0f172a; font-size: 23px; line-height: 30px; margin-bottom: 18px; }
				.order-summary-list { display: grid; gap: 12px; }
				.order-summary-item { display: flex; justify-content: space-between; gap: 14px; padding-bottom: 12px; border-bottom: 1px solid #eef2f7; }
				.order-summary-item:last-child { padding-bottom: 0; border-bottom: 0; }
				.order-summary-item span { color: #64748b; font-size: 14px; }
				.order-summary-item strong { color: #0f172a; font-size: 15px; text-align: right; }
				.order-summary-pay strong { color: #b91c1c; font-size: 17px; font-weight: 800; }
				.order-summary-pay span { font-weight: 700; color: #334155; }
				.order-product-list { display: grid; gap: 14px; }
				.order-product-item { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 14px; align-items: start; padding: 14px; border-radius: 18px; background: #f8fafc; border: 1px solid #eef2f7; }
				.order-product-item img { width: 88px; height: 88px; border-radius: 16px; object-fit: cover; background: #fff; border: 1px solid #edf2f7; }
				.order-product-main { min-width: 0; }
				.order-product-main b { color: #0f172a; font-size: 16px; line-height: 24px; font-weight: 700; display: block; }
				.order-product-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 8px; color: #64748b; font-size: 14px; }
				.order-product-total { margin-top: 10px; color: #1677e5; font-size: 15px; font-weight: 700; }
				.order-refund-badge { margin-top: 8px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid rgba(34, 197, 94, 0.3); font-size: 13px; font-weight: 600; color: #15803d; }
				.order-refund-badge .refund-amount { color: #16a34a; font-weight: 700; }
				.refund-total-text { color: #16a34a !important; }
				.order-address { display: grid; gap: 10px; }
				.order-address-line { color: #334155; font-size: 15px; line-height: 24px; }
				@media (max-width: 900px) {
					.order-grid { grid-template-columns: 1fr; }
				}
				@media (max-width: 640px) {
					.lookup-card { padding: 32px 20px; }
					.order-success-title { font-size: 28px; }
				}
			`}</style>

			<div className="lookup-page">
				{!order ? (
					<div className="lookup-card">
						<h1>Tra cứu đơn hàng</h1>
						<p>Vui lòng nhập mã đơn hàng và số điện thoại mua hàng để xem chi tiết.</p>
						
						{error && <div className="error-msg">{error}</div>}
						
						<form className="lookup-form" onSubmit={handleLookup}>
							<div className="form-group">
								<label>Mã đơn hàng</label>
								<input 
									type="text" 
									placeholder="Ví dụ: INSMNM..." 
									value={orderCode}
									onChange={(e) => setOrderCode(e.target.value)}
									required
								/>
							</div>
							<div className="form-group">
								<label>Số điện thoại</label>
								<input 
									type="tel" 
									placeholder="Nhập số điện thoại khi đặt hàng" 
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									required
								/>
							</div>
							<button type="submit" className="lookup-btn" disabled={loading}>
								{loading ? 'Đang kiểm tra...' : 'Tra cứu ngay'}
							</button>
						</form>
					</div>
				) : (
					<div className="lookup-result">
						<div className="order-success-hero">
							<button className="order-back-link" onClick={() => setOrder(null)}>← Quay lại tra cứu</button>
							<div className="order-success-card">
								<h1 className="order-success-title">Thông tin đơn hàng</h1>
								<p className="order-success-subtitle">
									Cảm ơn bạn đã tin tưởng SQHOME. Dưới đây là thông tin chi tiết về đơn hàng của bạn.
								</p>
								<div className="order-success-meta">
									<span className="order-success-pill">Mã đơn hàng: {safeText(order?.order_code)}</span>
									<span className="order-success-pill">Ngày đặt: {safeText(wpOrder?.ngay, safeText(order?.created_at))}</span>
									<span className="order-success-pill">Trạng thái: {safeText(order?.status)}</span>
								</div>
							</div>
						</div>

						<div className="order-grid">
							<div className="order-panel">
								<h2>Sản phẩm đã mua</h2>
								<div className="order-product-list">
									{products.map((item, index) => (
										<div className="order-product-item" key={item?.product_id || index}>
											<img src={item?.image} alt={item?.name || 'Sản phẩm'} />
											<div className="order-product-main">
												<b>{safeText(item?.name)}</b>
												<div className="order-product-meta">
													<span>Số lượng: {safeText(item?.quantity)}</span>
													<span>Đơn giá: {safeText(item?.price)}</span>
												</div>
												<div className="order-product-total">Thành tiền: {safeText(item?.line_total)}</div>
												{Number(item?.refund_amount || 0) > 0 ? (
													<div className="order-refund-badge">
														<span>Hoàn tiền (ước tính): </span>
														<span className="refund-amount">−{safeText(item?.refund_total || item?.refund_amount_display || formatPrice(Number(item?.refund_amount || 0) * Number(item?.quantity || 0)))}</span>
													</div>
												) : null}
											</div>
										</div>
									))}
								</div>
							</div>

							<div className="order-panel">
								<h2>Chi tiết đơn hàng</h2>
								<div className="order-summary-list">
									<div className="order-summary-item"><span>Mã đơn hàng</span><strong>{safeText(order?.order_code)}</strong></div>
									<div className="order-summary-item"><span>Ngày đặt</span><strong>{safeText(wpOrder?.ngay, safeText(order?.created_at))}</strong></div>
									<div className="order-summary-item"><span>Tổng giá sản phẩm</span><strong>{safeText(grossTotalText)}</strong></div>
									{showRefundBreakdown ? (
										<div className="order-summary-item"><span>Tổng hoàn tiền</span><strong className="refund-total-text">−{safeText(refundTotalText)}</strong></div>
									) : null}
									<div className="order-summary-item order-summary-pay"><span>Cần thanh toán</span><strong>{safeText(payableText)}</strong></div>
									<div className="order-summary-item"><span>Phương thức thanh toán</span><strong>{safeText(order?.payment_method)}</strong></div>
								</div>

								<h2 style={{ marginTop: 28 }}>Địa chỉ giao hàng</h2>
								<div className="order-address">
									<div className="order-address-line"><strong>Người nhận:</strong> {safeText(order?.customer?.full_name)}</div>
									<div className="order-address-line"><strong>Số điện thoại:</strong> {safeText(order?.customer?.phone)}</div>
									<div className="order-address-line"><strong>Email:</strong> {safeText(order?.customer?.email)}</div>
									<div className="order-address-line"><strong>Địa chỉ:</strong> {safeText(order?.customer?.address)}</div>
									{order?.customer?.note && (
										<div className="order-address-line"><strong>Ghi chú:</strong> {order.customer.note}</div>
									)}
								</div>

								<div style={{ marginTop: 30, textAlign: 'center' }}>
									<Link to="/" style={{ color: '#1677e5', fontWeight: 700 }}>Tiếp tục mua sắm tại SQHOME</Link>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	)
}
