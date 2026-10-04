import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import './desktop.css';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import { CheckoutSteps } from './DesktopCheckout.jsx';
import { useCart } from '../cart.jsx';
import { useAuth } from '../auth.jsx';
import { placeCodOrder } from '../api/client.js';
import { trackPurchase } from '../lib/metaPixel.js';
import { rs, payWithRazorpay } from '../checkout/ui.jsx';
import { isCompleteProfile, profileGapMessage } from '../checkout/address.js';

const toRefs = (items) => items.map((i) => ({ slug: i.id, qty: i.qty, size: i.size, color: i.color }));

/*
 * Desktop COD confirmation — same logic as the mobile CodPage (place COD order,
 * or switch to Razorpay), reflowed for desktop with the shared header/footer.
 */
export default function DesktopCod() {
  const navigate = useNavigate();
  const { user, ready, isAuthenticated } = useAuth();
  const { items, total, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    <div className="dt">
      <DesktopHeader />
      <div className="dt-wrap dco">
        <div className="dtb-titlerow"><h1 className="dtb-title">Cash on Delivery</h1></div>
        <CheckoutSteps reached={3} />

        <div className="dco-cod">
          <div className="dco-codbox">
            <p className="t">Confirm cash delivery of</p>
            <p className="amt">{rs(total)}</p>
          </div>
          <p className="dco-codq">Are you sure you want to proceed with Cash on Delivery for your order?</p>
          <button className="dco-pay" onClick={confirmCod} disabled={busy}>{busy ? 'Placing…' : 'Confirm & Place Order'}</button>
          <div className="dco-or"><span />OR<span /></div>
          <button className="dco-payghost" onClick={payRazorpay} disabled={busy}>Online Payment</button>
          {error && <p className="dco-err center">{error}</p>}
        </div>
      </div>
      <DesktopFooter shop={false} />
    </div>
  );
}
