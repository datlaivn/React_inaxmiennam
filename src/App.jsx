import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './components/GlobalLoader.css'
import Header from './components/Header'
import Home from './components/Home'
import Footer from './components/Footer'
import HeaderMobile from './components/mobile/HeaderMobile'
import HomeMobile from './components/mobile/HomeMobile'
import FooterMobile from './components/mobile/FooterMobile'
import MainMobile from './components/mobile/MainMobile'
import MainPc from './components/MainPc'
import Search from './components/Search'
import Sanpham from './components/Sanpham'
import Cart from './components/Cart'
import DanhmucSanpham from './components/DanhmucSanpham'
import DonHangDaMua from './components/DonHangDaMua'
import ChinhSach from './components/ChinhSach'
import ChiTietChinhSach from './components/ChiTietChinhSach'
import ChiTietTinTuc from './components/ChiTietTinTuc'
import TraCuuDonHang from './components/TraCuuDonHang'
import AiChatAssistant from './components/AiChatAssistant'
import AiChatAssistantMobile from './components/mobile/AiChatAssistantMobile'
import TaiKhoanNganHang from './components/TaiKhoanNganHang'
import Settings from './components/Settings'
import TinTuc from './components/TinTuc'
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [pathname])

  return null
}

function useIsMobile(breakpoint = 1023){
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false);
  useEffect(()=>{
    if(typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e)=> setIsMobile(e.matches);
    // modern browsers
    if(mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener && mq.addListener(handler);
    // set initial
    setIsMobile(mq.matches);
    return ()=>{ if(mq.removeEventListener) mq.removeEventListener('change', handler); else mq.removeListener && mq.removeListener(handler); };
  },[breakpoint]);
  return isMobile;
}

export default function App(){
  const isMobile = useIsMobile();
  const location = useLocation();
  const isOnProductPage = location.pathname.startsWith('/san-pham/');
  
  // Page Transition Logic
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    setIsPageLoading(true);

    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [location.pathname]);
  if(isMobile){
    return (
      <body className="layout-locationnew">
        <div className='layout-locationnew'>
          <ScrollToTop />
          <MainMobile />
            <HeaderMobile />
            
          {/* Centered Branded Page Loader */}
          <div className={`sqloader-overlay ${isPageLoading ? 'sqloader-show' : ''}`}>
             <div className="sqloader-branded-wrap">
                <div className="sqloader-ring" />
                <img 
                  src="https://sqhome.vn/wp-content/uploads/2022/08/cropped-favicon-192x192.png" 
                  alt="SQHOME Loading" 
                  className="sqloader-icon"
                />
             </div>
          </div>

        <Routes>
          <Route path="/" element={<HomeMobile />} />
          <Route path="/search/:keyword" element={<Search />} />
          <Route path="/san-pham/:slug" element={<Sanpham />} />
          <Route path="/:slug" element={<ChiTietTinTuc />} />
          <Route path="/tin-tuc/:slug" element={<ChiTietTinTuc />} />
          <Route path="/ban-cau" element={<Navigate to="/danh-muc-san-pham/bon-cau-inax" replace />} />
          <Route path="/danh-muc-san-pham/bon-cau-inax/bon-cau-inax-1-khoi" element={<Navigate to="/danh-muc-san-pham/bon-cau-inax?child_slug=bon-cau-inax-1-khoi" replace />} />
          <Route path="/danh-muc-san-pham/:slug" element={<DanhmucSanpham />} />
          <Route path="/chinh-sach" element={<ChinhSach />} />
          <Route path="/chinh-sach/:slug" element={<ChiTietChinhSach />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/don-hang-da-mua" element={<DonHangDaMua />} />
          <Route path="/tra-cuu-don-hang" element={<TraCuuDonHang />} />
          <Route path="/tai-khoan" element={<TaiKhoanNganHang />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tin-tuc" element={<TinTuc />} />

          {/* Add other routes as needed */}
        </Routes>
        <FooterMobile />
        {/* <AiChatAssistantMobile isOnProductPage={isOnProductPage} /> */}
        </div>
        
      </body>
    )
  }

  return (
    
    <body className="layout-locationnew">
        <div className="layout-locationnew">
          <ScrollToTop />
          <MainPc />
      <Header />
      
      {/* Centered Branded Page Loader */}
      <div className={`sqloader-overlay ${isPageLoading ? 'sqloader-show' : ''}`}>
         <div className="sqloader-branded-wrap">
            <div className="sqloader-ring" />
            <img 
              src="https://sqhome.vn/wp-content/uploads/2022/08/cropped-favicon-192x192.png" 
              alt="SQHOME Loading" 
              className="sqloader-icon"
            />
         </div>
      </div>

      <div className="bg-sg" />
      <input type="hidden" data-location-twolevel="True" />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search/:keyword" element={<Search />} />
          <Route path="/san-pham/:slug" element={<Sanpham />} />
          <Route path="/tin-tuc/:slug" element={<ChiTietTinTuc />} />
          <Route path="/:slug" element={<ChiTietTinTuc />} />
          <Route path="/ban-cau" element={<Navigate to="/danh-muc-san-pham/bon-cau-inax" replace />} />
          <Route path="/danh-muc-san-pham/bon-cau-inax/bon-cau-inax-1-khoi" element={<Navigate to="/danh-muc-san-pham/bon-cau-inax?child_slug=bon-cau-inax-1-khoi" replace />} />
          <Route path="/danh-muc-san-pham/:slug" element={<DanhmucSanpham />} />
          <Route path="/chinh-sach" element={<ChinhSach />} />
          <Route path="/chinh-sach/:slug" element={<ChiTietChinhSach />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/don-hang-da-mua" element={<DonHangDaMua />} />
          <Route path="/tra-cuu-don-hang" element={<TraCuuDonHang />} />
          <Route path="/tai-khoan" element={<TaiKhoanNganHang />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tin-tuc" element={<TinTuc />} />

          {/* Add other routes as needed */}
        </Routes>
      </main>
      <Footer />
      {/* <AiChatAssistant isOnProductPage={isOnProductPage} /> */}
      </div>
    </body>
  )
}
