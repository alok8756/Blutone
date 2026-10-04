import { useRef, useState, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Frame from './components/Frame.jsx';
import Icon from './components/Icon.jsx';
import { basset } from './bag/basset.js';
import { asset } from './assets.js';
import { F } from './tokens.js';
import { deliveryByLabel } from './deliveryDate.js';
import { productPath } from './product.js';
import { useCart } from './cart.jsx';
import { trackInitiateCheckout } from './lib/metaPixel.js';
import { useAuth } from './auth.jsx';
import LoginModal from './components/LoginModal.jsx';

const abs = (s) => ({ position: 'absolute', ...s });
const BI = (name, size, inset) => <Icon src={basset(name)} size={size} inset={inset} />;

const GRAY = '#d9d9d9';
const GRAY565 = '#565656';
const CONTENT_TOP = 210;
const rs = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN');

function QtyBtn({ icon, onClick }) {
  return (
    <button onClick={onClick} style={{ position: 'relative', width: 22, height: 22, flexShrink: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
      <div style={{ position: 'absolute', inset: 0, background: GRAY, border: `0.5px solid ${GRAY565}` }} />
      <div style={{ position: 'absolute', left: 1, top: 1, width: 20, height: 20 }}>{icon}</div>
    </button>
  );
}

function CartItem({ item, onInc, onDec, onRemove, onOpen }) {
  return (
    <div style={{ width: 353, background: '#f3f3f3', borderRadius: 10, padding: '14px 12px 12px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div onClick={onOpen} role="button" aria-label={`Open ${item.title}`} style={{ width: 114, height: 167, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid #e0e0e0', cursor: 'pointer' }}>
          <img src={asset(item.img)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
          <p onClick={onOpen} style={{ ...F.m600, fontSize: 18, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', cursor: 'pointer' }}>
            {item.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {BI('imgVector', 20, ['14%', '25.67%', '16%', '23.67%'])}
            <p style={{ ...F.m600, fontSize: 18, color: '#000', whiteSpace: 'nowrap' }}>{item.price}</p>
          </div>
          <p style={{ ...F.m500, fontSize: 16, color: '#000', whiteSpace: 'nowrap' }}>Color: {item.color}</p>
          <p style={{ ...F.m500, fontSize: 16, color: '#000', whiteSpace: 'nowrap' }}>Size:&nbsp; {item.size}</p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <p style={{ ...F.m500, fontSize: 16, color: '#000', whiteSpace: 'nowrap' }}>Qty:</p>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <QtyBtn onClick={onDec} icon={<div style={{ position: 'absolute', top: '50%', left: '26.04%', right: '26.04%', height: 2, marginTop: -1, background: '#000D26', borderRadius: 1 }} />} />
              <p style={{ ...F.m500, fontSize: 18, color: '#000', whiteSpace: 'nowrap', minWidth: 14, textAlign: 'center' }}>{item.qty}</p>
              <QtyBtn onClick={onInc} icon={<div style={{ position: 'absolute', inset: '26.04%' }}><img src={basset('imgVector2')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', display: 'block' }} /></div>} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', marginTop: 12 }}>
        <p style={{ ...F.m400, fontSize: 16, color: '#000' }}>Delivery by {deliveryByLabel()}</p>
        <button onClick={onRemove} aria-label="Remove" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          {BI('imgIcon1', 24, ['9.38%', '17.71%', '6.28%', '17.71%'])}
        </button>
      </div>
    </div>
  );
}

export default function BagPage() {
  const navigate = useNavigate();
  const { items, setQty, removeItem, totalMrp, shipping, total } = useCart();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  // Checkout is gated behind login: proceed if signed in, otherwise open the
  // login modal and continue automatically once the user verifies.
  const proceedToCheckout = () => {
    trackInitiateCheckout(items, total);
    navigate('/checkout');
  };
  const handleCheckout = () => {
    if (isAuthenticated) proceedToCheckout();
    else setLoginOpen(true);
  };

  const bodyRef = useRef(null);
  const [frameH, setFrameH] = useState(900);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setFrameH(CONTENT_TOP + el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const empty = items.length === 0;

  return (
    <>
    <Frame height={frameH} cropTop={64}>
      <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />

      {/* Title */}
      <div style={abs({ left: 20, top: 80, display: 'flex', gap: 12, alignItems: 'center' })}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          {BI('imgIcon', 32, ['30.21%', '40.63%', '30.21%', '36.46%'])}
        </button>
        <p style={{ ...F.m600, fontSize: 20, color: '#000', width: 309 }}>Shopping Bag</p>
      </div>

      {/* Divider under title */}
      <div style={abs({ left: 20, top: 128, width: 353, height: 1 })}>
        <img src={basset('imgLine12')} alt="" style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }} />
      </div>

      {/* Stepper graphic + labels */}
      <div style={abs({ left: 75, top: 144, width: 243, height: 20 })}>
        <img src={basset('imgGroup10')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', display: 'block' }} />
      </div>
      <p style={abs({ left: 66, top: 168, ...F.m500, fontSize: 17, color: '#000', whiteSpace: 'nowrap' })}>Cart</p>
      <p style={abs({ left: 'calc(40% - 2.2px)', top: 168, ...F.m500, fontSize: 17, color: '#000', whiteSpace: 'nowrap' })}>Checkout</p>
      <p style={abs({ left: 'calc(60% + 32.2px)', top: 168, ...F.m500, fontSize: 17, color: '#000', whiteSpace: 'nowrap' })}>Payment</p>

      {/* Body (flow; measured to size the canvas) */}
      <div ref={bodyRef} style={abs({ left: 0, top: CONTENT_TOP, width: 393, display: 'flex', flexDirection: 'column' })}>
        {empty ? (
          <div style={{ padding: '60px 20px 80px', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', textAlign: 'center' }}>
            <p style={{ ...F.m600, fontSize: 20, color: '#000' }}>Your bag is empty</p>
            <p style={{ ...F.m400, fontSize: 16, color: GRAY565 }}>Add products to your bag to see them here.</p>
            <button onClick={() => navigate('/')} style={{ border: 'none', borderRadius: 10, background: '#3c4154', color: '#fff', ...F.m600, fontSize: 17, padding: '14px 28px', cursor: 'pointer' }}>
              CONTINUE SHOPPING
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 17 }}>
              {items.map((it) => (
                <CartItem
                  key={it.key}
                  item={it}
                  onInc={() => setQty(it.key, it.qty + 1)}
                  onDec={() => setQty(it.key, it.qty - 1)}
                  onRemove={() => removeItem(it.key)}
                  onOpen={() => navigate(productPath(it), { state: { product: { id: it.id, title: it.title, img: it.img, color: it.color, price: it.price, mrp: it.mrp } } })}
                />
              ))}
            </div>

            {/* Price Details */}
            <div style={{ marginTop: 34, marginLeft: 20, width: 353, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ ...F.m600, fontSize: 19, color: '#000', width: '100%' }}>Price Details</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%' }}>
                <div style={{ width: '100%', height: 1 }}><img src={basset('imgLine13')} alt="" style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', ...F.m500, fontSize: 19, color: '#000', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <p>Total MRP</p><p>{rs(totalMrp)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <p>Shipping</p><p>{rs(shipping)}</p>
                  </div>
                </div>
                <div style={{ width: '100%', height: 1 }}><img src={basset('imgLine13')} alt="" style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 19, color: '#000', whiteSpace: 'nowrap' }}>
                <p style={F.m500}>Total Amount</p>
                <p style={F.m600}>{rs(total)}</p>
              </div>
            </div>

            {/* Checkout bar — gated behind login */}
            <div onClick={handleCheckout} role="button" tabIndex={0} style={{ marginTop: 30, width: 393, background: '#3c4154', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 30px', boxSizing: 'border-box', cursor: 'pointer' }}>
              <p style={{ ...F.m600, fontSize: 19, color: '#fefefe', whiteSpace: 'nowrap' }}>CHECKOUT</p>
            </div>
          </>
        )}
      </div>
    </Frame>
    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={proceedToCheckout} />
    </>
  );
}
