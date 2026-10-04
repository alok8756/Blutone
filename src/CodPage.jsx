import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { F } from './tokens.js';
import Frame from './components/Frame.jsx';
import { useCart } from './cart.jsx';
import { useAuth } from './auth.jsx';
import { placeCodOrder } from './api/client.js';
import { trackPurchase } from './lib/metaPixel.js';
import { abs, SLATE, GREY565, rs, Header, TitleDivider, Stepper, BottomBar, payWithRazorpay } from './checkout/ui.jsx';
import { isCompleteProfile, profileGapMessage } from './checkout/address.js';

/*
 * COD confirmation (Figma 192:2126). Reached from the Payment page when Cash on
 * Delivery is chosen. Confirm / PLACE ORDER places the COD order on the backend
 * (no charge); "Pay via Razorpay" switches to the gateway instead.
 */
const FRAME_H = 852;
const toRefs = (items) => items.map((i) => ({ slug: i.id, qty: i.qty, size: i.size, color: i.color }));

export default function CodPage() {
  const navigate = useNavigate();
  const { user, ready, isAuthenticated } = useAuth();
  const { items, total, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Set the instant an order is placed. Clearing the cart empties `items`, which
  // would otherwise trip the "empty bag → /bag" guard below and swallow the
  // success screen; this flag lets that guard stand down once we've navigated.
  const placed = useRef(false);

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/bag" replace />;
  if (!placed.current && items.length === 0) return <Navigate to="/bag" replace />;

  const toPlaced = ({ orderId, amount, method }) => {
    placed.current = true;
    navigate('/order-placed', { replace: true, state: { orderId, amount, method } });
    clear();
  };

  const confirmCod = async () => {
    if (busy) return;
    if (!isCompleteProfile(user)) { setError(profileGapMessage(user)); return; }
    setBusy(true); setError('');
    try {
      const res = await placeCodOrder({ items: toRefs(items) });
      const amount = res.amount?.grandTotal ?? total;
      trackPurchase(items, amount, { orderId: res.orderId, method: 'cod' });
      toPlaced({ orderId: res.orderId, amount, method: 'cod' });
    } catch (e) {
      setError(e.message || 'Could not place the order.');
      setBusy(false);
    }
  };

  const payRazorpay = () => {
    if (busy) return;
    if (!isCompleteProfile(user)) { setError(profileGapMessage(user)); return; }
    setBusy(true); setError('');
    payWithRazorpay({
      items,
      onPlaced: toPlaced,
      onError: (msg) => { if (msg) setError(msg); setBusy(false); },
      onDismiss: () => setBusy(false),
    }).catch((e) => { setError(e.message || 'Could not start payment.'); setBusy(false); });
  };

  return (
    <Frame height={FRAME_H} cropTop={64}>
      <div style={abs({ inset: 0, background: '#fefefe' })} />

      <Header title="COD PAYMENT" onBack={() => navigate('/checkout')} />
      <TitleDivider />
      <Stepper reached={3} />

      {/* Amount confirmation box */}
      <div style={abs({ left: 20, top: 260, width: 353, background: 'rgba(60,65,84,0.05)', border: `0.5px solid ${GREY565}`, borderRadius: 10, boxSizing: 'border-box', padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' })}>
        <p style={{ ...F.m500, fontSize: 19, color: '#000', lineHeight: '26px', textAlign: 'center' }}>Confirm cash delivery of</p>
        <p style={{ ...F.m600, fontSize: 19, color: '#000', lineHeight: '26px', textAlign: 'center' }}>{rs(total)}</p>
      </div>

      <p style={abs({ left: 20, top: 394, width: 338, ...F.m400, fontSize: 17, color: '#000', lineHeight: '26px' })}>
        Are you sure you want to proceed with Cash on Delivery for your order ?
      </p>

      {/* Confirm / OR / Pay via Razorpay */}
      <div style={abs({ left: 20, top: 488, width: 354, display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' })}>
        <button onClick={confirmCod} disabled={busy} style={{ width: '100%', background: SLATE, borderRadius: 10, border: 'none', padding: '12px 10px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
          <p style={{ ...F.m500, fontSize: 19, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap' }}>{busy ? 'Placing…' : 'Confirm'}</p>
        </button>

        <div style={{ display: 'flex', gap: 15, alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1, height: 1, background: GREY565 }} />
          <p style={{ ...F.m500, fontSize: 19, color: GREY565, textAlign: 'center' }}>OR</p>
          <div style={{ flex: 1, height: 1, background: GREY565 }} />
        </div>

        <button onClick={payRazorpay} disabled={busy} style={{ width: '100%', background: 'transparent', border: `1px solid ${SLATE}`, borderRadius: 10, padding: '12px 10px', cursor: busy ? 'default' : 'pointer' }}>
          <p style={{ ...F.m500, fontSize: 19, color: SLATE, textAlign: 'center', whiteSpace: 'nowrap' }}>Online Payment</p>
        </button>
      </div>

      {error && (
        <p style={abs({ left: 20, top: 690, width: 353, ...F.m500, fontSize: 14, color: '#fa0789', textAlign: 'center' })}>{error}</p>
      )}

      <BottomBar label={busy ? 'PROCESSING…' : 'PLACE ORDER'} onClick={confirmCod} disabled={busy} />
    </Frame>
  );
}
