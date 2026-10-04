import { useState, useRef, useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Frame from './components/Frame.jsx';
import MaskIcon from './components/MaskIcon.jsx';
import { C, F } from './tokens.js';
import { asset } from './assets.js';
import { useAuth } from './auth.jsx';
import { getOrder } from './api/client.js';
import { useAsync } from './hooks/useApi.js';
import { Spinner } from './components/Loaders.jsx';
import { abs, SLATE, GREEN, GREY565, rs } from './checkout/ui.jsx';

/*
 * Order tracking (Figma 255:2696). Reached from the "TRACK ORDER" button on the
 * order-placed screen (and any order link). Shows the order id, delivery
 * address, items, a fulfilment timeline (Confirmed → Shipped → Delivery, driven
 * by the backend tracking data), price details, payment mode and the
 * cancellation entry point.
 */
const PAGE_BG = '#f4f4f4';
const HAIR = '#565656';

const fmtMD = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }); } catch { return ''; } };
const PAYMENT_LABEL = { cod: 'COD', razorpay: 'Online' };

/* ── Cancellation / Replacement modal (Figma 678:7658) ──────────────────── */
function CancellationModal({ open, onClose, onSupport }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', width: 'min(86%, 430px)', background: SLATE, borderRadius: 16, padding: '40px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, textAlign: 'center' }}>
        <p style={{ ...F.m600, fontSize: 26, color: '#fff', lineHeight: '34px' }}>Cancellation/<br />Replacement</p>
        <p style={{ ...F.m400, fontSize: 18, color: '#fff', lineHeight: '26px' }}>
          To cancel or replace the order go to Support section or click below
        </p>
        <button
          onClick={onSupport}
          style={{ width: '100%', background: GREEN, border: 'none', borderRadius: 8, padding: '15px 10px', cursor: 'pointer' }}
        >
          <span style={{ ...F.m600, fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>GO TO SUPPORT</span>
        </button>
      </div>
    </div>
  );
}

/* ── Vertical fulfilment timeline ───────────────────────────────────────── */
function Timeline({ steps = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const dateText = s.at ? fmtMD(s.at) : s.expectedAt ? `Expected by ${fmtMD(s.expectedAt)}` : '';
        return (
          <div key={s.key} style={{ display: 'flex', gap: 14 }}>
            {/* dot + connector rail */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18 }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: s.done ? GREEN : '#cfcfcf', flexShrink: 0 }} />
              {!last && <div style={{ width: 3, flex: 1, minHeight: 34, background: '#d9d9d9' }} />}
            </div>
            <div style={{ paddingBottom: last ? 0 : 22 }}>
              <p style={{ ...F.m500, fontSize: 17, color: '#000' }}>{s.label}</p>
              {dateText && <p style={{ ...F.m400, fontSize: 14, color: GREY565, marginTop: 2 }}>{dateText}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PriceRow({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(bold ? F.m600 : F.m400), fontSize: bold ? 19 : 17, color: '#000' }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

export default function OrderTrackPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { data: order, loading, error } = useAsync(() => getOrder(id), [id], null);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Measure the flowing body to size the scaled frame (content is variable height).
  const bodyRef = useRef(null);
  const [frameH, setFrameH] = useState(1301);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setFrameH(128 + el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [order]);

  const a = order?.shippingAddress || {};
  const addrLine = [a.houseFlat, a.laneStreet, a.locality, a.townCity, a.state, a.pin].filter(Boolean).join(', ');
  const paymentLabel = PAYMENT_LABEL[order?.payment?.method] || (order?.payment?.method || '').toUpperCase() || '—';
  const loggedIn = !!user;

  return (
    <>
      <Frame height={frameH} cropTop={50}>
        <div style={{ position: 'absolute', inset: 0, background: PAGE_BG }} />

        {/* Header (mirrors YOUR ACCOUNT) */}
        <div style={abs({ left: 20, top: 66, display: 'flex', gap: 12, alignItems: 'center' })}>
          <button onClick={() => navigate(-1)} aria-label="Back" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
            <MaskIcon name="imgAcCaretLeft" size={32} color={SLATE} />
          </button>
          <p style={{ ...F.m600, fontSize: 20, color: SLATE }}>YOUR ACCOUNT</p>
        </div>
        <button
          onClick={() => navigate('/account')}
          style={abs({ left: 320, top: 66, width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', padding: 0 })}
        >
          <MaskIcon name={loggedIn ? 'imgAcSmile' : 'imgIcon'} size={24} color="#000" />
          <span style={{ ...F.m500, fontSize: 12, color: '#000', whiteSpace: 'nowrap' }}>{loggedIn ? 'Welcome' : 'Log in'}</span>
        </button>

        <div style={abs({ left: 20, top: 114, width: 353, height: 1, background: HAIR, opacity: 0.5 })} />

        {/* Body */}
        <div ref={bodyRef} style={abs({ left: 20, top: 128, width: 353, display: 'flex', flexDirection: 'column', gap: 18 })}>
          {loading && <Spinner size={40} label="Loading your order…" style={{ padding: '70px 0' }} />}
          {error && <p style={{ ...F.m500, fontSize: 15, color: C.pink }}>{error.message}</p>}

          {order && (
            <>
              {/* Order id */}
              <p style={{ ...F.m400, fontSize: 17, color: '#000' }}>
                Order Id : <span style={{ ...F.m600 }}>#{order.ref}</span>
              </p>

              {/* Address card */}
              <div style={{ background: '#fff', border: `0.5px solid ${HAIR}`, borderRadius: 10, padding: '16px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <MaskIcon name="imgAcLocation" size={34} color={SLATE} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...F.m400, fontSize: 16, color: SLATE, lineHeight: '22px' }}>{addrLine || 'No address saved'}</p>
                  {user?.phone && <p style={{ ...F.m400, fontSize: 16, color: SLATE, marginTop: 4 }}>{user.phone}</p>}
                </div>
                <button onClick={() => navigate('/account?tab=settings')} style={{ alignSelf: 'flex-start', background: SLATE, borderRadius: 8, border: 'none', padding: '8px 14px', cursor: 'pointer' }}>
                  <span style={{ ...F.m500, fontSize: 15, color: '#fefefe' }}>Change</span>
                </button>
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {order.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 64, height: 74, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#e7e7ea' }}>
                      {it.image && <img src={asset(it.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...F.m500, fontSize: 17, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</p>
                      <div style={{ display: 'flex', gap: 24, marginTop: 6 }}>
                        <span style={{ ...F.m400, fontSize: 15, color: GREY565 }}>Size: {it.size || 'M'}</span>
                        <span style={{ ...F.m400, fontSize: 15, color: GREY565 }}>Color: {it.color || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tracking timeline */}
              <div style={{ background: '#fff', border: `0.5px solid ${HAIR}`, borderRadius: 10, padding: '20px 18px' }}>
                {order.tracking?.cancelled ? (
                  <p style={{ ...F.m600, fontSize: 17, color: C.pink }}>Order Cancelled{order.tracking.cancelledAt ? ` · ${fmtMD(order.tracking.cancelledAt)}` : ''}</p>
                ) : (
                  <Timeline steps={order.tracking?.steps || []} />
                )}
              </div>

              {/* Price details */}
              <p style={{ ...F.m600, fontSize: 20, color: '#000', marginTop: 6 }}>Price Details</p>
              <div style={{ height: 1, background: '#d9d9d9' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <PriceRow label="Total MRP" value={rs(order.amount?.itemsTotal)} />
                <PriceRow label="Shipping" value={rs(order.amount?.shipping)} />
              </div>
              <div style={{ height: 1, background: '#d9d9d9' }} />
              <PriceRow label="Total Amount" value={rs(order.amount?.grandTotal)} bold />

              {/* Payment mode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...F.m500, fontSize: 17, color: '#000' }}>Payment Mode</span>
                <span style={{ ...F.m500, fontSize: 16, color: '#fff', background: SLATE, borderRadius: 8, padding: '10px 26px' }}>{paymentLabel}</span>
              </div>

              {/* Cancellation / replacement */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ ...F.m500, fontSize: 17, color: '#000' }}>Cancellation/<br />Replacement</span>
                <button onClick={() => setCancelOpen(true)} style={{ background: '#fff', border: `1px solid ${SLATE}`, borderRadius: 8, padding: '10px 18px', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ ...F.m500, fontSize: 16, color: SLATE, whiteSpace: 'nowrap' }}>Cancel Order</span>
                </button>
              </div>

              {/* Continue shopping */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14, marginBottom: 10 }}>
                <button onClick={() => navigate('/')} style={{ width: 293, background: '#fff', border: `1px solid ${SLATE}`, borderRadius: 10, padding: '13px 10px', cursor: 'pointer' }}>
                  <span style={{ ...F.m500, fontSize: 19, color: SLATE, whiteSpace: 'nowrap' }}>CONTINUE SHOPPING</span>
                </button>
              </div>
            </>
          )}
        </div>
      </Frame>

      <CancellationModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSupport={() => { setCancelOpen(false); navigate('/account?tab=help'); }}
      />
    </>
  );
}
