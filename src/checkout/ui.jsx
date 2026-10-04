// Shared building blocks for the checkout → payment → order-placed flow.
// Everything here mirrors the Figma frames 1:1 (exact colours, fonts, text)
// and is rendered inside the scaled 393px <Frame> like the rest of the app.
import { F } from '../tokens.js';
import Icon from '../components/Icon.jsx';
import { basset } from '../bag/basset.js';
import { createRazorpayOrder, verifyRazorpayPayment, getOrder } from '../api/client.js';
import { downloadPaymentReceipt } from '../receipt.js';
import { trackPurchase } from '../lib/metaPixel.js';

// After a Razorpay payment is verified, fetch the full order and auto-download a
// PDF receipt with all details. Best-effort: never let a receipt error block the
// order-complete flow.
async function autoReceipt(orderId) {
  try {
    const full = await getOrder(orderId);
    downloadPaymentReceipt(full);
  } catch { /* receipt is a convenience — ignore failures */ }
}

// Exact Figma colour values.
export const SLATE = '#3c4154';   // Primary brand slate (buttons / selected)
export const GREEN = '#8ad80d';   // stepper "done" + success tick (exact Figma)
export const GREY565 = '#565656';

export const abs = (s) => ({ position: 'absolute', ...s });
export const rs = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN');

/* ── Title row: back caret (bag asset) + page title ─────────────────────── */
export function Header({ title, onBack }) {
  return (
    <div style={abs({ left: 20, top: 80, display: 'flex', gap: 12, alignItems: 'center' })}>
      <button onClick={onBack} aria-label="Back" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
        <Icon src={basset('imgIcon')} size={32} inset={['30.21%', '40.63%', '30.21%', '36.46%']} />
      </button>
      <p style={{ ...F.m600, fontSize: 20, color: '#000', whiteSpace: 'nowrap' }}>{title}</p>
    </div>
  );
}

/* ── Divider under the title (Figma Line12) ─────────────────────────────── */
export function TitleDivider() {
  return <div style={abs({ left: 20, top: 128, width: 353, height: 1, background: '#d9d9d9' })} />;
}

/* ── Cart → Checkout → Payment progress stepper (CSS, state-driven) ──────── */
function Dot({ x, on }) {
  return <div style={abs({ left: x - 7, top: 146, width: 14, height: 14, borderRadius: 7, background: on ? GREEN : '#d9d9d9' })} />;
}
function Conn({ x1, x2, on }) {
  return <div style={abs({ left: x1, top: 151.5, width: x2 - x1, height: 3, background: on ? GREEN : '#d9d9d9' })} />;
}
// reached: 2 → Cart+Checkout done (Payment current); 3 → all done.
export function Stepper({ reached = 2 }) {
  return (
    <>
      <Conn x1={91} x2={184} on={reached >= 2} />
      <Conn x1={198} x2={297} on={reached >= 3} />
      <Dot x={84} on={reached >= 1} />
      <Dot x={191} on={reached >= 2} />
      <Dot x={304} on={reached >= 3} />
      <p style={abs({ left: 66, top: 168, ...F.m500, fontSize: 17, color: '#000', whiteSpace: 'nowrap' })}>Cart</p>
      <p style={abs({ left: 'calc(40% - 2.2px)', top: 168, ...F.m500, fontSize: 17, color: '#000', whiteSpace: 'nowrap' })}>Checkout</p>
      <p style={abs({ left: 'calc(60% + 32.2px)', top: 168, ...F.m500, fontSize: 17, color: '#000', whiteSpace: 'nowrap' })}>Payment</p>
    </>
  );
}

/* ── Full-width fixed action bar at the bottom of the frame ─────────────── */
// `floating`: a rounded, inset button that sits above the bottom edge instead of
// the default full-bleed bar (used for PROCEED TO PAYMENT).
export function BottomBar({ label, onClick, disabled, bg = SLATE, floating = false }) {
  const layout = floating
    ? { left: 20, right: 20, bottom: 24, borderRadius: 14, padding: '16px 30px' }
    : { left: 0, width: 393, bottom: 0, padding: '20px 30px' };
  return (
    <div
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={0}
      style={abs({ ...layout, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.7 : 1 })}
    >
      <p style={{ ...F.m600, fontSize: 19, color: '#fefefe', whiteSpace: 'nowrap' }}>{label}</p>
    </div>
  );
}

/* ── Inline icons (self-contained SVG — no expiring Figma asset URLs) ────── */
export function LocationIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s6.5-5.8 6.5-10.5A6.5 6.5 0 1 0 5.5 10.5C5.5 15.2 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  );
}
export function EditIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}
// Razorpay logomark approximation (blue swoosh) on white tile.
export function RazorpayMark({ size = 42 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 3, overflow: 'hidden', background: '#fff', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 40 40">
        <path d="M22.3 4 11.5 36h6.2l3.9-11.6L29 4h-6.7z" fill="#3395FF" />
        <path d="M9 23.5 18 4h6.6L11.7 36 9 23.5z" fill="#072654" opacity="0.92" />
      </svg>
    </div>
  );
}
// Cash-on-delivery banknote. `color` matches the option's text colour so it
// stays visible on both the white (unselected) and dark (selected) tiles.
export function CodIcon({ size = 42, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6.5" width="20" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M5.5 9.5h.01M18.5 14.5h.01" />
    </svg>
  );
}
export function TickCircle() {
  return (
    <div style={abs({ left: 'calc(20% - 0.6px)', top: 128, width: 220, height: 220, borderRadius: 110, border: `1px solid ${SLATE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' })}>
      <div style={{ width: 180, height: 180, borderRadius: 90, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
    </div>
  );
}

/* ── Shared Razorpay flow (mock-aware) ──────────────────────────────────── */
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Maps cart lines to backend refs (price/name re-read server-side).
const toRefs = (items) => items.map((i) => ({ slug: i.id, qty: i.qty, size: i.size, color: i.color }));

/**
 * Create a Razorpay order and complete payment. In mock mode (no keys) it
 * confirms server-side directly; otherwise it opens the Razorpay widget.
 * Calls onPlaced({ orderId, amount, method }) on success.
 */
export async function payWithRazorpay({ items, onPlaced, onError, onDismiss }) {
  const order = await createRazorpayOrder({ items: toRefs(items) });
  const grand = order.summary?.grandTotal;

  // Every Razorpay success — mock or real, from /checkout or /checkout/cod, on
  // mobile or desktop — funnels through here, so this is the one place the
  // Purchase event has to fire. The order id doubles as the Meta eventID so a
  // future Conversions API event for the same order de-duplicates.
  const complete = (payload) => {
    trackPurchase(items, payload.amount, { orderId: payload.orderId, method: 'razorpay' });
    onPlaced(payload);
  };

  if (order.mock) {
    const res = await verifyRazorpayPayment({
      orderId: order.orderId,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: 'pay_mock',
      razorpay_signature: 'mock',
    });
    await autoReceipt(res.orderId);
    complete({ orderId: res.orderId, amount: res.amount?.grandTotal ?? grand, method: 'razorpay' });
    return;
  }

  const okScript = await loadRazorpay();
  if (!okScript) throw new Error('Could not load the payment gateway. Check your connection.');

  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.razorpayOrderId,
    name: 'Blutone',
    description: 'Order payment',
    prefill: order.prefill,
    theme: { color: SLATE },
    handler: async (resp) => {
      try {
        const res = await verifyRazorpayPayment({ orderId: order.orderId, ...resp });
        await autoReceipt(res.orderId);
        complete({ orderId: res.orderId, amount: res.amount?.grandTotal ?? grand, method: 'razorpay' });
      } catch (e) {
        onError?.(e.message || 'Payment verification failed.');
      }
    },
    modal: { ondismiss: () => onDismiss?.() },
  });
  rzp.on('payment.failed', (r) => onError?.(r?.error?.description || 'Payment failed. Please try again.'));
  rzp.open();
}
