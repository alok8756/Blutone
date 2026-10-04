import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import useMediaQuery from './hooks/useMediaQuery.js';
import { trackPageView } from './lib/metaPixel.js';
import { DEFAULT_PRODUCT_SLUG } from './product.js';
import Home from './Home.jsx';
import DesktopHome from './desktop/DesktopHome.jsx';
import ProductPage from './ProductPage.jsx';
import DesktopProduct from './desktop/DesktopProduct.jsx';
import BagPage from './BagPage.jsx';
import DesktopBag from './desktop/DesktopBag.jsx';
import ProductListPage from './ProductListPage.jsx';
import DesktopProductList from './desktop/DesktopProductList.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import DesktopCheckout from './desktop/DesktopCheckout.jsx';
import CodPage from './CodPage.jsx';
import DesktopCod from './desktop/DesktopCod.jsx';
import OrderPlacedPage from './OrderPlacedPage.jsx';
import DesktopOrderPlaced from './desktop/DesktopOrderPlaced.jsx';
import OrderTrackPage from './OrderTrackPage.jsx';
import DesktopOrderTrack from './desktop/DesktopOrderTrack.jsx';
import AccountPage from './AccountPage.jsx';
import DesktopAccount from './desktop/DesktopAccount.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import CategoryModal from './components/CategoryModal.jsx';

// < 768px  -> pixel-perfect mobile design (the exact Figma frame, scaled to fit)
// >= 768px -> reflowing desktop / tablet layout
export default function App() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [catOpen, setCatOpen] = useState(false);

  // The fixed bottom nav is 74 design-px tall, scaled to fit the frame width
  // (capped at 500). Reserve exactly that height below the content so the nav
  // sits flush against the page bottom with no extra gap.
  const [navH, setNavH] = useState(74);
  useEffect(() => {
    if (isDesktop) return;
    const update = () => setNavH(74 * (Math.min(window.innerWidth, 500) / 393));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isDesktop]);

  // scroll to top on route change
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // Meta Pixel: a route change here IS a page view — the app never does a full
  // reload, so without this every visit would be counted as one PageView. The
  // base snippet in index.html already counted the landing page, hence the skip.
  // Keyed on the route itself rather than a "first run" flag: StrictMode's
  // double-mounted effect would otherwise re-fire and double-count the landing
  // page, which the base snippet has already reported.
  const trackedRoute = useRef(pathname + search);
  useEffect(() => {
    const route = pathname + search;
    if (trackedRoute.current === route) return;
    trackedRoute.current = route;
    trackPageView();
  }, [pathname, search]);

  // /list also has a sticky sort/filter bar (same height) sitting above the nav.
  const onList = pathname.startsWith('/list');
  // The checkout flow (Figma) has its own bottom action bar and no nav. This
  // covers /order-placed and the /order/:id tracking page (both start "/order").
  const hideNav = pathname.startsWith('/checkout') || pathname.startsWith('/order');

  return (
    <>
      {/* reserve the nav height (and the sort/filter bar on /list) below content */}
      <div style={{ paddingBottom: isDesktop || hideNav ? 0 : navH * (onList ? 2 : 1) }}>
        <Routes>
          <Route path="/" element={isDesktop ? <DesktopHome /> : <Home />} />
          {/* One URL per product, keyed by the DB slug — shareable and
              bookmarkable. Bare /product (old links) redirects to a real one. */}
          <Route path="/product/:slug" element={isDesktop ? <DesktopProduct /> : <ProductPage />} />
          <Route path="/product" element={<Navigate to={`/product/${DEFAULT_PRODUCT_SLUG}`} replace />} />
          <Route path="/bag" element={isDesktop ? <DesktopBag /> : <BagPage />} />
          <Route path="/list" element={isDesktop ? <DesktopProductList /> : <ProductListPage />} />
          <Route path="/checkout" element={isDesktop ? <DesktopCheckout /> : <CheckoutPage />} />
          <Route path="/checkout/cod" element={isDesktop ? <DesktopCod /> : <CodPage />} />
          <Route path="/order-placed" element={isDesktop ? <DesktopOrderPlaced /> : <OrderPlacedPage />} />
          <Route path="/order/:id" element={isDesktop ? <DesktopOrderTrack /> : <OrderTrackPage />} />
          <Route path="/account" element={isDesktop ? <DesktopAccount /> : <AccountPage />} />
        </Routes>
      </div>

      {!isDesktop && !hideNav && (
        <>
          <MobileBottomNav onCategory={() => setCatOpen(true)} categoryActive={catOpen || onList} />
          <CategoryModal
            open={catOpen}
            onClose={() => setCatOpen(false)}
            onSelect={(cat) => { setCatOpen(false); navigate(`/list?cat=${cat.slug}`); }}
          />
        </>
      )}
    </>
  );
}
