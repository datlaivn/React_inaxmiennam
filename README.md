# SQHOME - Website Thương Mại Điện Tử INAX

> Frontend ReactJS cho website bán hàng SQHOME - Chuyên cung cấp thiết bị vệ sinh INAX chính hãng tại Việt Nam.

## Giới thiệu

SQHOME là website thương mại điện tử chuyên bán các sản phẩm thiết bị vệ sinh cao cấp thương hiệu INAX, bao gồm bồn cầu, chậu rửa, vòi sen, gạch men và các phụ kiện khác.

## Công nghệ sử dụng

| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|--------|
| React | ^18.2.0 | Thư viện UI chính |
| React Router | ^6.14.1 | Điều hướng trang |
| Vite | ^7.3.1 | Build tool & Dev server |
| Axios | ^1.7.9 | Gọi API |
| OpenAI | ^6.34.0 | AI chatbot hỗ trợ kỹ thuật |
| OwlCarousel | - | Slide sản phẩm, banner |

## Cấu trúc thư mục

```
GROHEMIENNAM/
├── public/                 # Ảnh tĩnh
│   └── images/             # Hình ảnh banner
├── src/
│   ├── App.jsx             # Component chính - Routing & Layout
│   ├── main.jsx            # Entry point - Bootstrap app
│   ├── index.css           # Global styles
│   ├── Asset/
│   │   ├── Css/            # CSS framework (Bootstrap, Boxicons, custom)
│   │   ├── Image/          # Ảnh assets (logo, icon, gif...)
│   │   └── Js/             # JS utilities
│   ├── components/
│   │   ├── Header.jsx              # Header PC - Menu, Search, Cart
│   │   ├── Footer.jsx              # Footer
│   │   ├── Home.jsx               # Trang chủ - Banner, Flash Sale, Danh mục, Tin tức
│   │   ├── Sanpham.jsx             # Chi tiết sản phẩm - Gallery, Mua hàng, Thông số kỹ thuật
│   │   ├── Cart.jsx                # Giỏ hàng - Checkout, Chuyển khoản
│   │   ├── DanhmucSanpham.jsx      # Danh sách sản phẩm theo danh mục
│   │   ├── Search.jsx             # Trang tìm kiếm
│   │   ├── ChinhSach.jsx          # Trang chính sách
│   │   ├── ChiTietChinhSach.jsx   # Chi tiết chính sách
│   │   ├── TinTuc.jsx            # Trang tin tức
│   │   ├── ChiTietTinTuc.jsx     # Chi tiết tin tức
│   │   ├── DonHangDaMua.jsx      # Đơn hàng đã mua
│   │   ├── TraCuuDonHang.jsx     # Tra cứu đơn hàng
│   │   ├── TaiKhoanNganHang.jsx  # Thông tin tài khoản ngân hàng
│   │   ├── Settings.jsx          # Cài đặt (API URL runtime)
│   │   ├── MainPc.jsx            # Layout wrapper PC
│   │   ├── AiChatAssistant.jsx   # AI chatbot (PC)
│   │   ├── GlobalLoader.css      # Loading overlay styles
│   │   ├── ProductBottomBar.css  # Bottom bar mobile
│   │   └── mobile/
│   │       ├── HeaderMobile.jsx
│   │       ├── FooterMobile.jsx
│   │       ├── HomeMobile.jsx
│   │       ├── MainMobile.jsx
│   │       └── AiChatAssistantMobile.jsx
│   └── utils/
│       ├── api.js          # API utilities - cart, auth, base URL
│       ├── seo.js          # SEO meta tags
│       ├── owlCarousel.js  # Owl Carousel initialization
│       ├── chatbotContact.js
│       └── chatbotReply.js
├── index.html              # HTML entry
├── package.json
├── vite.config.js
├── .env                    # Environment variables
├── example.mjs            # Ví dụ cấu hình
├── prerender-seo.mjs      # Script SEO pre-render
└── ssr-fetch.mjs         # Script fetch server-side

```

## Tính năng chính

### Trang chủ (Home)
- **Banner carousel** - Slide hình ảnh quảng cáo từ API
- **Flash Sale** - Đếm ngược thời gian, hiển thị số lượng tồn kho
- **Danh mục sản phẩm** - Categories với hình ảnh
- **Sản phẩm theo danh mục** - Slide sản phẩm với giá, quà tặng, hoàn tiền
- **Tin tức** - Tin khuyến mãi, hướng dẫn

### Chi tiết sản phẩm (Sanpham)
- **Gallery ảnh** - Zoom, xem trước full-screen, swipe mobile
- **Màu sắc** - Chọn màu/variant sản phẩm
- **Thông số kỹ thuật** - Phân nhóm theo danh mục (kích thước, vật liệu, tính năng...)
- **AI Specs** - Tự động trích xuất thông số bằng OpenAI khi không có dữ liệu
- **Quà tặng kèm** - Hiển thị sản phẩm tặng kèm
- **Hoàn tiền** - Badge hoàn tiền khi mua
- **Sản phẩm mua kèm** - Combo gợi ý
- **Thêm vào giỏ** - Animation bay đến icon cart
- **Countdown timer** - Đếm ngược đến cuối ngày

### Giỏ hàng (Cart)
- **Danh sách sản phẩm** - Thay đổi số lượng, xóa sản phẩm
- **Thông tin khách hàng** - Form đặt hàng có validation
- **Hoàn tiền** - Hiển thị tổng hoàn tiền
- **Thanh toán chuyển khoản** - Modal thông tin TK ngân hàng ACB
- **Zalo/ZaloPay** - Liên kết Zalo xác nhận thanh toán

### Responsive
- **Desktop (PC)** - Layout đầy đủ sidebar, header fixed
- **Mobile** - Bottom navigation bar, touch-friendly, swipe gallery

### SEO
- Meta tags động theo trang (title, description, canonical)
- Pre-render support cho SSR

## API Endpoints

Frontend kết nối đến backend tại `https://sqhome.vn` hoặc `http://localhost:8888` (development):

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/get/header` | Lấy header data (logo, menu, contact) |
| GET | `/get/banner` | Banner carousel |
| GET | `/get/flashsale` | Sản phẩm flash sale |
| GET | `/get/product_category` | Danh mục sản phẩm |
| GET | `/get/danhmuc` | Danh mục kèm sản phẩm |
| GET | `/get/tintuc` | Tin tức |
| GET | `/get/sanpham/:slug` | Chi tiết sản phẩm |
| GET | `/get/seo/sanpham/:slug` | SEO data sản phẩm |
| GET | `/get/search?q=` | Tìm kiếm sản phẩm |
| GET | `/get/cart` | Lấy giỏ hàng |
| GET | `/get/cart/count` | Số lượng trong giỏ |
| POST | `/get/cart/add` | Thêm vào giỏ |
| POST | `/get/cart/update` | Cập nhật số lượng |
| POST | `/get/cart/remove` | Xóa khỏi giỏ |
| POST | `/get/buy` | Đặt hàng |

## Environment Variables

Tạo file `.env`:

```env
VITE_API_BASE_URL=https://sqhome.vn
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### Runtime API URL
Có thể thay đổi API URL từ trình duyệt tại `/settings` mà không cần rebuild.

## Scripts

```bash
# Development
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Fetch SEO data (SSR)
npm run seo

# Full SEO build
npm run seo:all
```

## Cài đặt

```bash
# Clone repository
git clone https://github.com/datlaivn/React_inaxmiennam.git

# Di chuyển vào thư mục
cd React_inaxmiennam

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

## Thông tin thanh toán

Website sử dụng hình thức thanh toán **chuyển khoản ngân hàng**:

- **Ngân hàng**: Ngân hàng TMCP Á Châu (ACB)
- **Chi nhánh**: ACB - CN Ba Tháng Hai
- **Số tài khoản**: 3698128
- **Tên tài khoản**: CTY TNHH XD TM SQ HOME

Nội dung chuyển khoản: `Họ Tên + Số điện thoại`

## Liên hệ

- **Hotline**: 0906.369.812
- **Zalo**: Liên kết tích hợp trong giỏ hàng
- **Website**: https://sqhome.vn

## License

Private - All rights reserved © SQHOME
