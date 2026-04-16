import React, { useEffect, useState } from "react";
import axios from "axios";
import { initAllCarousels } from "../../utils/owlCarousel";
import { resolveApiBaseUrl } from "../../utils/api";
import { Link } from "react-router-dom";

const getHoChiMinhCountdown = () => {
  const now = new Date();
  const hoChiMinhNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  const endOfDay = new Date(hoChiMinhNow);

  endOfDay.setHours(23, 59, 59, 999);

  const diff = Math.max(0, endOfDay.getTime() - hoChiMinhNow.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return { hours, minutes, seconds };
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && value.includes("₫")) return value;
  const numValue = Math.floor(parseFloat(String(value).replace(/[^\d.]/g, "")));
  if (isNaN(numValue)) return value;
  return `${numValue.toLocaleString("vi-VN")}₫`;
};

const formatImageUrl = (url, baseUrl) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
};

export default function HomeMobile() {
  // Swipe state
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  // State quản lý slide hiện tại
  const [flashsaleSlide, setFlashsaleSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState(''); // 'next' | 'prev' | ''
  const baseUrl = resolveApiBaseUrl()
  const [banners, setBanners] = useState([]);
  const [flashsaleItems, setFlashsaleItems] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [danhmucSections, setDanhmucSections] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [countdown, setCountdown] = useState(getHoChiMinhCountdown);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const cleanup = initAllCarousels(".owl-carousel");
    return cleanup;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const requests = [
      axios.get(`${baseUrl}/get/banner`),
      axios.get(`${baseUrl}/get/flashsale`),
      axios.get(`${baseUrl}/get/product_category`),
      axios.get(`${baseUrl}/get/danhmuc`),
      axios.get(`${baseUrl}/get/tintuc`),
    ];

    Promise.allSettled(requests)
      .then((results) => {
        if (!isMounted) return;

        const [bannerResult, flashsaleResult, productCategoryResult, danhmucResult, newsResult] = results;

        if (bannerResult.status === "fulfilled") {
          setBanners(Array.isArray(bannerResult.value?.data) ? bannerResult.value.data : []);
        } else {
          console.error("Mobile banner API error:", bannerResult.reason);
        }

        if (flashsaleResult.status === "fulfilled") {
          setFlashsaleItems(Array.isArray(flashsaleResult.value?.data) ? flashsaleResult.value.data : []);
        } else {
          console.error("Mobile flashsale API error:", flashsaleResult.reason);
        }

        if (productCategoryResult.status === "fulfilled") {
          setProductCategories(
            Array.isArray(productCategoryResult.value?.data) ? productCategoryResult.value.data : []
          );
        } else {
          console.error("Mobile product category API error:", productCategoryResult.reason);
        }

        if (danhmucResult.status === "fulfilled") {
          setDanhmucSections(Array.isArray(danhmucResult.value?.data) ? danhmucResult.value.data : []);
        } else {
          console.error("Mobile danh muc API error:", danhmucResult.reason);
        }

        if (newsResult.status === "fulfilled") {
          setNewsItems(Array.isArray(newsResult.value?.data) ? newsResult.value.data : []);
        } else {
          console.error("Mobile tintuc API error:", newsResult.reason);
        }

        setIsPageLoading(false);
      })
      .catch((error) => {
        console.error("Mobile home page loading error:", error);
        if (isMounted) {
          setIsPageLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [baseUrl]);

  useEffect(() => {
    if (!banners.length) return undefined;

    const timer = setTimeout(() => {
      initAllCarousels(".slide-home.owl-carousel");
    }, 0);

    return () => clearTimeout(timer);
  }, [banners]);

  useEffect(() => {
    if (!newsItems.length) return undefined;

    const timer = setTimeout(() => {
      initAllCarousels(".slide-topnews.owl-carousel");
    }, 0);

    return () => clearTimeout(timer);
  }, [newsItems]);

  useEffect(() => {
    if (!flashsaleItems.length) return undefined;

    const timer = setTimeout(() => {
      initAllCarousels(".slider-flashsale.owl-carousel");
    }, 0);

    return () => clearTimeout(timer);
  }, [flashsaleItems]);

  useEffect(() => {
    setCountdown(getHoChiMinhCountdown());

    const timer = setInterval(() => {
      setCountdown(getHoChiMinhCountdown());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const removeInax = str => typeof str === 'string' ? str.replace(/s/gi, '').trim() : str;
  const mobileChooseCategories =
    productCategories.length > 0
      ? productCategories
          .map(cat => ({ ...cat, name: removeInax(cat.name), slug: cat.slug }))
          .slice(0, 6)
      : [
            { name: removeInax("iPhone"), slug: "iphone", image: "https://cdnv2.tgdd.vn/webmwg/2024/tz/images/mobile/IP_Mobile_25.png" },
            { name: removeInax("Mac"), slug: "mac", image: "https://cdnv2.tgdd.vn/webmwg/2024/tz/images/mobile/Mac_Mobile_25.png" },
            { name: removeInax("iPad"), slug: "ipad", image: "https://cdnv2.tgdd.vn/webmwg/2024/tz/images/mobile/IPad_Mobile_25.png" },
            { name: removeInax("Watch"), slug: "apple-watch", image: "https://cdnv2.tgdd.vn/webmwg/2024/tz/images/mobile/Watch_Mobile.png" },
            { name: removeInax("Tai nghe, loa"), slug: "am-thanh", image: "https://cdnv2.tgdd.vn/webmwg/2024/tz/images/mobile/Amthanh_Mobile_25.png" },
            { name: removeInax("Phụ kiện"), slug: "phu-kien", image: "https://cdnv2.tgdd.vn/webmwg/2024/tz/images/mobile/PK_Mobile_25.png" },
        ];

  const mobileDanhmucSections = danhmucSections
    .map(section => ({
      ...section,
      danhmuc: removeInax(section?.danhmuc),
      name: removeInax(section?.name),
      slug: section?.slug
    }))
    .slice(0, 6);

  const getSectionTitleClass = (title = "") => {
    const normalizedTitle = title.toLowerCase();

    if (normalizedTitle.includes("tai nghe") || normalizedTitle.includes("loa")) {
      return "title-text-amthanh";
    }

    if (normalizedTitle.includes("phụ kiện") || normalizedTitle.includes("phu kien")) {
      return "title-text-phukien";
    }

    return "title-text";
  };

  // Helper: If title contains 'Combo', only show 'Combo'
  const getDisplaySectionTitle = (title = "") => {
    if (/combo/i.test(title)) return "Combo";
    return title;
  };

  const renderCategorySections = () =>
    mobileDanhmucSections.map((section) => {
      const sectionProducts = Array.isArray(section?.sanpham)
        ? section.sanpham.slice(0, 4)
        : [];
      const sectionTitle = section?.danhmuc || section?.name || "Sản phẩm";
      const sectionLink = section?.slug || "";

      return (
        <div className="box-slide" key={section?.id || sectionTitle}>
          <Link to={"/danh-muc-san-pham/" + sectionLink} className="logo-cate  ">
            {(sectionTitle.toLowerCase().includes("iphone") ||
              sectionTitle.toLowerCase().includes("ipad") ||
              sectionTitle.toLowerCase().includes("watch") ||
              sectionTitle.toLowerCase().includes("mac")) && <i className="topzone-iconapple" />}
            <h2 className={getSectionTitleClass(sectionTitle)}>{getDisplaySectionTitle(sectionTitle)}</h2>
          </Link>
          <ul className="list-cate" data-block={sectionTitle}>
                    {sectionProducts.map((product, index) => {
              const salePrice = formatPrice(product?.sale_price || product?.price);
              const regularPrice = formatPrice(product?.regular_price);
              const showDiscount = regularPrice && salePrice && regularPrice !== salePrice;

              return (
                    <li
                      className="item"
                      data-pos={index + 1}
                      data-block={sectionTitle}
                      key={product?.id || `${sectionTitle}-${index}`}
                    >
                      <Link
                        to={product?.url || `/san-pham/${product?.slug || ""}`}
                        className="main-contain"
                        data-name={product?.name}
                        data-id={product?.id}
                        data-cate={sectionTitle}
                        data-box="BoxHome"
                      >
                        
                        {Number(product?.refund_amount || 0) > 0 ? (
                                   <label  >Hoàn {formatPrice(product?.refund_amount)} khi mua</label>
                                     
                                    ) : null}
                              {Array.isArray(product?.san_pham_qua_tang) && product.san_pham_qua_tang.length ? (
                              <label  >Tặng kèm: {product.san_pham_qua_tang[0]?.name} khi mua</label>
                            ) : null}
                        <div className="img-slide" style={{ position: 'relative' }}>
                          <img
                            data-src={product?.image}
                            className="ls-is-cached lazyloaded"
                            alt={product?.name}
                            width={110}
                            height={110}
                            src={product?.image}
                          />
                          
                        </div>
                        <h3>{product?.name}</h3>
                        
                        {showDiscount ? (
                          <span className="box-price">
                            {salePrice}
                            <strike>{regularPrice}</strike>
                          </span>
                        ) : (
                          <strong className="price">{salePrice}</strong>
                        )}
                        {Number(product?.stock_quantity) <= 0 && (
                          <div className="home-mobile-product-stock" style={{ fontSize: '11px', marginTop: '2px', color: '#fbbf24' }}>
                            Liên hệ
                          </div>
                        )}
                       
                      </Link>
                    </li>
              );
            })}
          </ul>
          <Link to={"/danh-muc-san-pham/" + sectionLink} className="view-all">
            Xem tất cả {sectionTitle}
          </Link>
        </div>
      );
    });

  if (isPageLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "linear-gradient(180deg, #111 0%, #1b1b1b 100%)",
          color: "#fff",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.18)",
            borderTopColor: "#fff",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.78)" }}>
          Đang tải trang chủ...
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <>
     

      <div className="bg-sg" />
      <input type="hidden" data-location-twolevel="True" />
      <section>
        <div className="slide-home owl-carousel owl-theme owl-loaded owl-drag">
          <div className="owl-stage-outer">
            <div
              className="owl-stage"
              style={{
                transform: "translate3d(0px, 0px, 0px)",
                transition: "all",
                width: `${Math.max(banners.length, 1) * 100}vw`,
              }}
            >
              {(banners.length ? banners : [{ id: "fallback-banner", image: "//cdnv2.tgdd.vn/mwg-static/topzone/Banner/6d/13/6d13fca935b39ea78b64802ff5f95486.jpg", title: "Banner" }]).map(
                (banner, index) => (
                  <div
                    className={`owl-item ${index === 0 ? "active" : ""}`.trim()}
                    style={{ width: "100vw", marginRight: "0px", flexShrink: 0 }}
                    key={banner.id || index}
                  >
                    <Link aria-label={banner.title || "slide"} data-cate={0} data-place={1734} to={banner.link || "/"}>
                      <img
                        style={{ width: "100vw", height: "220px", objectFit: "cover" }}
                        loading="lazy"
                        className="owl-lazy ls-is-cached lazyloaded"
                        data-src={banner.image}
                        alt={banner.title || "banner"}
                        src={banner.image}
                      />
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className=" flashsale-block fs-mobile   " id="flashsale">
          <div className="stage-two">
            <div className="load" />
          </div>
          <div className="flex-fs">
            <div className="gvdshock">
              <h3>
                <i className="lightning-ic">
                  <img
                    width={32}
                    height={70}
                    src="https://cdnv2.tgdd.vn/webmwg/2024/tz/images/icon-fs.png"
                    alt="lightningicon"
                  />
                </i>
              </h3>
              <div
                className="endtime"
                data-countdown="3/9/2026 11:59:00 PM"
                data-begin="3/9/2026 9:00:00 AM"
              >
                <span className="title-end">Kết thúc trong</span>
                <span className="countdown-timer">
                  <label id="hour">{countdown.hours}</label>
                  <label id="minute">{countdown.minutes}</label>
                  <label id="second">{countdown.seconds}</label>
                </span>
              </div>
            </div>
            <div className="listing-timeline">
              <a href="javascript:;" className="active" data-ishappening="true">
                <span>Đang diễn ra</span>
                <span className="timeline">09:00 - 23:59</span>
              </a>
            </div>
          </div>
          <div className="box-scroll">
            <div className="listproduct slider-flashsale owl-carousel slick-initialized slick-slider" data-size={flashsaleItems.length}>
              <button
                className={`slide-arrow prev-arrow slick-arrow${flashsaleSlide === 0 ? ' slick-disabled' : ''}`}
                aria-disabled={flashsaleSlide === 0}
                style={{ display: 'inline-block' }}
                onClick={() => {
                  if (flashsaleSlide > 0) {
                    setSlideDirection('prev');
                    setFlashsaleSlide(flashsaleSlide - 1);
                  }
                }}
              >
                <span className="icon-prev" />
              </button>
              <div className="slick-list draggable">
                <div
                  className={`slick-track${slideDirection ? ' anim-' + slideDirection : ''}`}
                  style={{
                    opacity: 1,
                    width: `${Math.ceil(flashsaleItems.length / 2) * 410}px`,
                    transform: `translate3d(-${flashsaleSlide * 410}px, 0px, 0px)`,
                    transition: 'transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    willChange: 'transform',
                  }}
                  onTransitionEnd={() => setSlideDirection('')}
                  onTouchStart={e => {
                    setTouchStartX(e.touches[0].clientX);
                  }}
                  onTouchMove={e => {
                    setTouchEndX(e.touches[0].clientX);
                  }}
                  onTouchEnd={() => {
                    if (touchStartX !== null && touchEndX !== null) {
                      const delta = touchEndX - touchStartX;
                      // Swipe right: chuyển về trái
                      if (delta > 50 && flashsaleSlide > 0) {
                        setSlideDirection('prev');
                        setFlashsaleSlide(flashsaleSlide - 1);
                      }
                      // Swipe left: chuyển sang phải
                      else if (delta < -50 && flashsaleSlide < Math.ceil(flashsaleItems.length / 4) - 1) {
                        setSlideDirection('next');
                        setFlashsaleSlide(flashsaleSlide + 1);
                      }
                    }
                    setTouchStartX(null);
                    setTouchEndX(null);
                  }}
                >
                  {(() => {
                    // Chia thành từng slide, mỗi slide 2 sản phẩm
                    const slides = [];
                    for (let i = 0; i < flashsaleItems.length; i += 2) {
                      slides.push(flashsaleItems.slice(i, i + 2));
                    }
                    return slides.map((slide, idx) => (
                      <div
                        className={`slick-slide${idx === flashsaleSlide ? ' slick-current slick-active' : ' slick-active'}`}
                        data-slick-index={idx}
                        aria-hidden={idx !== flashsaleSlide ? 'true' : 'false'}
                        tabIndex={idx === flashsaleSlide ? 0 : -1}
                        style={{ width: '205px' }}
                        key={idx}
                      >
                        {slide.map((product, index) => {
                          const salePrice = formatPrice(product?.sale_price || product?.price);
                          const regularPrice = formatPrice(product?.regular_price);
                          const hasStockQuantity = product?.stock_quantity !== null && product?.stock_quantity !== undefined;
                          const stockQuantity = Number(product?.stock_quantity);
                          // Round up to nearest 10 for max stock
                          const maxStock = hasStockQuantity && Number.isFinite(stockQuantity) ? Math.ceil(stockQuantity / 10) * 10 : 0;
                          const stockLabel = hasStockQuantity && Number.isFinite(stockQuantity) ? stockQuantity : 0;
                          const flashsaleLabel = hasStockQuantity ? `Còn ${stockLabel}/${maxStock}` : 'Siêu ưu đãi';
                          // Calculate percent width for fire icon
                          const percentWidth = hasStockQuantity && maxStock > 0 ? Math.max(0, Math.min(100, Math.round((stockLabel / maxStock) * 100))) : 100;
                          const discount = regularPrice && salePrice && regularPrice !== salePrice && product?.discount_percent ? `-${product.discount_percent}%` : '';
                          return (
                            <div><div className="item" data-id={product?.id} data-pos={idx * 2 + index + 1} style={{ width: '100%', display: 'inline-block' }} key={product?.id || index}>
                              <Link
                                to={product?.url || `/san-pham/${product?.slug || ''}`}
                                className="remain_quantity main-contain"
                                data-name={product?.name}
                                data-id={product?.id}
                                data-cate={product?.category_name || product?.category || 'Flashsale'}
                                data-box="BoxHomeFlashsale"
                                tabIndex={idx === flashsaleSlide ? 0 : -1}
                              >
                                <div className="item-img" style={{ position: 'relative' }}>
                                  <img
                                    data-src={product?.image}
                                    className="ls-is-cached lazyloaded"
                                    alt={product?.name}
                                    width={146}
                                    height={146}
                                    src={product?.image}
                                  />
                                  {Array.isArray(product?.san_pham_qua_tang) && product.san_pham_qua_tang.length ? (
                                    <div className="product-gift-overlay" aria-hidden="true">
                                      <span className="gift-text">Tặng kèm: {product.san_pham_qua_tang[0]?.name} khi mua</span>
                                    </div>
                                  ) : null}
                                  {Number(product?.refund_amount || 0) > 0 ? (
                                    <div className="product-gift-overlay home-refund-tag" aria-hidden="true">
                                      <span className="gift-text">Hoàn {formatPrice(product?.refund_amount)}đ khi mua</span>
                                    </div>
                                  ) : null}
                                </div>
                                <h3>{product?.name}</h3>
                                <strong className="price">
                                  {salePrice}
                                  {regularPrice && regularPrice !== salePrice ? (
                                    <span className="price-and-discount">
                                      <label className="price-old black">{regularPrice}</label>
                                      <small>{discount}</small>
                                    </span>
                                  ) : null}
                                </strong>
                                <div className="fs-contain">
                                  <img width={15} height={15} src="https://cdnv2.tgdd.vn/webmwg/2024/tz/images/fs-iconfire.png" alt="icon flashsale" />
                                  <span className="rq_count fscount ">
                                    <i style={{ width: `${percentWidth}%` }} className="fs-iconfire"></i>
                                    <b>{flashsaleLabel}</b>
                                  </span>
                                </div>
                              </Link>
                            </div></div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              {(() => {
                // Tính số slide
                // Mỗi slide gồm 2 slick-slide (tức 4 sản phẩm)
                const slickSlides = [];
                for (let i = 0; i < flashsaleItems.length; i += 2) {
                  slickSlides.push(flashsaleItems.slice(i, i + 2));
                }
                const totalSlides = Math.ceil(slickSlides.length / 2); // mỗi slide gồm 2 slick-slide
                return (
                  <button
                    className={`slide-arrow next-arrow slick-arrow${flashsaleSlide === totalSlides - 1 ? ' slick-disabled' : ''}`}
                    aria-disabled={flashsaleSlide === totalSlides - 1}
                    style={{ display: 'inline-block' }}
                    onClick={() => {
                      if (flashsaleSlide < totalSlides - 1) {
                        setSlideDirection('next');
                        setFlashsaleSlide(flashsaleSlide + 1);
                      }
                    }}
                  >
                    <span className="icon-next" />
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        <ul className="choose-cate ">
          {mobileChooseCategories.map((category, index) => (
            <li key={category.id || category.slug || index}>
                <Link to={`/danh-muc-san-pham/${category.slug || ""}`}>
                <div className="img-catesp cateiphone">
                  <img
                    src={category.image}
                    alt={category.name}
                    width={77}
                    height={82}
                  />
                </div>
                <span>{category.name}</span>
              </Link>
            </li>
          ))}
        </ul>

    		{renderCategorySections()}
        <div className="box-slide box-topnews marginbottom">
          <Link to="/chinh-sach" className="logo-cate ">
            <h2>Tin Tức</h2>
          </Link>
          <div className="slide-topnews owl-carousel owl-theme owl-loaded owl-drag" data-block="TekZone">
            <div className="owl-stage-outer">
              <div
                className="owl-stage"
                style={{
                  transform: "translate3d(0px, 0px, 0px)",
                  transition: "all",
                  width: `${Math.max(newsItems.length + 1, 1) * 360}px`,
                  paddingLeft: "30px",
                  paddingRight: "30px",
                }}
              >
                {newsItems.map((item, index) => (
                  <div className={`owl-item ${index === 0 ? "active" : ""}`.trim()} style={{ width: "350px", marginRight: "10px" }} key={item.id || index}>
                    <div className="item">
                      <Link to={item.url || `/tin-tuc/${item.slug || item.id}`}>
                        <div className="img-slide">
                          <img
                            data-src={formatImageUrl(item.image, baseUrl)}
                            alt={item.title}
                            className="lazyloaded"
                            width={376}
                            height={150}
                            src={formatImageUrl(item.image, baseUrl)}
                          />
                        </div>
                        <h3>{item.title}</h3>
                        <span className="timepost">Tin mới</span>
                      </Link>
                    </div>
                  </div>
                ))}
                <div className="owl-item" style={{ width: "350px", marginRight: "10px" }}>
                  <div className="item box-viewmore">
                    <Link to="/chinh-sach">Xem thêm tin tức</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
       
      </section>
      <div className="slide-popup">
        <div className="bg-popup" />
      </div>
    
    </>
  );
}
