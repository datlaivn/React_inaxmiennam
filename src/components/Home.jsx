import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { initAllCarousels } from "../utils/owlCarousel";
import { resolveApiBaseUrl } from "../utils/api";

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

const getNewsExcerpt = (htmlContent = "", maxLength = 72) => {
  const plainText = htmlContent
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) return "";
  if (plainText.length <= maxLength) return plainText;

  return `${plainText.slice(0, maxLength).trim()}...`;
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && value.includes("₫")) return value;
  // Parse as float to handle decimals like .00, then floor to remove them
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

export default function Home() {
  const baseUrl = resolveApiBaseUrl()
  const [banners, setBanners] = useState([]);
  const [flashsaleItems, setFlashsaleItems] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [danhmucSections, setDanhmucSections] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [countdown, setCountdown] = useState(getHoChiMinhCountdown);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const getSectionViewAllLink = (section) => {
    if (section?.url) return section.url;
    if (section?.slug) return `/danh-muc-san-pham/${encodeURIComponent(section.slug)}`;
    return '#';
  };



  useEffect(() => {
    const cleanup = initAllCarousels(".owl-carousel");
    return cleanup;
  }, []);

  useEffect(() => {
    if (!banners.length) return undefined;

    const timer = setTimeout(() => {
      initAllCarousels(".slide-home.owl-carousel");
    }, 0);

    return () => clearTimeout(timer);
  }, [banners]);

  useEffect(() => {
    if (!flashsaleItems.length) return undefined;

    const timer = setTimeout(() => {
      initAllCarousels(".slider-flashsale.owl-carousel");
    }, 0);

    return () => clearTimeout(timer);
  }, [flashsaleItems]);

  useEffect(() => {
    if (!danhmucSections.length) return undefined;

    const timer = setTimeout(() => {
      initAllCarousels(".slide-cate.owl-carousel");
    }, 0);

    return () => clearTimeout(timer);
  }, [danhmucSections]);

  useEffect(() => {
    if (!newsItems.length) return undefined;

    const timer = setTimeout(() => {
      initAllCarousels(".slide-topnews.owl-carousel");
    }, 0);

    return () => clearTimeout(timer);
  }, [newsItems]);

  useEffect(() => {
    setCountdown(getHoChiMinhCountdown());

    const timer = setInterval(() => {
      setCountdown(getHoChiMinhCountdown());
    }, 1000);

    return () => clearInterval(timer);
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
          console.error("Banner API error:", bannerResult.reason);
        }

        if (flashsaleResult.status === "fulfilled") {
          setFlashsaleItems(Array.isArray(flashsaleResult.value?.data) ? flashsaleResult.value.data : []);
        } else {
          console.error("Flashsale API error:", flashsaleResult.reason);
        }

        if (productCategoryResult.status === "fulfilled") {
          setProductCategories(
            Array.isArray(productCategoryResult.value?.data) ? productCategoryResult.value.data : []
          );
        } else {
          console.error("Product category API error:", productCategoryResult.reason);
        }

        if (danhmucResult.status === "fulfilled") {
          setDanhmucSections(Array.isArray(danhmucResult.value?.data) ? danhmucResult.value.data : []);
        } else {
          console.error("Danh muc API error:", danhmucResult.reason);
        }

        if (newsResult.status === "fulfilled") {
          setNewsItems(Array.isArray(newsResult.value?.data) ? newsResult.value.data : []);
        } else {
          console.error("Tin tuc API error:", newsResult.reason);
        }

        setIsPageLoading(false);
      })
      .catch((error) => {
        console.error("Home page loading error:", error);
        if (isMounted) {
          setIsPageLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [baseUrl]);

  if (isPageLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "linear-gradient(180deg, #111 0%, #1b1b1b 100%)",
          color: "#fff",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.18)",
            borderTopColor: "#fff",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.78)" }}>
          Đang tải trang chủ...
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <section>
        <style>{`
          .home-view-all-desktop {
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            margin: -6px 0 14px auto;
            color: #1d4ed8;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
          }

          .home-view-all-desktop:hover {
            color: #0f3ea8;
            text-decoration: underline;
          }

          @media (max-width: 767px) {
            .home-view-all-desktop {
              display: none;
            }
          }
          /* gift line under product title in home lists */
          .home-gift-line {
            display: block;
            box-sizing: border-box;
            max-width: 100%;
            margin-top: 6px;
            color: #ffd200; /* gold */
            font-weight: 700;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Prevent gift text bleeding into adjacent tiles by hiding overflow on product tiles */
          .box-slide .item,
          .slide-cate .owl-item,
          .slide-cate .owl-item .item {
            overflow: hidden;
            box-sizing: border-box;
            min-width: 0; /* prevent flex/width overflow */
          }
          /* Hoàn tiền: dùng lại style quà tặng (vàng), hoán đổi thành nền xanh lá */
          .home-refund-tag {
            background: linear-gradient(90deg, #059669 0%, #10b981 100%) !important;
            color: #fff !important;
          }
          .home-refund-tag .gift-text {
            color: #fff !important;
          }
          @media (max-width: 767px) {
            .home-gift-line { font-size: 12px; }
          }
        `}</style>
        <div className="slide-home owl-carousel owl-theme owl-loaded owl-drag">
          <div className="owl-stage-outer">
            <div
              className="owl-stage"
              style={{
                transform: "translate3d(0px, 0px, 0px)",
                transition: "0.25s",
                width: `${Math.max(banners.length, 1) * 100}vw`,
              }}
            >
              {banners.map((banner, index) => (
                <div
                  className={`owl-item ${index === 0 ? "active" : ""}`.trim()}
                  style={{ width: "100vw", flexShrink: 0, marginRight: "0px" }}
                  key={banner.id}
                >
                  <Link
                    aria-label={banner.title || "slide"}
                    data-cate={0}
                    data-place={1733}
                    to={banner.link || "#"}
                  >
              <img
                      style={{ width: "100vw", height: "auto", opacity: 1, objectFit: "cover" }}
               loading="lazy"
               className="owl-lazy ls-is-cached lazyloaded"
               data-src={banner.image}
               alt={banner.title}
               src={banner.image}
              />
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div className="owl-nav">
            <button type="button" role="presentation" className="owl-prev">
              <span aria-label="Previous">‹</span>
            </button>
            <button type="button" role="presentation" className="owl-next disabled">
              <span aria-label="Next">›</span>
            </button>
          </div>
          <div className="owl-dots">
            {banners.map((banner, index) => (
              <button
                role="button"
                className={`owl-dot ${index === 0 ? "active" : ""}`.trim()}
                key={`banner-dot-${banner.id}`}
              >
                <span />
              </button>
            ))}
          </div>
        </div>

        <div className="main">
          <div className=" flashsale-block    " id="flashsale">
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
              <div
                className="listproduct slider-flashsale owl-carousel owl-loaded owl-drag"
                data-size={flashsaleItems.length || 36}
              >
                <div className="owl-stage-outer">
                  <div
                    className="owl-stage"
                    style={{
                      transform: "translate3d(0px, 0px, 0px)",
                      transition: "1.5s",
                      width: `${Math.max(flashsaleItems.length, 1) * 207}px`,
                    }}
                  >
                    {flashsaleItems.map((product, index) => (
                      (() => {
                        const hasStockQuantity = product?.stock_quantity !== null && product?.stock_quantity !== undefined;
                        const stockQuantity = Number(product?.stock_quantity);
                        const maxStock = hasStockQuantity && Number.isFinite(stockQuantity) ? Math.ceil(stockQuantity / 10) * 10 || 10 : 10;
                        const stockLabel = hasStockQuantity && Number.isFinite(stockQuantity) ? stockQuantity : 0;
                        const flashsaleLabel = hasStockQuantity ? `Còn ${stockLabel}/${maxStock}` : 'Siêu ưu đãi';
                        const percentWidth = hasStockQuantity && maxStock > 0 ? Math.max(0, Math.min(100, Math.round((stockLabel / maxStock) * 100))) : 100;
                        
                        const salePrice = formatPrice(product?.sale_price || product?.price);
                        const regularPrice = formatPrice(product?.regular_price);
                        const showDiscount = product?.regular_price && (product?.sale_price || product?.price) && product?.regular_price != (product?.sale_price || product?.price);

                        return (
                      <div
                        className={`owl-item ${index === 0 ? "active" : ""}`.trim()}
                        style={{ width: "196.667px" }}
                        key={product.id}
                      >
                        <div className="item" data-id={product.id} data-pos={index}>
                          <Link
                            to={product.url || `/san-pham/${product.slug || ''}`}
                            className="remain_quantity main-contain"
                            data-name={product.name}
                            data-id={product.id}
                          >
                            <div className="item-img" style={{ position: 'relative' }}>
                              <img
                                loading="lazy"
                                alt={product.name}
                                width={207}
                                height={207}
                                src={product.image}
                              />
                              {Array.isArray(product?.san_pham_qua_tang) && product.san_pham_qua_tang.length ? (
                                <div className="product-gift-overlay" aria-hidden="true">
                                  <span className="gift-text">Tặng kèm: {product.san_pham_qua_tang[0]?.name} khi mua</span>
                                </div>
                              ) : null}
                              {Number(product?.refund_amount || 0) > 0 ? (
                                <div className="product-gift-overlay home-refund-tag" aria-hidden="true">
                                  <span className="gift-text">Hoàn {formatPrice(product?.refund_amount)} khi mua</span>
                                </div>
                              ) : null}
                            </div>
                            <h3>{product.name}</h3>
                            
                            <strong className="price">
                              {salePrice}
                              {showDiscount ? (
                                <span className="price-and-discount">
                                  <label className="price-old black">
                                    {regularPrice}
                                  </label>
                                </span>
                              ) : null}
                            </strong>
                            <div className="fs-contain">
        <img width={15} height={15} src="https://cdnv2.tgdd.vn/webmwg/2024/tz/images/fs-iconfire.png" alt="icon flashsale" />
        <span className="rq_count fscount ">
          <i style={{width: `${percentWidth}%`}} className="fs-iconfire">
          </i>
          <b>{flashsaleLabel}</b>
        </span>
      </div>
                          </Link>
                        </div>
                      </div>
                        )
                      })()
                    ))}
                  </div>
                </div>
                <div className="owl-nav">
                  <button type="button" role="presentation" className="owl-prev">
                    <span aria-label="Previous">‹</span>
                  </button>
                  <button type="button" role="presentation" className="owl-next">
                    <span aria-label="Next">›</span>
                  </button>
                </div>
                <div className="owl-dots disabled" />
              </div>
            </div>
          </div>
            <div className="warpper-box-product ">
            <div className="box-cate-product ">
              <ul className="choose-cate">
                {productCategories.map((category) => {
                  const removeInax = str => typeof str === 'string' ? str.replace(/inax/gi, '').trim() : str;
                  return (
                    <li key={category.id}>
                      <Link to={`/danh-muc-san-pham/${encodeURIComponent(category.slug)}`}>
                        <div className="img-catesp">
                          <img
                            src={category.image}
                            alt={removeInax(category.name)}
                            width={150}
                            height={112}
                          />
                        </div>
                        <span>{removeInax(category.name)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {danhmucSections.map((section) => {
                const removeInax = str => typeof str === 'string' ? str.replace(/inax/gi, '').trim() : str;
                const getDisplaySectionTitle = (title = "") => (/combo/i.test(title) ? "Combo" : title);
                const sectionProducts = Array.isArray(section.sanpham)
                  ? section.sanpham
                  : [];
                const sectionTitleRaw = section.danhmuc || section.name;
                const sectionTitle = getDisplaySectionTitle(removeInax(sectionTitleRaw));

                return (
                  <div className="box-slide" key={section.id}>
                    <Link to={`/danh-muc-san-pham/${encodeURIComponent(section.slug)}`} className="logo-cate  ">
                      <h2 className="title-text">{sectionTitle}</h2>
                    </Link>
                    
                    <div
                      className="slide-cate owl-carousel owl-theme owl-loaded owl-drag"
                      data-block={sectionTitle}
                    >
                      <div className="owl-stage-outer">
                        <div
                          className="owl-stage"
                          style={{
                            transform: "translate3d(0px, 0px, 0px)",
                            transition: "all",
                            width: `${Math.max(sectionProducts.length, 1) * 302.5}px`,
                          }}
                        >
                          {sectionProducts.map((product, index) => (
                            <div
                              className={`owl-item ${index < 4 ? "active" : ""}`.trim()}
                              style={{ width: "292.5px", marginRight: "10px" }}
                              key={product.id}
                            >
                              <div
                                className="item"
                                data-pos={index + 1}
                                data-block={sectionTitle}
                              >
                                <Link
                                  to={product.url || `/san-pham/${product.slug || ""}/`}
                                  className="main-contain"
                                  data-name={removeInax(product.name)}
                                  data-id={product.id}
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
                                      data-src={product.image}
                                      className="ls-is-cached lazyloaded"
                                      alt={removeInax(product.name)}
                                      width={300}
                                      height={300}
                                      src={product.image}
                                    />
                                    
                                  </div>
                                  <h3>{removeInax(product.name)}</h3>
                                 
                                  {product.regular_price &&
                                  (product.sale_price || product.price) &&
                                  product.regular_price != (product.sale_price || product.price) ? (
                                    <span className="box-price">
                                      {formatPrice(product.sale_price || product.price)}
                                      <strike>{formatPrice(product.regular_price)}</strike>
                                    </span>
                                  ) : (
                                    <strong className="price">
                                      {formatPrice(product.sale_price || product.price)}
                                    </strong>
                                  )}
                                  {Number(product?.stock_quantity) <= 0 && (
                                    <div className="home-product-stock" style={{ fontSize: '12px', marginTop: '4px', color: '#fbbf24' }}>
                                      Liên hệ
                                    </div>
                                  )}
                                 
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="owl-nav">
                        <button
                          type="button"
                          role="presentation"
                          className="owl-prev disabled"
                        >
                          <span aria-label="Previous">‹</span>
                        </button>
                        <button
                          type="button"
                          role="presentation"
                          className="owl-next"
                        >
                          <span aria-label="Next">›</span>
                        </button>
                      </div>
                      <div className="owl-dots disabled" />
                    </div>
                    <center><Link to={getSectionViewAllLink(section)} className="view-all home-view-all-desktop">
                      Xem tất cả {sectionTitle} 
                    </Link></center>
                  </div>
                );
              })}
            
              
              
             
            
            </div>
            <div className="box-slide">
              <Link to="/tin-tuc" className="logo-cate ">
                <h2>Tin Tức</h2>
              </Link>
              <div
                className="slide-topnews owl-carousel owl-theme owl-loaded owl-drag"
                data-block="TekZone"
              >
                <div className="owl-stage-outer">
                  <div
                    className="owl-stage"
                    style={{
                      transform: "translate3d(0px, 0px, 0px)",
                      transition: "all",
                      width: `${Math.max(newsItems.length, 1) * 403.333}px`,
                      height: '350px'
                    }}
                  >
                    {newsItems.map((item, index) => {
                      const newsLink = item.url || `/tin-tuc/${item.slug || item.id}`;
                      const newsExcerpt = getNewsExcerpt(item.content);

                      return (
                        <div
                          className={`owl-item ${index < 4 ? "active" : ""}`.trim()}
                          style={{ width: "393.333px", marginRight: "10px" }}
                          key={`${item.id}-${index}`}
                        >
                          <div className="item">
                            <Link to={newsLink}>
                              <div className="img-slide">
                                <img
                                  data-src={formatImageUrl(item.image, baseUrl)}
                                  alt={item.title}
                                  className="ls-is-cached lazyloaded"
                                  width={376}
                                  height={150}
                                  src={formatImageUrl(item.image, baseUrl)}
                                />
                              </div>
                              <h3>{item.title}</h3>
                              {newsExcerpt ? (
                                <p
                                  style={{
                                    marginTop: "8px",
                                    fontSize: "13px",
                                    lineHeight: "1.45",
                                    color: "#8f96a3",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {newsExcerpt}
                                </p>
                              ) : null}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="owl-nav">
                  <button
                    type="button"
                    role="presentation"
                    className="owl-prev disabled"
                  >
                    <span aria-label="Previous">‹</span>
                  </button>
                  <button
                    type="button"
                    role="presentation"
                    className="owl-next"
                  >
                    <span aria-label="Next">›</span>
                  </button>
                </div>
                <div className="owl-dots disabled" />
              </div>
            </div>
          </div>
          
        
        </div>
      </section>
    </>
  );
}
