import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Frame from './components/Frame.jsx';
import MaskIcon from './components/MaskIcon.jsx';
import LoginModal from './components/LoginModal.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';
import { CONTACTS } from './components/ContactUs.jsx';
import { C, F } from './tokens.js';
import { asset } from './assets.js';
import { useAuth } from './auth.jsx';
import { useWishlist } from './wishlist.jsx';
import { useCart } from './cart.jsx';
import { updateProfile, getHelp, getOrders, getMe } from './api/client.js';
import { productPath } from './product.js';
import { useAsync } from './hooks/useApi.js';
import { Skeleton } from './components/Loaders.jsx';

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const abs = (s) => ({ position: 'absolute', ...s });
const SLATE = C.slate;            // #3c4154
const GREEN = '#8ad80d';          // edit-mode accent (exact Figma)
const PLACEHOLDER = '#b3b3b3';    // input placeholder (exact Figma)
const PAGE_BG = '#f4f4f4';        // account page bg (exact Figma)
const HAIR = '#565656';

const TABS = [
  { key: 'orders', label: 'Orders', icon: 'imgAcBasket' },
  { key: 'wishlist', label: 'Wishlist', icon: 'imgAcHeart' },
  { key: 'settings', label: 'Settings', icon: 'imgAcSettings' },
  { key: 'help', label: 'Help', icon: 'imgAcHeadphone' },
];

/* ---------- tabs ---------- */
function TabBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ border: `1px solid ${SLATE}`, borderRadius: 8, padding: '11px 14px', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', background: active ? SLATE : 'transparent', cursor: 'pointer' }}
    >
      <MaskIcon name={icon} size={24} color={active ? '#fefefe' : SLATE} />
      <span style={{ ...F.m500, fontSize: 17, color: active ? '#fefefe' : SLATE, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function Tabs({ tab, setTab }) {
  const btn = (k) => {
    const t = TABS.find((x) => x.key === k);
    return <TabBtn icon={t.icon} label={t.label} active={tab === k} onClick={() => setTab(k)} />;
  };
  return (
    <div style={{ width: 293, display: 'flex', flexDirection: 'column', gap: 21 }}>
      <div style={{ display: 'flex', gap: 49, alignItems: 'center' }}>{btn('orders')}{btn('wishlist')}</div>
      <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>{btn('settings')}{btn('help')}</div>
    </div>
  );
}

/* ---------- settings (profile) ---------- */
function Field({ label, value, onChange, placeholder, editable, readOnly, labelSize = 19, onActivate }) {
  const accent = editable ? GREEN : SLATE;
  // There is no separate Edit button: tapping any non-locked field switches the
  // whole profile into edit mode. The permanently readOnly field (phone) never
  // activates. `onFocus` also covers keyboard (tab) focus.
  const activate = readOnly ? undefined : onActivate;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <p style={{ ...F.m500, fontSize: labelSize, color: SLATE, width: '100%' }}>{label}</p>
      <div
        onClick={activate}
        style={{ border: `1px solid ${readOnly ? SLATE : accent}`, borderRadius: 10, padding: '10px 20px', width: '100%', boxSizing: 'border-box', background: readOnly ? '#fafafa' : '#fff', cursor: !readOnly && !editable ? 'text' : 'default' }}
      >
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={activate}
          placeholder={placeholder}
          readOnly={readOnly || !editable}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', padding: 0, ...F.m400, fontSize: 19, color: readOnly ? C.dark : '#000' }}
        />
      </div>
    </div>
  );
}

const ADDR_FIELDS = [
  ['houseFlat', 'House/Flat'],
  ['laneStreet', 'Lane/Street'],
  ['locality', 'Locality'],
  ['townCity', 'Town/City'],
  ['state', 'State'],
  ['pin', 'PIN'],
];

function SettingsTab({ user, onSaved }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUser } = useAuth();

  // Return to the page the user came from (e.g. opened Settings from checkout to
  // add an address) instead of always Home. Falls back to Home only on a direct
  // visit (location.key === 'default' → no history to go back to).
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));
  // Opened from checkout's "Edit address" (navigate with { editProfile: true }) →
  // start directly in edit mode so the user can type without an extra tap.
  const [editing, setEditing] = useState(!!location.state?.editProfile);
  const [name, setName] = useState('');
  const [addr, setAddr] = useState({ houseFlat: '', laneStreet: '', locality: '', townCity: '', state: '', pin: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Seed from the server user whenever it changes (and when leaving edit mode).
  useEffect(() => {
    setName(user?.name || '');
    setAddr({ houseFlat: '', laneStreet: '', locality: '', townCity: '', state: '', pin: '', ...(user?.address || {}) });
  }, [user]);

  const setField = (k, v) => setAddr((a) => ({ ...a, [k]: v }));

  // UPDATE is only actionable in edit mode and never while a save is in flight —
  // this prevents repeated API calls from extra clicks.
  const canUpdate = editing && !saving;

  // Tapping/focusing any editable field switches the profile into edit mode.
  // Once on, edit mode STAYS on (tapping outside the fields keeps it on and
  // keeps typed values) until UPDATE is pressed — see save(), which is the only
  // thing that saves to the DB and then turns edit mode off.
  const startEdit = () => { if (!saving) setEditing(true); };

  // Synchronous re-entrancy guard: blocks duplicate calls from rapid double
  // clicks that fire before React re-renders the disabled button.
  const inFlight = useRef(false);
  /** Persist the form. Returns true only when the profile actually saved. */
  const save = async () => {
    if (!canUpdate || inFlight.current) return false;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await updateProfile({ name, address: addr });
      const { user: fresh } = await getMe(); // reload from the profile API
      updateUser(fresh);                     // refills the form via the user effect
      setEditing(false);                     // back to read-only view; disables UPDATE
      onSaved?.();
      return true;
    } catch (err) {
      // Was swallowed, which made a failed save look exactly like a successful
      // one — the typed values just reverted on the next render.
      setError(err?.message || 'Could not save your details. Please try again.');
      return false;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  // Both buttons commit the profile and then return to the previous page. They
  // differ only in what they do when there is nothing to save: UPDATE is inert
  // outside edit mode, CONTINUE SHOPPING still leaves. A failed save keeps the
  // user here with the error shown, so nothing typed is lost.
  const saveThenBack = async () => {
    if (await save()) goBack();
  };
  const continueShopping = async () => {
    if (editing && !saving) return saveThenBack();
    goBack();
  };

  return (
    <div style={{ position: 'relative', background: '#fff', width: '100%', paddingBottom: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 35, padding: '28px 22px 0', width: '100%', boxSizing: 'border-box' }}>
        <Field label="Name" value={name} onChange={setName} placeholder="Enter your name" editable={editing} onActivate={startEdit} />
        <Field label="Phone no" value={user?.phone || ''} readOnly />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
          <p style={{ ...F.m600, fontSize: 19, color: SLATE }}>Address</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 17, width: '100%' }}>
            {ADDR_FIELDS.map(([k, lbl]) => (
              <Field key={k} label={lbl} labelSize={17} value={addr[k]} onChange={(v) => setField(k, v)} editable={editing} onActivate={startEdit} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginTop: 40 }}>
        {/* Only rendered on a failed save, so the normal layout is unchanged. */}
        {error && (
          <p style={{ ...F.m500, fontSize: 15, color: C.pink, width: 299, textAlign: 'center', margin: 0 }}>{error}</p>
        )}
        <button onClick={saveThenBack} disabled={!canUpdate} style={{ width: 299, background: canUpdate ? SLATE : '#cdcdcd', borderRadius: 10, border: 'none', padding: '12px 10px', cursor: canUpdate ? 'pointer' : 'default' }}>
          <span style={{ ...F.m500, fontSize: 19, color: canUpdate ? '#fff' : '#f4f4f4' }}>{saving ? 'Saving…' : 'UPDATE'}</span>
        </button>
        <button onClick={continueShopping} disabled={saving} style={{ width: 299, background: '#fff', border: `1px solid ${SLATE}`, borderRadius: 10, padding: '12px 10px', cursor: saving ? 'default' : 'pointer' }}>
          <span style={{ ...F.m500, fontSize: 19, color: SLATE }}>{saving ? 'Saving…' : 'CONTINUE SHOPPING'}</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- wishlist ---------- */
function AddressPill({ user, onChange }) {
  const a = user?.address || {};
  const line1 = [a.houseFlat, a.laneStreet, a.locality].filter(Boolean).join(', ');
  const line2 = [a.townCity, a.state].filter(Boolean).join(', ');
  const hasAddr = line1 || line2;
  return (
    <div style={{ position: 'relative', background: '#fff', border: `0.5px solid ${HAIR}`, borderRadius: 10, minHeight: 121, margin: '0 20px', padding: '18px 12px' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <MaskIcon name="imgAcLocation" size={36} color={SLATE} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasAddr ? (
            <>
              <p style={{ ...F.m400, fontSize: 16, color: SLATE, lineHeight: '20px' }}>{line1}</p>
              <p style={{ ...F.m400, fontSize: 16, color: SLATE, lineHeight: '20px' }}>{line2}</p>
            </>
          ) : (
            <p style={{ ...F.m400, fontSize: 16, color: SLATE, lineHeight: '20px' }}>No address saved yet</p>
          )}
          <p style={{ ...F.m400, fontSize: 16, color: HAIR, marginTop: 8 }}>{user?.phone}</p>
        </div>
        <button onClick={onChange} style={{ alignSelf: 'flex-start', background: SLATE, borderRadius: 8, border: 'none', padding: '8px 10px', cursor: 'pointer' }}>
          <span style={{ ...F.m500, fontSize: 14, color: '#fefefe' }}>Change</span>
        </button>
      </div>
    </div>
  );
}

function WishlistCard({ item, onOpen, onAddToBag, onRemove }) {
  return (
    <div style={{ width: 149, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div onClick={onOpen} role="button" tabIndex={0} title={item.title} style={{ height: 174, borderRadius: 12, border: `0.5px solid ${HAIR}`, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
        <img src={asset(item.img)} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p onClick={onOpen} style={{ ...F.m500, fontSize: 15, color: SLATE, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', cursor: 'pointer' }}>{item.title}</p>
          <p style={{ ...F.m500, fontSize: 17, color: '#000' }}>Size: {item.size || 'M'}</p>
        </div>
        <button onClick={onAddToBag} style={{ alignSelf: 'flex-start', border: `0.5px solid ${HAIR}`, borderRadius: 6, padding: '6px 10px', background: '#fff', cursor: 'pointer' }}>
          <span style={{ ...F.m500, fontSize: 13, color: '#000' }}>ADD TO BAG</span>
        </button>
        <button onClick={onRemove} aria-label="Remove" style={{ position: 'absolute', right: 0, bottom: 4, width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
          <MaskIcon name="imgAcTrash" size={22} color={HAIR} />
        </button>
      </div>
    </div>
  );
}

function WishlistGrid() {
  const navigate = useNavigate();
  const { items, remove } = useWishlist();
  const { addItem } = useCart();

  const addToBag = (it) => addItem({
    id: it.id, category: it.category, title: it.title, img: it.img, color: it.color, size: it.size || 'M',
    price: Number(it.price), mrp: Number(it.mrp), qty: 1,
  });

  // Open the product page for a wishlist item (id === product slug). Passing the
  // card fields gives instant header content while the full PDP loads by slug.
  const openProduct = (it) => navigate(productPath(it), { state: { product: it } });

  return (
    <div style={{ background: '#fff', width: '100%', padding: '28px 30px 40px', boxSizing: 'border-box' }}>
      {items.length === 0 ? (
        <p style={{ ...F.m500, fontSize: 16, color: HAIR, textAlign: 'center', padding: '40px 0' }}>Your wishlist is empty.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '149px 149px', justifyContent: 'space-between', rowGap: 35 }}>
          {items.map((it) => (
            <WishlistCard key={it.wishlistId} item={it} onOpen={() => openProduct(it)} onAddToBag={() => addToBag(it)} onRemove={() => remove(it.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- help ---------- */
function HelpTab() {
  const { data: help } = useAsync(getHelp, [], null);
  const [open, setOpen] = useState(0);
  return (
    <div style={{ background: '#fff', width: '100%', padding: '28px 22px 48px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ ...F.m600, fontSize: 22, color: SLATE }}>{help?.title || 'Help & Support'}</p>
        <p style={{ ...F.m400, fontSize: 15, color: HAIR }}>{help?.subtitle || ''}</p>
      </div>

      {/* Contact channels reuse the shared ContactUs source of truth (same values
          as the home/PDP footer) and the same tap behaviour: email → mailto,
          call → tel, whatsapp → wa.me. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CONTACTS.map((c) => (
          <a
            key={c.key}
            href={c.href}
            {...(c.key === 'whatsapp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            aria-label={`${c.key}: ${c.text}`}
            style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none' }}
          >
            <MaskIcon name={c.icon} size={24} color={SLATE} />
            <span style={{ ...F.m500, fontSize: 17, color: '#000' }}>{c.text}</span>
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ ...F.m600, fontSize: 19, color: SLATE }}>FAQs</p>
        {!help && Array.from({ length: 4 }).map((_, i) => <Skeleton key={'fs' + i} w="100%" h={44} r={8} />)}
        {(help?.faqs || []).map((f, i) => (
          <div key={i} style={{ borderBottom: `0.5px solid ${HAIR}`, paddingBottom: 12 }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ ...F.m500, fontSize: 16, color: '#000' }}>{f.q}</span>
              <span style={{ ...F.m500, fontSize: 18, color: SLATE }}>{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p style={{ ...F.m400, fontSize: 15, color: HAIR, marginTop: 8, lineHeight: '21px' }}>{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- orders ---------- */
function OrderItemRow({ it, onOpen }) {
  // Clickable only when the line can resolve to a product page (onOpen + slug).
  const clickable = !!onOpen && !!it.slug;
  return (
    <div
      onClick={clickable ? onOpen : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? `View ${it.name}` : undefined}
      style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: clickable ? 'pointer' : 'default' }}
    >
      <div style={{ width: 44, height: 56, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '0.5px solid #e0e0e0' }}>
        {it.image && <img src={asset(it.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...F.m500, fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</p>
        <p style={{ ...F.m400, fontSize: 12, color: HAIR, marginTop: 2 }}>Size {it.size || '—'} · Qty {it.qty}</p>
      </div>
      <p style={{ ...F.m500, fontSize: 14, color: '#000' }}>{inr(it.price * it.qty)}</p>
    </div>
  );
}

const StatusBadge = ({ status }) => (
  <span style={{ ...F.m600, fontSize: 12, color: '#2e7d32', background: 'rgba(138,216,13,0.18)', borderRadius: 20, padding: '5px 12px', textTransform: 'capitalize' }}>{status}</span>
);

function OrderCard({ order, onOpen }) {
  return (
    <div onClick={onOpen} role="button" tabIndex={0} style={{ border: `1px solid #ececec`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div>
          <p style={{ ...F.m600, fontSize: 15, color: SLATE }}>Order #{order.ref}</p>
          <p style={{ ...F.m400, fontSize: 13, color: HAIR, marginTop: 2 }}>{fmtDate(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {order.items.map((it, i) => <OrderItemRow key={i} it={it} />)}
      </div>
      <div style={{ height: 1, background: '#ececec' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...F.m500, fontSize: 14, color: HAIR }}>Total</span>
        <span style={{ ...F.m600, fontSize: 16, color: '#000' }}>{inr(order.amount?.grandTotal)}</span>
      </div>
      <p style={{ ...F.m500, fontSize: 13, color: SLATE, textAlign: 'right' }}>View details ›</p>
    </div>
  );
}

function OrdersTab() {
  const navigate = useNavigate();
  const { data: orders, loading } = useAsync(getOrders, [], []);

  // Opening an order goes to the dedicated tracking page (Figma 255:2696) so the
  // customer sees the live order status / timeline, address, price and the
  // cancellation entry point.
  const openOrder = (id) => navigate(`/order/${id}`);

  // First load: skeleton order cards so the tab doesn't flash the empty state.
  if (loading && (!orders || orders.length === 0)) {
    return (
      <div style={{ background: '#fff', width: '100%', padding: '24px 20px 40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} w="100%" h={124} r={12} />)}
      </div>
    );
  }

  if (!loading && (!orders || orders.length === 0)) {
    return (
      <div style={{ background: '#fff', width: '100%', padding: '60px 22px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
        <p style={{ ...F.m600, fontSize: 20, color: SLATE }}>No orders yet</p>
        <p style={{ ...F.m400, fontSize: 16, color: HAIR }}>Your placed orders will appear here.</p>
        <button onClick={() => navigate('/')} style={{ border: 'none', borderRadius: 10, background: SLATE, color: '#fff', ...F.m600, fontSize: 17, padding: '12px 26px', cursor: 'pointer' }}>
          CONTINUE SHOPPING
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', width: '100%', padding: '24px 20px 40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(orders || []).map((o) => <OrderCard key={o.id} order={o} onOpen={() => openOrder(o.id)} />)}
    </div>
  );
}

/* ---------- page ---------- */
export default function AccountPage() {
  const navigate = useNavigate();
  const { user, ready, isAuthenticated, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'settings';
  const setTab = (t) => setParams({ tab: t }, { replace: true });

  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  useEffect(() => {
    if (ready && !isAuthenticated) setLoginOpen(true);
  }, [ready, isAuthenticated]);

  const bodyRef = useRef(null);
  const [frameH, setFrameH] = useState(1509);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setFrameH(114 + el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab, user, isAuthenticated]);

  const loggedIn = isAuthenticated;

  return (
    <>
      <Frame height={frameH} cropTop={50}>
        <div style={{ position: 'absolute', inset: 0, background: PAGE_BG }} />

        {/* Header */}
        <div style={abs({ left: 20, top: 66, display: 'flex', gap: 12, alignItems: 'center' })}>
          <button onClick={() => navigate('/')} aria-label="Back" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
            <MaskIcon name="imgAcCaretLeft" size={32} color={SLATE} />
          </button>
          <p style={{ ...F.m600, fontSize: 20, color: SLATE }}>YOUR ACCOUNT</p>
        </div>
        <button
          onClick={() => { if (loggedIn) setConfirmLogout(true); else setLoginOpen(true); }}
          style={abs({ left: 320, top: 66, width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', padding: 0 })}
        >
          <MaskIcon name={loggedIn ? 'imgAcSmile' : 'imgIcon'} size={24} color="#000" />
          <span style={{ ...F.m500, fontSize: 12, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {loggedIn ? (user?.name?.trim().split(' ')[0] || 'Account') : 'Log in'}
          </span>
        </button>

        {/* Divider */}
        <div style={abs({ left: 20, top: 114, width: 353, height: 1, background: HAIR, opacity: 0.5 })} />

        {/* Body (flow; measured to size the canvas) */}
        <div ref={bodyRef} style={abs({ left: 0, top: 114, width: 393, display: 'flex', flexDirection: 'column' })}>
          {/* Wishlist shows the saved-address pill ABOVE the tabs (per Figma) */}
          {tab === 'wishlist' && (
            <div style={{ marginTop: 20 }}>
              <AddressPill user={user} onChange={() => setTab('settings')} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: tab === 'wishlist' ? 20 : 40, marginBottom: 28 }}>
            <Tabs tab={tab} setTab={setTab} />
          </div>
          {tab === 'settings' && <SettingsTab user={user} />}
          {tab === 'wishlist' && <WishlistGrid />}
          {tab === 'help' && <HelpTab />}
          {tab === 'orders' && <OrdersTab />}
        </div>
      </Frame>

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
    </>
  );
}
