import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { F } from './tokens.js';
import Frame from './components/Frame.jsx';
import { useCart } from './cart.jsx';
import { useAuth } from './auth.jsx';
import {
  abs, SLATE, Header, TitleDivider, Stepper, BottomBar,
  LocationIcon, EditIcon, RazorpayMark, CodIcon, payWithRazorpay,
} from './checkout/ui.jsx';
import { isCompleteProfile, profileGapMessage } from './checkout/address.js';
import { trackAddPaymentInfo } from './lib/metaPixel.js';

/*
 * Payment page (Figma 190:1916). Reached from the Bag → CHECKOUT button.
 * Shows the delivery address + payment method choice (Razorpay / Cash on
 * Delivery). PROCEED TO PAYMENT either opens Razorpay (mock-aware) or routes to
 * the COD confirmation page. Pixel-mirrors the Figma frame.
 */
const FRAME_H = 852;

// One selectable payment method tile.
function Option({ top, selected, onSelect, icon, label, unselText, unselBorder }) {
  const bg = selected ? SLATE : '#fff';
  const textColor = selected ? '#fff' : unselText;
  const borderColor = selected ? '#565656' : unselBorder;
  return (
    <button
      onClick={onSelect}
      style={abs({ left: 20, top, width: 353, height: 60, borderRadius: 10, background: bg, border: `0.5px solid ${borderColor}`, overflow: 'hidden', cursor: 'pointer', padding: 0 })}
    >
      <div style={abs({ left: 16.5, top: 8.5, display: 'flex', gap: 8, alignItems: 'center' })}>
        {icon(textColor)}
        <p style={{ ...F.m500, fontSize: 20, color: textColor, whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </button>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, ready, isAuthenticated } = useAuth();
  const { items, total, clear } = useCart();
  const [method, setMethod] = useState('cod'); // Figma shows COD pre-selected
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Once a Razorpay order is placed we clear the cart and route to the success
  // screen; this flag keeps the "empty bag → /bag" guard from stealing that nav.
  const placed = useRef(false);

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/bag" replace />;
  if (!placed.current && items.length === 0) return <Navigate to="/bag" replace />;

  const a = user?.address || {};
  const name = user?.name || 'there';
  const hasAddress = !!(a.houseFlat || a.laneStreet || a.locality || a.townCity || a.pin);
  const profileReady = isCompleteProfile(user);
  // Compose the saved address into clean lines (drops empty fields). All six
  // profile fields are represented; the block flows so it never overlaps.
  const addressLines = [
    [a.houseFlat, a.laneStreet].filter(Boolean).join(', '),
    [a.locality, a.townCity].filter(Boolean).join(', '),
    [a.state, a.pin].filter(Boolean).join(' - '),
  ].filter(Boolean);

  const proceed = () => {
    if (busy) return;
    setError('');
    if (!profileReady) { setError(profileGapMessage(user)); return; }
    trackAddPaymentInfo(items, total, method);
    if (method === 'cod') {
      navigate('/checkout/cod');
      return;
    }
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
    <Frame height={FRAME_H} cropTop={64}>
      <div style={abs({ inset: 0, background: '#fafafa' })} />

      <Header title="PAYMENT" onBack={() => navigate('/bag')} />
      <TitleDivider />
      <Stepper reached={2} />

      {/* Delivery address card — flows so any address length stays readable */}
      <div style={abs({ left: 20, top: 231, width: 353, minHeight: 199, background: '#fff', border: '0.5px solid #565656', borderRadius: 10, boxSizing: 'border-box', padding: '15px 52px 16px 14px', display: 'flex', gap: 11 })}>
        <div style={{ flexShrink: 0, marginTop: -1 }}><LocationIcon size={36} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 17, color: '#000', lineHeight: '22px', margin: 0 }}>
            <span style={F.m400}>Deliver to </span><span style={F.m500}>{name}</span>
          </p>
          <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 5, ...F.m400, fontSize: 17, color: '#000', lineHeight: '22px' }}>
            {hasAddress
              ? addressLines.map((l, i) => <p key={i} style={{ margin: 0, wordBreak: 'break-word' }}>{l}</p>)
              : <p style={{ margin: 0, color: '#9f9f9f' }}>Add your delivery address</p>}
          </div>
          {user?.phone && (
            <p style={{ marginTop: 14, margin: '14px 0 0', ...F.m400, fontSize: 17, color: '#9f9f9f' }}>+91 {user.phone}</p>
          )}
          {user?.email && (
            <p style={{ marginTop: 4, margin: '4px 0 0', ...F.m400, fontSize: 17, color: '#9f9f9f', wordBreak: 'break-all' }}>{user.email}</p>
          )}
        </div>
        <button onClick={() => navigate('/account?tab=settings', { state: { editProfile: true } })} aria-label="Edit address" style={abs({ right: 14.5, top: 14.5, width: 30, height: 30, background: SLATE, borderRadius: 4, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 3 })}>
          <EditIcon size={24} />
        </button>
      </div>

      {/* Payment options */}
      <p style={abs({ left: 20, top: 471, ...F.m500, fontSize: 19, color: '#000' })}>Payment Options</p>

      <Option
        top={516}
        selected={method === 'razorpay'}
        onSelect={() => setMethod('razorpay')}
        icon={() => <RazorpayMark size={42} />}
        label="Online Payment"
        unselText={SLATE}
        unselBorder={SLATE}
      />
      <Option
        top={598}
        selected={method === 'cod'}
        onSelect={() => setMethod('cod')}
        icon={(c) => <div style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CodIcon size={30} color={c} /></div>}
        label="CASH ON DELIVERY"
        unselText="#000"
        unselBorder="#565656"
      />

      {error && (
        <p style={abs({ left: 20, top: 678, width: 353, ...F.m500, fontSize: 14, color: '#fa0789' })}>{error}</p>
      )}

      <BottomBar label={busy ? 'PROCESSING…' : 'PROCEED TO PAYMENT'} onClick={proceed} disabled={busy} bg="#16a34a" floating />
    </Frame>
  );
}
