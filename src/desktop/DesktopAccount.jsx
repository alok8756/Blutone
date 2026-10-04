import './desktop.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import MaskIcon from '../components/MaskIcon.jsx';
import LoginModal from '../components/LoginModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { CONTACTS } from '../components/ContactUs.jsx';
import { asset } from '../assets.js';
import { useAuth } from '../auth.jsx';
import { useWishlist } from '../wishlist.jsx';
import { useCart } from '../cart.jsx';
import { updateProfile, getHelp, getOrders, getMe } from '../api/client.js';
import { productPath } from '../product.js';
import { useAsync } from '../hooks/useApi.js';
import { Skeleton } from '../components/Loaders.jsx';

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const SLATE = '#3c4154';
const TABS = [
  { key: 'orders', label: 'Orders', icon: 'imgAcBasket' },
  { key: 'wishlist', label: 'Wishlist', icon: 'imgAcHeart' },
  { key: 'settings', label: 'Settings', icon: 'imgAcSettings' },
  { key: 'help', label: 'Help', icon: 'imgAcHeadphone' },
];
const ADDR_FIELDS = [
  ['houseFlat', 'House/Flat'],
  ['laneStreet', 'Lane/Street'],
  ['locality', 'Locality'],
  ['townCity', 'Town/City'],
  ['state', 'State'],
  ['pin', 'PIN'],
];

/* ---------- Settings ---------- */
function SettingsTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();

  const leave = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [addr, setAddr] = useState({ houseFlat: '', laneStreet: '', locality: '', townCity: '', state: '', pin: '' });

  useEffect(() => {
    setName(user?.name || '');
    setAddr({ houseFlat: '', laneStreet: '', locality: '', townCity: '', state: '', pin: '', ...(user?.address || {}) });
  }, [user]);

  // Deep-link from checkout / bag "Edit address": open straight into edit mode
  // (matches the mobile account page reading location.state.editProfile).
  useEffect(() => { if (location.state?.editProfile) setEditing(true); }, [location.state]);

  const field = (label, value, onChange, opts = {}) => (
    <label className={`dta-field${editing && !opts.readOnly ? ' editing' : ''}`}>
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={opts.placeholder}
        readOnly={opts.readOnly || !editing}
      />
    </label>
  );

  const fillFromUser = (u) => {
    setName(u?.name || '');
    setAddr({ houseFlat: '', laneStreet: '', locality: '', townCity: '', state: '', pin: '', ...(u?.address || {}) });
  };

  // UPDATE only acts in edit mode and never while saving (stops repeat calls).
  const canUpdate = editing && !saving;

  const toggleEdit = () => {
    if (saving) return;
    if (editing) { fillFromUser(user); setEditing(false); setError(''); } // cancel: discard unsaved edits
    else setEditing(true);
  };

  const inFlight = useRef(false); // blocks duplicate calls from rapid double clicks
  /** Persist the form. Returns true only when the profile actually saved. */
  const save = async () => {
    if (!canUpdate || inFlight.current) return false;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await updateProfile({ name, address: addr });
      const { user: fresh } = await getMe(); // reload from the profile API
      updateUser(fresh);
      setEditing(false);
      return true;
    } catch (err) {
      // Previously swallowed, so a failed save looked identical to a successful
      // one — the edits just silently reverted on the next render.
      setError(err?.message || 'Could not save your details. Please try again.');
      return false;
    } finally { inFlight.current = false; setSaving(false); }
  };

  // Leaving via "Continue Shopping" while still editing used to throw away the
  // typed details. Commit them first, and stay put if the save fails so nothing
  // is lost.
  const continueShopping = async () => {
    if (editing && !saving) {
      const ok = await save();
      if (!ok) return;
    }
    leave();
  };

  return (
    <>
      <div className="dta-head">
        <div><p className="dta-h2">Settings</p><p className="dta-sub">Manage your profile and delivery address.</p></div>
        <button className={`dta-edit${editing ? ' on' : ''}`} onClick={toggleEdit} disabled={saving}>
          {editing ? 'Editing' : 'Edit'} <MaskIcon name="imgAcEdit" size={18} color="#fefefe" />
        </button>
      </div>

      <div className="dta-form">
        {field('Name', name, setName, { placeholder: 'Enter your name' })}
        {field('Phone no', user?.phone || '', null, { readOnly: true })}
        <p className="dta-addr-title">Address</p>
        <div className="dta-row2">
          {ADDR_FIELDS.map(([k, lbl]) => (
            <label key={k} className={`dta-field${editing ? ' editing' : ''}`}>
              <span>{lbl}</span>
              <input value={addr[k]} onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))} readOnly={!editing} />
            </label>
          ))}
        </div>
        {error && <p className="dta-error">{error}</p>}
        <div className="dta-cta">
          <button className="dta-update" onClick={save} disabled={!canUpdate}>{saving ? 'Saving…' : 'UPDATE'}</button>
          <button className="dta-secondary" onClick={continueShopping} disabled={saving}>
            {saving ? 'Saving…' : 'CONTINUE SHOPPING'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Wishlist ---------- */
function WishlistTab({ onChangeAddress }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, remove } = useWishlist();
  const { addItem } = useCart();
  const a = user?.address || {};
  const line1 = [a.houseFlat, a.laneStreet, a.locality].filter(Boolean).join(', ');
  const line2 = [a.townCity, a.state].filter(Boolean).join(', ');

  const addToBag = (it) => addItem({
    id: it.id, category: it.category, title: it.title, img: it.img, color: it.color, size: it.size || 'M',
    price: Number(it.price), mrp: Number(it.mrp), qty: 1,
  });

  // Open the product page (wishlist item id === product slug).
  const openProduct = (it) => navigate(productPath(it), { state: { product: it } });

  return (
    <>
      <div className="dta-addr">
        <MaskIcon name="imgAcLocation" size={36} color={SLATE} />
        <div className="txt">
          {line1 || line2 ? (
            <>
              <p className="l">{line1}</p>
              <p className="l">{line2}</p>
            </>
          ) : <p className="l">No address saved yet</p>}
          <p className="p">{user?.phone}</p>
        </div>
        <button className="dta-change" onClick={onChangeAddress}>Change</button>
      </div>

      <p className="dta-h2" style={{ marginBottom: 20 }}>Wishlist</p>
      {items.length === 0 ? (
        <div className="dta-empty"><p style={{ fontWeight: 600, fontSize: 18, color: SLATE }}>Your wishlist is empty</p><p style={{ color: '#565656' }}>Tap the heart on a product to save it here.</p></div>
      ) : (
        <div className="dta-wishgrid">
          {items.map((it) => (
            <div key={it.wishlistId} className="dta-wcard">
              <div className="img" onClick={() => openProduct(it)} role="button" tabIndex={0} title={it.title} style={{ cursor: 'pointer' }}><img src={asset(it.img)} alt={it.title} /></div>
              <p className="t" onClick={() => openProduct(it)} style={{ cursor: 'pointer' }}>{it.title}</p>
              <p className="s">Size: {it.size || 'M'}</p>
              <div className="foot">
                <button className="dta-addbag" onClick={() => addToBag(it)}>ADD TO BAG</button>
                <button className="dta-trash" aria-label="Remove" onClick={() => remove(it.id)}>
                  <MaskIcon name="imgAcTrash" size={22} color="#565656" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Help ---------- */
function HelpTab() {
  const { data: help } = useAsync(getHelp, [], null);
  const [open, setOpen] = useState(0);
  return (
    <>
      <div className="dta-head"><div><p className="dta-h2">{help?.title || 'Help & Support'}</p><p className="dta-sub">{help?.subtitle || ''}</p></div></div>
      <div className="dta-contacts">
        {CONTACTS.map((c) => (
          <a
            key={c.key}
            className="dta-contact"
            href={c.href}
            {...(c.key === 'whatsapp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            aria-label={`${c.key}: ${c.text}`}
            style={{ textDecoration: 'none' }}
          >
            <MaskIcon name={c.icon} size={24} color={SLATE} />{c.text}
          </a>
        ))}
      </div>
      <p className="dta-faqh">FAQs</p>
      {!help && Array.from({ length: 4 }).map((_, i) => <Skeleton key={'fs' + i} w="100%" h={44} r={8} />)}
      {(help?.faqs || []).map((f, i) => (
        <div key={i} className="dta-faq">
          <button onClick={() => setOpen(open === i ? -1 : i)}>{f.q}<span style={{ color: SLATE, fontSize: 20 }}>{open === i ? '−' : '+'}</span></button>
          {open === i && <p>{f.a}</p>}
        </div>
      ))}
    </>
  );
}

/* ---------- Orders ---------- */
function OrderItemRow({ it, onOpen }) {
  const clickable = !!onOpen && !!it.slug;
  return (
    <div
      className="dta-order-item"
      onClick={clickable ? onOpen : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? `View ${it.name}` : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
    >
      <div className="thumb">{it.image && <img src={asset(it.image)} alt="" />}</div>
      <div className="meta">
        <p className="n">{it.name}</p>
        <p className="s">Size {it.size || '—'} · Qty {it.qty}</p>
      </div>
      <span className="p">{inr(it.price * it.qty)}</span>
    </div>
  );
}

function OrdersTab() {
  const navigate = useNavigate();
  const { data: orders, loading } = useAsync(getOrders, [], []);

  // Opening an order goes to the dedicated tracking page so the customer sees
  // the live order status / timeline.
  const openOrder = (id) => navigate(`/order/${id}`);

  // First load: skeleton order cards instead of a blank / empty flash.
  if (loading && (!orders || orders.length === 0)) {
    return (
      <>
        <p className="dta-h2" style={{ marginBottom: 20 }}>Orders</p>
        <div className="dta-orders">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} w="100%" h={150} r={12} />)}
        </div>
      </>
    );
  }

  if (!loading && (!orders || orders.length === 0)) {
    return (
      <div className="dta-empty">
        <p style={{ fontWeight: 600, fontSize: 20, color: SLATE }}>No orders yet</p>
        <p style={{ color: '#565656' }}>Your placed orders will appear here.</p>
        <button className="dta-update" style={{ marginTop: 12 }} onClick={() => navigate('/')}>CONTINUE SHOPPING</button>
      </div>
    );
  }

  return (
    <>
      <p className="dta-h2" style={{ marginBottom: 20 }}>Orders</p>
      <div className="dta-orders">
        {(orders || []).map((o) => (
          <button key={o.id} className="dta-order dta-order-btn" onClick={() => openOrder(o.id)}>
            <div className="dta-order-head">
              <div>
                <p className="ref">Order #{o.ref}</p>
                <p className="date">{fmtDate(o.placedAt)}</p>
              </div>
              <span className="dta-badge">{o.status}</span>
            </div>
            <div className="dta-order-items">
              {o.items.map((it, i) => <OrderItemRow key={i} it={it} />)}
            </div>
            <div className="dta-order-foot"><span>Total</span><span className="amt">{inr(o.amount?.grandTotal)}</span></div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------- page ---------- */
export default function DesktopAccount() {
  const navigate = useNavigate();
  const { ready, isAuthenticated, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'settings';
  const setTab = (t) => setParams({ tab: t }, { replace: true });

  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  useEffect(() => { if (ready && !isAuthenticated) setLoginOpen(true); }, [ready, isAuthenticated]);

  return (
    <div className="dt">
      <DesktopHeader />
      <div className="dt-wrap">
        <div className="dtb-titlerow">
          <h1 className="dtb-title">Your Account</h1>
          {ready && isAuthenticated && (
            <button className="dta-logout" onClick={() => setConfirmLogout(true)}>Log out</button>
          )}
        </div>

        {ready && !isAuthenticated ? (
          <div className="dta-empty" style={{ padding: '100px 0 140px' }}>
            <p style={{ fontWeight: 600, fontSize: 22, color: SLATE }}>Log in to view your account</p>
            <button className="dta-update" style={{ marginTop: 16 }} onClick={() => setLoginOpen(true)}>LOG IN</button>
          </div>
        ) : (
          <div className="dta-layout">
            <aside className="dta-side">
              {TABS.map((t) => (
                <button key={t.key} className={`dta-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                  <MaskIcon name={t.icon} size={24} color={tab === t.key ? '#fefefe' : SLATE} />
                  {t.label}
                </button>
              ))}
            </aside>
            <section className="dta-content">
              {tab === 'settings' && <SettingsTab />}
              {tab === 'wishlist' && <WishlistTab onChangeAddress={() => navigate('/account?tab=settings', { state: { editProfile: true } })} />}
              {tab === 'help' && <HelpTab />}
              {tab === 'orders' && <OrdersTab />}
            </section>
          </div>
        )}
      </div>
      <DesktopFooter />

      <LoginModal
        open={loginOpen}
        onClose={() => { setLoginOpen(false); if (!isAuthenticated) navigate('/'); }}
        onSuccess={() => setTab('settings')}
      />
      <ConfirmModal
        open={confirmLogout}
        title="Log out?"
        message="Are you sure you want to log out?"
        confirmLabel="Yes"
        cancelLabel="No"
        destructive
        onConfirm={() => { setConfirmLogout(false); logout(); navigate('/'); }}
        onClose={() => setConfirmLogout(false)}
      />
    </div>
  );
}
