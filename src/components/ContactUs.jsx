import Icon from './Icon.jsx';
import { F } from '../tokens.js';

/*
 * Shared "Contact us" block used across pages (home footer, PDP footer, …).
 * Icon + value per channel, each row a real link so a tap does the right thing:
 *   - email    -> mailto: (opens the mail app)
 *   - call     -> tel:    (opens the phone dialer, e.g. Google Dialer on Android)
 *   - whatsapp -> wa.me   (opens a WhatsApp DM; number is full intl form, no +/spaces)
 * Pass `style` to position it (absolute on the home footer, margins on the PDP).
 */
// Single source of truth for contact channels, shared with the Help & Support
// page (mobile + desktop). Each row is a real link so a tap does the right
// thing (mailto / tel / wa.me) — see the anchor rendering below and in HelpTab.
export const CONTACTS = [
  { key: 'email', icon: 'imgIcon2', inset: ['19.6%', '11.82%', '19.6%', '11.82%'], text: 'support@blutone.in', href: 'mailto:support@blutone.in' },
  { key: 'call', icon: 'imgIcon1', inset: ['13.75%', '14.02%', '17.67%', '17.36%'], text: '+91 9620425545', href: 'tel:+919620425545' },
  { key: 'whatsapp', icon: 'imgSubtract', inset: ['8.33%', '8.33%', '9.01%', '8.68%'], text: '+91 9110888755', href: 'https://wa.me/9110888755' },
];

export default function ContactUs({ style, color = '#000', width = 290 }) {
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: 20, ...style }}>
      <p style={{ ...F.m500, fontSize: 20, color, margin: 0 }}>Contact us</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
        {CONTACTS.map((c) => (
          <a
            key={c.key}
            href={c.href}
            {...(c.key === 'whatsapp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            aria-label={`${c.key}: ${c.text}`}
            style={{ position: 'relative', display: 'block', height: 24, width: '100%', textDecoration: 'none' }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0 }}><Icon name={c.icon} size={24} inset={c.inset} /></div>
            <p style={{ position: 'absolute', left: '10%', top: 0, ...F.m500, fontSize: 18, color, whiteSpace: 'nowrap', margin: 0 }}>{c.text}</p>
          </a>
        ))}
        <p style={{ ...F.m500, fontSize: 18, color, margin: 0, width: '100%' }}>GST No: 29AJEPB5245P1ZV</p>
      </div>
    </div>
  );
}
