import { useNavigate } from 'react-router-dom';
import './desktopHome.css';
import { asset } from '../assets.js';
import Icon from '../components/Icon.jsx';
import { CONTACTS } from '../components/ContactUs.jsx';

// Shared bottom-of-page block for every desktop screen: the SHOP quick-links
// band + the footer (Figma 690:5926 + 1062:8610).
// Each quick-link maps to a real catalogue category slug so clicking fetches that
// category (like the navbar mega-menu) instead of an unreliable text search — the
// display label can differ from the DB label (e.g. "Chudidar" → chuddidar-leggings).
const SHOP_ROWS = [
  [
    { label: 'Ankle Leggings', slug: 'ankle-leggings' },
    { label: 'Chudidar Leggings', slug: 'chuddidar-leggings' },
    { label: 'Palazzos Pant', slug: 'palazzos-pant' },
    { label: 'Shimmer Leggings', slug: 'shimmer-leggings' },
  ],
  [
    { label: 'Patiyala Pant', slug: 'patiyala-pant' },
    { label: 'Kids Leggings', slug: 'kids-leggings' },
    { label: 'Jumbo Pant', slug: 'jumbo-palazzos' },
    { label: 'Straight Pant', slug: 'straight-pants' },
    { label: 'Shapewear', slug: 'saree-shapewear' },
  ],
];
// Same channels as the mobile footer (real clickable links, incl. WhatsApp).
const SOCIALS = [
  { icon: 'imgFbIcon', href: 'https://www.facebook.com/share/19BafBeTBd/' },
  { icon: 'imgIgIcon', href: 'https://www.instagram.com/blu_tone.in/' },
  { icon: 'imgWaIcon', href: 'https://wa.me/message/KZDYYZ7RE5BCK1' },
  { icon: 'imgLiIcon', href: 'https://www.linkedin.com/company/blutone/' },
];

export default function DesktopFooter({ shop = true }) {
  const navigate = useNavigate();
  // Navigate AND jump to the top of the page — even when the target is the page
  // you're already on (clicking from the footer should never leave you scrolled
  // down). scrollTo runs unconditionally so same-route clicks still reset.
  const go = (to) => { navigate(to); window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); };
  return (
    <>
      {shop && (
        <section className="dh-shop">
          <div className="dh-shop-inner">
            <h2>SHOP</h2>
            {SHOP_ROWS.map((row, ri) => (
              <div className="dh-shop-row" key={ri}>
                {row.map((c) => <a key={c.slug} onClick={() => go(`/list?cat=${c.slug}`)}>{c.label}</a>)}
              </div>
            ))}
          </div>
        </section>
      )}
      <footer className="dh-footer">
        <div className="dh-footer-inner">
          <div className="dh-fbrand">
            <img className="logo" src={asset('imgHdLogoPhotoroomTransparent2')} alt="Blutone" />
            <div className="dh-fsocials">
              {SOCIALS.map((s) => (
                <a key={s.icon} className="dh-fsocial" href={s.href} target="_blank" rel="noopener noreferrer">
                  <img src={asset(s.icon)} alt="" />
                </a>
              ))}
            </div>
          </div>
          <div className="dh-fcol">
            <h4>HELP</h4>
            <a onClick={() => go('/account?tab=orders')}>Track Order</a>
            <a onClick={() => go('/account')}>My Account</a>
            <a onClick={() => go('/account?tab=help')}>Returns &amp; Exchange</a>
          </div>
          <div className="dh-fcol">
            <h4>COMPANY</h4>
            <a>About us</a><a>Stores</a><a>Careers</a>
          </div>
          <div className="dh-fcol">
            <h4>CONTACT</h4>
            <div className="dh-fcontact">
              {CONTACTS.map((c) => (
                <a
                  key={c.key}
                  className="line"
                  href={c.href}
                  {...(c.key === 'whatsapp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={`${c.key}: ${c.text}`}
                >
                  {c.key === 'whatsapp'
                    ? <img src={asset('imgWaIcon')} alt="" />
                    : <Icon name={c.icon} size={26} inset={c.inset} />}
                  {c.text}
                </a>
              ))}
              <div className="line plain">GST No: 29AJEPB5245P1ZV</div>
            </div>
          </div>
        </div>
        <div className="dh-footer-bottom">
          <div className="dh-footer-bottom-inner">
            <div className="links"><a>Refund Policy</a><a>Private Policy</a><a>Shipping Policy</a></div>
            <span>© 2026, Blutone</span>
          </div>
        </div>
      </footer>
    </>
  );
}
