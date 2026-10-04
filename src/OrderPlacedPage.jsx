import { useNavigate, useLocation } from 'react-router-dom';
import { F } from './tokens.js';
import Frame from './components/Frame.jsx';
import { abs, SLATE, GREY565, TickCircle } from './checkout/ui.jsx';

/*
 * Order placed confirmation (Figma 196:2624). Terminal screen for both COD and
 * Razorpay. Reached via navigate(..., { state }) after the order is created.
 */
const FRAME_H = 852;

export default function OrderPlacedPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  // TRACK ORDER opens this order's tracking page; fall back to the account
  // Orders tab if we arrived here without an order id (e.g. a direct visit).
  const orderId = state?.orderId;
  const trackOrder = () => navigate(orderId ? `/order/${orderId}` : '/account?tab=orders');

  return (
    <Frame height={FRAME_H} cropTop={64}>
      <div style={abs({ inset: 0, background: '#fefefe' })} />

      <TickCircle />

      <p style={abs({ left: '50%', transform: 'translateX(-50%)', top: 382, width: 179, ...F.m600, fontSize: 19, color: '#000', textAlign: 'center' })}>
        ORDER PLACED SUCCESSFULLY !!!
      </p>

      <p style={abs({ left: '50%', transform: 'translateX(-50%)', top: 475, width: 287, ...F.m400, fontSize: 17, color: GREY565, textAlign: 'center' })}>
        Your item has been placed and is on its way to being processed
      </p>

      <button onClick={trackOrder} style={abs({ left: 50, top: 613, width: 293, background: SLATE, borderRadius: 10, border: 'none', padding: '12px 10px', cursor: 'pointer' })}>
        <p style={{ ...F.m500, fontSize: 19, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap' }}>TRACK ORDER</p>
      </button>

      <button onClick={() => navigate('/')} style={abs({ left: 50, top: 684, width: 293, background: 'transparent', border: `1px solid ${SLATE}`, borderRadius: 10, padding: '12px 10px', cursor: 'pointer' })}>
        <p style={{ ...F.m500, fontSize: 19, color: SLATE, textAlign: 'center', whiteSpace: 'nowrap' }}>CONTINUE SHOPPING</p>
      </button>
    </Frame>
  );
}
