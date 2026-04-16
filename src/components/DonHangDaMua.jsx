import React, { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
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

export default function DonHangDaMua() {
	const location = useLocation()
	useSeo({
		title: 'Đơn hàng đã mua | SQHOME',
		description: 'Theo dõi thông tin đơn hàng vừa đặt tại SQHOME, bao gồm sản phẩm đã mua, địa chỉ thanh toán và trạng thái đơn hàng.',
		canonical: buildAbsoluteUrl('/don-hang-da-mua'),
	})
	const order = location.state?.order || null
	const wpOrder = order?.wordpress || null

	const products = useMemo(() => {
		if (Array.isArray(wpOrder?.san_pham) && wpOrder.san_pham.length > 0) return wpOrder.san_pham
		if (Array.isArray(order?.items) && order.items.length > 0) {
			return order.items.map((item) => ({
				product_id: item?.product_id,
				name: item?.name,
				image: item?.image,
				slug: item?.slug,
				url: item?.url,
				quantity: item?.quantity,
				price: item?.price,
				line_total: item?.line_total,
				refund_amount: item?.refund_amount,
				refund_amount_display: item?.refund_amount_display,
				refund_total: item?.refund_total,
			}))
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

	if (!order) {
		return (
			<section>
				<style>{`
					.order-success-page { max-width: 960px; margin: 0 auto; padding: 28px 16px 52px; }
					.order-empty { background: #fff; border-radius: 24px; padding: 42px 24px; text-align: center; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); border: 1px solid #ececec; }
					.order-empty h1 { color: #0f172a; font-size: 30px; margin-bottom: 12px; }
					.order-empty p { color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 20px; }
					.order-empty a { display: inline-flex; align-items: center; justify-content: center; min-width: 220px; height: 50px; border-radius: 14px; background: #1677e5; color: #fff; font-weight: 700; }
				`}</style>
				<div className="order-success-page">
					<div className="order-empty">
						<h1>Chưa có dữ liệu đơn hàng</h1>
						<p>Trang này hiển thị ngay sau khi bạn đặt hàng thành công. Hãy quay lại giỏ hàng và thực hiện đặt hàng để xem chi tiết.</p>
						<Link to="/cart">Về giỏ hàng</Link>
					</div>
				</div>
			</section>
		)
	}

	return (
		<section>
			<style>{`
				.order-success-page { max-width: 1080px; margin: 0 auto; padding: 28px 16px 60px; }
				.order-success-hero { display: grid; gap: 22px; margin-bottom: 22px; }
				.order-back-link { display: inline-flex; align-items: center; gap: 8px; color: #fff; font-size: 15px; font-weight: 600; }
				.order-success-card { position: relative; overflow: hidden; background: linear-gradient(135deg, #0f172a 0%, #1677e5 100%); border-radius: 30px; padding: 30px 28px; color: #fff; box-shadow: 0 28px 80px rgba(22, 119, 229, 0.24); }
				.order-success-card::before { content: ''; position: absolute; inset: auto -70px -70px auto; width: 220px; height: 220px; border-radius: 999px; background: radial-gradient(circle, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 72%); }
				.order-success-badge { width: 88px; height: 88px; border-radius: 999px; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; font-size: 42px; margin-bottom: 18px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16); }
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
				.order-product-main a { color: #0f172a; font-size: 16px; line-height: 24px; font-weight: 700; }
				.order-product-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 8px; color: #64748b; font-size: 14px; }
				.order-product-total { margin-top: 10px; color: #1677e5; font-size: 15px; font-weight: 700; }
				.order-refund-badge { margin-top: 8px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid rgba(34, 197, 94, 0.3); font-size: 13px; font-weight: 600; color: #15803d; }
				.order-refund-badge .refund-amount { color: #16a34a; font-weight: 700; }
				.refund-total-text { color: #16a34a !important; }
				.order-address { display: grid; gap: 10px; }
				.order-address-line { color: #334155; font-size: 15px; line-height: 24px; }
				.order-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
				.order-actions a { display: inline-flex; align-items: center; justify-content: center; min-width: 180px; height: 48px; border-radius: 14px; font-size: 15px; font-weight: 700; }
				.order-actions a.primary { background: #1677e5; color: #fff; }
				.order-actions a.secondary { background: #edf4ff; color: #1769d1; }
				@media (max-width: 900px) {
					.order-grid { grid-template-columns: 1fr; }
				}
				@media (max-width: 640px) {
					.order-success-page { padding: 18px 10px 40px; }
					.order-success-card { padding: 24px 18px; border-radius: 24px; }
					.order-success-title { font-size: 28px; line-height: 36px; }
					.order-panel { padding: 18px; border-radius: 20px; }
					.order-product-item { grid-template-columns: 72px minmax(0, 1fr); }
					.order-product-item img { width: 72px; height: 72px; border-radius: 14px; }
				}
			`}</style>

			<div className="order-success-page">
				<div className="order-success-hero">
					<Link to="/" className="order-back-link">← Về trang chủ</Link>
					<div className="order-success-card">
						<div className="order-success-badge">✓</div>
						<h1 className="order-success-title">Đặt hàng thành công</h1>
						<p className="order-success-subtitle">
							Đơn hàng của bạn đã được ghi nhận thành công. Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất và chuẩn bị giao hàng theo thông tin bạn đã cung cấp.
						</p>
						<div className="order-success-meta">
							<span className="order-success-pill">Mã đơn hàng: {safeText(wpOrder?.ma_don_hang, safeText(order?.order_id))}</span>
							<span className="order-success-pill">Ngày: {safeText(wpOrder?.ngay)}</span>
							<span className="order-success-pill">Trạng thái: {safeText(order?.status)}</span>
						</div>
					</div>
				</div>

				<div className="order-grid">
					<div className="order-panel">
						<h2>Sản phẩm đã mua</h2>
						<div className="order-product-list">
							{products.map((item, index) => (
								<div className="order-product-item" key={item?.product_id || item?.slug || index}>
									<img src={item?.image} alt={item?.name || 'Sản phẩm'} />
									<div className="order-product-main">
										{item?.url ? <Link to={item.url}>{safeText(item?.name)}</Link> : <span>{safeText(item?.name)}</span>}
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
						<h2>Thông tin đơn hàng</h2>
						<div className="order-summary-list">
							<div className="order-summary-item"><span>Mã đơn hàng</span><strong>{safeText(wpOrder?.ma_don_hang, safeText(order?.order_id))}</strong></div>
							<div className="order-summary-item"><span>Ngày</span><strong>{safeText(wpOrder?.ngay)}</strong></div>
							<div className="order-summary-item"><span>Tổng giá sản phẩm</span><strong>{safeText(grossTotalText)}</strong></div>
							{showRefundBreakdown ? (
								<div className="order-summary-item"><span>Tổng hoàn tiền</span><strong className="refund-total-text">−{safeText(refundTotalText)}</strong></div>
							) : null}
							<div className="order-summary-item order-summary-pay"><span>Cần thanh toán</span><strong>{safeText(payableText)}</strong></div>
							<div className="order-summary-item"><span>Phương thức thanh toán</span><strong>{safeText(wpOrder?.phuong_thuc_thanh_toan, safeText(order?.payment_method))}</strong></div>
						</div>

						<h2 style={{ marginTop: 28 }}>Địa chỉ thanh toán</h2>
						<div className="order-address">
							<div className="order-address-line"><strong>Người nhận:</strong> {safeText(paymentAddress?.ho_ten, safeText(order?.customer?.full_name))}</div>
							<div className="order-address-line"><strong>Số điện thoại:</strong> {safeText(paymentAddress?.so_dien_thoai, safeText(order?.customer?.phone))}</div>
							<div className="order-address-line"><strong>Email:</strong> {safeText(paymentAddress?.email, safeText(order?.customer?.email))}</div>
							<div className="order-address-line"><strong>Địa chỉ:</strong> {safeText(paymentAddress?.day_du, safeText(order?.customer?.address))}</div>
						</div>

						<div className="order-actions">
							<Link to="/" className="primary">Tiếp tục mua sắm</Link>
							<Link to="/cart" className="secondary">Về giỏ hàng</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}