import './desktop.css';
import { useNavigate, useLocation } from 'react-router-dom';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import { GREEN, SLATE } from '../checkout/ui.jsx';

/*
 * Desktop order-placed confirmation (desktop variant of Figma 196:2624 / mobile
 * OrderPlacedPage). Terminal screen for both COD and Razorpay, reached via
 * navigate('/order-placed', { state }) after the order is created.
 */
export default function DesktopOrderPlaced() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const orderId = state?.orderId;
  // TRACK ORDER opens this order's tracking page; fall back to the account
  // Orders tab if we somehow arrived without an id (e.g. a direct visit).
  const trackOrder = () => navigate(orderId ? `/order/${orderId}` : '/account?tab=orders');

  return (
    <div className="dt">
      <DesktopHeader />

      <div className="dt-wrap">
        <div className="dto-placed">
          <div className="dto-tick" style={{ borderColor: SLATE }}>
            <div className="disc" style={{ background: GREEN }}>
              <svg width="86" height="86" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
          </div>

          <h1 className="dto-placed-title">ORDER PLACED SUCCESSFULLY !!!</h1>
          <p className="dto-placed-sub">Your item has been placed and is on its way to being processed</p>

          <div className="dto-placed-actions">
            <button className="dto-btn solid" onClick={trackOrder}>TRACK ORDER</button>
            <button className="dto-btn outline" onClick={() => navigate('/')}>CONTINUE SHOPPING</button>
          </div>
        </div>
      </div>

      <DesktopFooter />
    </div>
  );
}
