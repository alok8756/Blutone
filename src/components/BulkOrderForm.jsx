import { useState } from 'react';
import { C, F } from '../tokens.js';
import { submitBulkOrder } from '../api/client.js';
import { trackLead } from '../lib/metaPixel.js';
import solidPhone from '../assets/solidPhone.svg';

// "Call Now" destination. Display form is +91 spaced; the tel: href must be
// digits only (with country code) so the OS dialer parses it correctly.
const CALL_NUMBER = '+91 9620425545';
const CALL_TEL = '+919620425545';

/*
 * "ORDER IN BULK" enquiry card (Figma 1286:8640). Navy card, Cormorant Garamond
 * title, four labelled fields and a pink "Enquire Now" button that POSTs to
 * /bulk-orders. Name + mobile are mandatory (enforced client-side and again by
 * the API). Below it an "or" divider and a green "Call Now" button (Figma
 * 1680:8874) that opens the device dialer via a tel: link. Colours/fonts are
 * exact Figma values.
 */
const LABEL = '#f4f6fd'; // color/lightblue/lblue-50
const PLACEHOLDER = '#d4dcf9'; // color/lightblue/lblue-200

const FIELDS = [
  { key: 'name', label: 'Name', placeholder: 'Your name' },
  { key: 'phone', label: 'Phone no', placeholder: 'Your mobile number' },
  { key: 'email', label: 'Email id', placeholder: 'Your email (optional)' },
  { key: 'message', label: 'Message', placeholder: 'Tell us what you need…', multiline: true },
];

const inputBase = {
  ...F.m400, fontSize: 14, color: C.white, width: '100%', boxSizing: 'border-box',
  background: 'transparent', border: `1px solid ${C.white}`, borderRadius: 9,
  padding: '10px 16px', outline: 'none',
};

export default function BulkOrderForm({ width = 312 }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (busy) return;
    setError('');
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (!form.phone.trim()) { setError('Please enter your mobile number.'); return; }
    setBusy(true);
    try {
      await submitBulkOrder({ name: form.name, phone: form.phone, email: form.email, message: form.message });
      trackLead('Bulk Order Enquiry');
      setDone(true);
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch (e) {
      setError(e.message || 'Could not submit your enquiry. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: '100%', background: C.slate, borderRadius: 0, padding: '30px 20px 40px', boxSizing: 'border-box' }}>
      <p style={{ ...F.cormorant700, fontSize: 32, color: C.white, textAlign: 'center', marginBottom: 24 }}>ORDER IN BULK</p>

      {done ? (
        <div style={{ width, maxWidth: '100%', margin: '0 auto', textAlign: 'center', padding: '30px 0' }}>
          <p style={{ ...F.cormorant600, fontSize: 24, color: C.white }}>Thank you!</p>
          <p style={{ ...F.m400, fontSize: 15, color: PLACEHOLDER, marginTop: 10, lineHeight: '22px' }}>
            Your bulk enquiry has been received. Our team will reach out to you shortly.
          </p>
          <button
            onClick={() => setDone(false)}
            style={{ marginTop: 20, background: C.pink, border: 'none', borderRadius: 8, padding: '12px 18px', cursor: 'pointer' }}
          >
            <span style={{ ...F.m600, fontSize: 16, color: C.white }}>Submit another</span>
          </button>
        </div>
      ) : (
        <div style={{ width, maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {FIELDS.map((f) => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ ...F.cormorant600, fontSize: 16, color: LABEL }}>{f.label}</label>
              {f.multiline ? (
                <textarea
                  className="bulk-input"
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ ...inputBase, resize: 'vertical', minHeight: 90, fontFamily: F.m400.fontFamily }}
                />
              ) : (
                <input
                  className="bulk-input"
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'}
                  style={inputBase}
                />
              )}
            </div>
          ))}

          {error && <p style={{ ...F.m500, fontSize: 13, color: '#ff9ecf' }}>{error}</p>}

          <button
            onClick={submit}
            disabled={busy}
            style={{ width: '100%', background: C.pink, border: 'none', borderRadius: 8, padding: '12px 18px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, marginTop: 4 }}
          >
            <span style={{ ...F.m600, fontSize: 22, color: C.white, whiteSpace: 'nowrap' }}>{busy ? 'Submitting…' : 'Enquire Now'}</span>
          </button>

          {/* Figma 1680:8852 — "or" divider between the two CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.5)' }} />
            <span style={{ ...F.m400, fontSize: 17, lineHeight: '24px', color: C.white }}>or</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.5)' }} />
          </div>

          {/* Figma 1680:8874 — green "Call Now" button; tel: opens the device dialer */}
          <a
            href={`tel:${CALL_TEL}`}
            aria-label={`Call now on ${CALL_NUMBER}`}
            style={{
              width: '100%', boxSizing: 'border-box', textDecoration: 'none',
              background: C.green, borderRadius: 8, padding: '12px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${C.green50}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src={solidPhone} alt="" width={22} height={22} style={{ display: 'block' }} />
            </span>
            <span style={{ ...F.m600, fontSize: 22, lineHeight: '27px', color: C.white, whiteSpace: 'nowrap' }}>Call Now</span>
          </a>
        </div>
      )}

      <style>{`
        .bulk-input::placeholder { color: ${PLACEHOLDER}; }
      `}</style>
    </div>
  );
}
