import './desktop.css';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import Icon from '../components/Icon.jsx';
import { asset } from '../assets.js';
import { basset } from '../bag/basset.js';
import { useAuth } from '../auth.jsx';
import { getOrder } from '../api/client.js';
import { useAsync } from '../hooks/useApi.js';
import { Spinner } from '../components/Loaders.jsx';
import { GREEN, rs, LocationIcon } from '../checkout/ui.jsx';

/*
 * Desktop order tracking (desktop variant of Figma 255:2696 / mobile
 * OrderTrackPage). Reached from "TRACK ORDER" on the order-placed screen and any
 * order link. Shows the order id, delivery address, items, a fulfilment timeline
 * (driven by the backend tracking data), price details, payment mode and the
 * cancellation entry point + modal (Figma 678:7658).
 */
const fmtMD = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }); } catch { return ''; } };
const PAYMENT_LABEL = { cod: 'COD', razorpay: 'Online' };

/* Cancellation / Replacement modal (Figma 678:7658). */
function CancellationModal({ open, onClose, onSupport }) {
  if (!open) return null;
  return (
    <div className="dto-modal-wrap">
      <div className="dto-modal-scrim" onClick={onClose} />
      <div className="dto-modal">
        <p className="title">Cancellation/<br />Replacement</p>
        <p className="body">To cancel or replace the order go to Support section or click below</p>
        <button className="cta" style={{ background: GREEN }} onClick={onSupport}>GO TO SUPPORT</button>
      </div>
    </div>
  );
}

/* Vertical fulfilment timeline (Confirmed → Shipped → Delivered). */
function Timeline({ steps = [] }) {
  return (
    <div className="dto-timeline">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const dateText = s.at ? fmtMD(s.at) : s.expectedAt ? `Expected by ${fmtMD(s.expectedAt)}` : '';
        return (
          <div className="row" key={s.key}>
            <div className="rail">
              <span className="dot" style={{ background: s.done ? GREEN : '#cfcfcf' }} />
              {!last && <span className="line" />}
            </div>
            <div className="txt" style={{ paddingBottom: last ? 0 : 22 }}>
              <p className="label">{s.label}</p>
              {dateText && <p className="date">{dateText}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DesktopOrderTrack() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { data: order, loading, error } = useAsync(() => getOrder(id), [id], null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const a = order?.shippingAddress || {};
  const addrLine = [a.houseFlat, a.laneStreet, a.locality, a.townCity, a.state, a.pin].filter(Boolean).join(', ');
  const paymentLabel = PAYMENT_LABEL[order?.payment?.method] || (order?.payment?.method || '').toUpperCase() || '—';

  return (
    <div className="dt">
      <DesktopHeader />

      <div className="dt-wrap">
        <div className="dtb-titlerow">
          <button className="dtp-back" style={{ padding: 0 }} onClick={() => navigate(-1)} aria-label="Back">
            <Icon src={basset('imgIcon')} size={30} inset={['30.21%', '40.63%', '30.21%', '36.46%']} />
          </button>
          <h1 className="dtb-title">Track Order</h1>
        </div>

        {loading && <Spinner size={46} label="Loading your order…" style={{ padding: '90px 0' }} />}
        {error && <p className="dto-state err">{error.message}</p>}

        {order && (
          <div className="dtb-main">
            {/* Left: order id, address, items, timeline */}
            <div className="dtb-items">
              <p className="dto-orderid">Order Id : <b>#{order.ref}</b></p>

              <div className="dto-addr">
                <LocationIcon size={32} />
                <div className="info">
                  <p className="line">{addrLine || 'No address saved'}</p>
                  {user?.phone && <p className="line">{user.phone}</p>}
                </div>
                <button className="change" onClick={() => navigate('/account?tab=settings', { state: { editProfile: true } })}>Change</button>
              </div>

              <div className="dto-items">
                {order.items.map((it, i) => (
                  <div className="dto-line" key={i}>
                    <div className="img">{it.image && <img src={asset(it.image)} alt="" />}</div>
                    <div className="meta">
                      <p className="name">{it.name}</p>
                      <div className="attrs">
                        <span>Size: {it.size || 'M'}</span>
                        <span>Color: {it.color || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dto-track-card">
                {order.tracking?.cancelled ? (
                  <p className="cancelled">Order Cancelled{order.tracking.cancelledAt ? ` · ${fmtMD(order.tracking.cancelledAt)}` : ''}</p>
                ) : (
                  <Timeline steps={order.tracking?.steps || []} />
                )}
              </div>
            </div>

            {/* Right: price details + payment + cancel + continue */}
            <div className="dtb-side">
              <div className="dtb-summary">
                <h3>Price Details</h3>
                <hr />
                <div className="dtb-srow"><span>Total MRP</span><span>{rs(order.amount?.itemsTotal)}</span></div>
                <div className="dtb-srow"><span>Shipping</span><span>{rs(order.amount?.shipping)}</span></div>
                <hr />
                <div className="dtb-total"><span className="lbl">Total Amount</span><span className="amt">{rs(order.amount?.grandTotal)}</span></div>

                <div className="dto-payrow">
                  <span className="lbl">Payment Mode</span>
                  <span className="pill">{paymentLabel}</span>
                </div>

                <div className="dto-cancelrow">
                  <span className="lbl">Cancellation/<br />Replacement</span>
                  <button className="cancel" onClick={() => setCancelOpen(true)}>Cancel Order</button>
                </div>

                <button className="dto-continue" onClick={() => navigate('/')}>CONTINUE SHOPPING</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DesktopFooter />

      <CancellationModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSupport={() => { setCancelOpen(false); navigate('/account?tab=help'); }}
      />
    </div>
  );
}
