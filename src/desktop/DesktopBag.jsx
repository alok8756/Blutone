import './desktop.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import { basset } from '../bag/basset.js';
import { asset } from '../assets.js';
import { deliveryByLabel } from '../deliveryDate.js';
import { productPath } from '../product.js';
import { useCart } from '../cart.jsx';
import { trackInitiateCheckout } from '../lib/metaPixel.js';
import { useAuth } from '../auth.jsx';
import LoginModal from '../components/LoginModal.jsx';

const BI = (name, size, inset) => <Icon src={basset(name)} size={size} inset={inset} />;
const rs = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN');

function Qty({ qty, onInc, onDec }) {
  return (
    <div className="qty">
      <span style={{ fontWeight: 500, fontSize: 18 }}>Qty:</span>
      <button className="dtb-qbtn" aria-label="Decrease" onClick={onDec}>
        <div style={{ position: 'absolute', top: '50%', left: '26.04%', right: '26.04%', height: 2, marginTop: -1, background: '#000D26', borderRadius: 1 }} />
      </button>
      <span style={{ fontWeight: 500, fontSize: 18, minWidth: 16, textAlign: 'center' }}>{qty}</span>
      <button className="dtb-qbtn" aria-label="Increase" onClick={onInc}>
        <div style={{ position: 'absolute', inset: '26.04%' }}>
          <img src={basset('imgVector2')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none' }} />
        </div>
      </button>
    </div>
  );
}

function Card({ item, onInc, onDec, onRemove, onOpen }) {
  return (
    <div className="dtb-card">
      <div className="row">
        <div className="img" onClick={onOpen} role="button" aria-label={`Open ${item.title}`} style={{ overflow: 'hidden', border: '1px solid #e0e0e0', cursor: 'pointer' }}>
          <img src={asset(item.img)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div className="info">
          <p className="name" onClick={onOpen} style={{ cursor: 'pointer' }}>{item.title}</p>
          <div className="price">
            {BI('imgVector', 20, ['14%', '25.67%', '16%', '23.67%'])}
            <b>{item.price}</b>
          </div>
          <p className="meta">Color:&nbsp; {item.color}</p>
          <p className="meta">Size:&nbsp; {item.size}</p>
          <Qty qty={item.qty} onInc={onInc} onDec={onDec} />
        </div>
      </div>
      <div className="foot">
        <span className="del">Delivery by {deliveryByLabel()}</span>
        <button onClick={onRemove} aria-label="Remove" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          {BI('imgIcon1', 24, ['9.38%', '17.71%', '6.28%', '17.71%'])}
        </button>
      </div>
    </div>
  );
}

export default function DesktopBag() {
  const navigate = useNavigate();
  const { items, setQty, removeItem, totalMrp, shipping, total } = useCart();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const empty = items.length === 0;

  // Checkout is gated behind login (same as mobile BagPage).
  const proceedToCheckout = () => {
    trackInitiateCheckout(items, total);
    navigate('/checkout');
  };
  const handleCheckout = () => {
    if (isAuthenticated) proceedToCheckout();
    else setLoginOpen(true);
  };

  return (
    <div className="dt">
      <DesktopHeader />

      <div className="dt-wrap">
        <div className="dtb-titlerow">
          <button className="dtp-back" style={{ padding: 0 }} onClick={() => navigate(-1)} aria-label="Back">
            {BI('imgIcon', 30, ['30.21%', '40.63%', '30.21%', '36.46%'])}
          </button>
          <h1 className="dtb-title">Shopping Bag</h1>
        </div>

        <div className="dtb-steps">
          <div className="dtb-node active"><span className="dot" /><b>Cart</b></div>
          <span className="dtb-conn" />
          <div className="dtb-node"><span className="dot" /><b>Checkout</b></div>
          <span className="dtb-conn" />
          <div className="dtb-node"><span className="dot" /><b>Payment</b></div>
        </div>

        {empty ? (
          <div style={{ padding: '80px 0 120px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: 22 }}>Your bag is empty</p>
            <p style={{ fontWeight: 400, fontSize: 16, color: '#565656' }}>Add products to your bag to see them here.</p>
            <button onClick={() => navigate('/')} style={{ border: 'none', borderRadius: 10, background: '#3c4154', color: '#fff', fontWeight: 600, fontSize: 16, padding: '14px 32px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              CONTINUE SHOPPING
            </button>
          </div>
        ) : (
          <div className="dtb-main">
            <div className="dtb-items">
              {items.map((it) => (
                <Card
                  key={it.key}
                  item={it}
                  onInc={() => setQty(it.key, it.qty + 1)}
                  onDec={() => setQty(it.key, it.qty - 1)}
                  onRemove={() => removeItem(it.key)}
                  onOpen={() => navigate(productPath(it), { state: { product: { id: it.id, title: it.title, img: it.img, color: it.color, price: it.price, mrp: it.mrp } } })}
                />
              ))}
            </div>

            <div className="dtb-side">
              <div className="dtb-summary">
                <h3>Price Details</h3>
                <hr />
                <div className="dtb-srow"><span>Total MRP</span><span>{rs(totalMrp)}</span></div>
                <div className="dtb-srow"><span>Shipping</span><span>{rs(shipping)}</span></div>
                <hr />
                <div className="dtb-total"><span className="lbl">Total Amount</span><span className="amt">{rs(total)}</span></div>
                <button className="dtb-checkout" onClick={handleCheckout}>
                  CHECKOUT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DesktopFooter />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={proceedToCheckout} />
    </div>
  );
}
