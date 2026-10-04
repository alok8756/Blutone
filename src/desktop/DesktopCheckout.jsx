import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import './desktop.css';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import { asset } from '../assets.js';
import { useCart } from '../cart.jsx';
import { useAuth } from '../auth.jsx';
import { LocationIcon, EditIcon, RazorpayMark, CodIcon, rs, payWithRazorpay } from '../checkout/ui.jsx';
import { isCompleteProfile, profileGapMessage } from '../checkout/address.js';
import { trackAddPaymentInfo } from '../lib/metaPixel.js';

// Desktop Cart → Checkout → Payment progress indicator.
export function CheckoutSteps({ reached = 2 }) {
  const step = (n, label) => (
    <div className={`dco-step${reached >= n ? ' on' : ''}`}><span className="dot" /><span className="lbl">{label}</span></div>
  );
  return (
    <div className="dco-steps">
      {step(1, 'Cart')}
      <span className={`dco-conn${reached >= 2 ? ' on' : ''}`} />
      {step(2, 'Checkout')}
      <span className={`dco-conn${reached >= 3 ? ' on' : ''}`} />
      {step(3, 'Payment')}
    </div>
  );
}

/*
 * Desktop Payment page — same logic as the mobile CheckoutPage (address,
 * Razorpay/COD choice, validation, mock-aware Razorpay, receipt), reflowed into
 * a two-column desktop layout with the shared header/footer.
 */
export default function DesktopCheckout() {
  const navigate = useNavigate();
  const { user, ready, isAuthenticated } = useAuth();
  const { items, totalMrp, shipping, total, clear } = useCart();
  const [method, setMethod] = useState('cod'); // COD pre-selected (mirrors mobile)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const placed = useRef(false);

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/bag" replace />;
  if (!placed.current && items.length === 0) return <Navigate to="/bag" replace />;

  const a = user?.address || {};
  const name = user?.name || 'there';
  const hasAddress = !!(a.houseFlat || a.laneStreet || a.locality || a.townCity || a.pin);
  const addressLines = [
    [a.houseFlat, a.laneStreet].filter(Boolean).join(', '),
    [a.locality, a.townCity].filter(Boolean).join(', '),
    [a.state, a.pin].filter(Boolean).join(' - '),
  ].filter(Boolean);

  const proceed = () => {
    if (busy) return;
    setError('');
    if (!isCompleteProfile(user)) { setError(profileGapMessage(user)); return; }
    trackAddPaymentInfo(items, total, method);
    if (method === 'cod') { navigate('/checkout/cod'); return; }
    setBusy(true);
    payWithRazorpay({
      items,
      onPlaced: ({ orderId, amount }) => {
        placed.current = true;
        navigate('/order-placed', { replace: true, state: { orderId, amount, method: 'razorpay' } });
        clear();
      },
      onError: (msg) => { if (msg) setError(msg); setBusy(false); },
      onDismiss: () => setBusy(false),
    }).catch((e) => { setError(e.message || 'Could not start payment.'); setBusy(false); });
  };

  return (
    <div className="dt">
      <DesktopHeader />
      <div className="dt-wrap dco">
        <div className="dtb-titlerow"><h1 className="dtb-title">Checkout</h1></div>
        <CheckoutSteps reached={2} />

        <div className="dco-body">
          <div className="dco-left">
            <div className="dco-addr">
              <div className="ic"><LocationIcon size={40} /></div>
              <div className="txt">
                <p className="to"><span>Deliver to </span><b>{name}</b></p>
                {hasAddress
                  ? addressLines.map((l, i) => <p key={i} className="l">{l}</p>)
                  : <p className="l muted">Add your delivery address</p>}
                {user?.phone && <p className="l muted">+91 {user.phone}</p>}
                {user?.email && <p className="l muted">{user.email}</p>}
              </div>
              <button className="dco-editaddr" aria-label="Edit address" onClick={() => navigate('/account?tab=settings', { state: { editProfile: true } })}>
                <EditIcon size={22} />
              </button>
            </div>

            <h3 className="dco-h">Payment Options</h3>
            <button className={`dco-opt${method === 'razorpay' ? ' on' : ''}`} onClick={() => setMethod('razorpay')}>
              <RazorpayMark size={40} /><span>Online Payment</span>
            </button>
            <button className={`dco-opt${method === 'cod' ? ' on' : ''}`} onClick={() => setMethod('cod')}>
              <span className="codic"><CodIcon size={30} color={method === 'cod' ? '#fff' : '#3c4154'} /></span><span>Cash on Delivery</span>
            </button>
            {error && <p className="dco-err">{error}</p>}
          </div>

          <aside className="dco-summary">
            <h3>Order Summary</h3>
            <div className="dco-items bt-scroll">
              {items.map((it) => (
                <div className="dco-item" key={it.key}>
                  <div className="thumb"><img src={asset(it.img)} alt="" /></div>
                  <div className="meta">
                    <p className="n">{it.title}</p>
                    <p className="s">{it.color ? `${it.color} · ` : ''}Size {it.size} · Qty {it.qty}</p>
                  </div>
                  <span className="p">{rs(Number(it.price) * it.qty)}</span>
                </div>
              ))}
            </div>
            <div className="dco-price">
              <div className="row"><span>Total MRP</span><span>{rs(totalMrp)}</span></div>
              <div className="row"><span>Shipping</span><span>{rs(shipping)}</span></div>
              <div className="row total"><span>Total Amount</span><span>{rs(total)}</span></div>
            </div>
            <button className="dco-pay" onClick={proceed} disabled={busy}>{busy ? 'PROCESSING…' : 'PROCEED TO PAYMENT'}</button>
          </aside>
        </div>
      </div>
      <DesktopFooter shop={false} />
    </div>
  );
}
