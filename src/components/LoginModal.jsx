import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, F } from '../tokens.js';
import { asset } from '../assets.js';
import { useAuth } from '../auth.jsx';
import { sendOtp, resendOtp, verifyOtp } from '../api/client.js';
import { trackCompleteRegistration } from '../lib/metaPixel.js';

/*
 * Login modal — phone + OTP (MSG91), pixel-matched to Figma:
 *   step "phone": node 340:3245    step "otp": node 324:3662 (otp verification)
 *
 * The modal is authored at its native Figma width (331px) and scaled down to
 * fit narrow viewports (never up), so it stays pixel-proportional everywhere —
 * the same scale-to-fit approach the rest of the app uses (see Frame.jsx).
 *
 * Closes on the × button and on an outside (scrim) click.
 */

const DESIGN_W = 331;
const OTP_LEN = 4;
const RESEND_SECONDS = 30;

const slate = C.slate; // #3c4154
const gold = '#ffe851'; // badge border (exact Figma)
const disabledBg = '#cdcdcd';
const disabledText = '#f4f4f4';
const congratsGreen = '#8ad80d'; // Update Profile button (exact Figma)

/* × close button — white bars for contrast on the slate panel. */
function Cross({ onClick }) {
  const bar = { position: 'absolute', left: '50%', top: '50%', width: 18, height: 1.5, background: C.white, borderRadius: 1 };
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{ position: 'absolute', right: 12, top: 12, width: 28, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer', zIndex: 2 }}
    >
      <span style={{ ...bar, transform: 'translate(-50%, -50%) rotate(45deg)' }} />
      <span style={{ ...bar, transform: 'translate(-50%, -50%) rotate(-45deg)' }} />
    </button>
  );
}

/* Shared header: title + "All India Delivery" badge (identical in both steps). */
function Header({ gap }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, alignItems: 'center', width: '100%' }}>
      <p style={{ ...F.m600, fontSize: 22, color: C.white, textAlign: 'center', width: '100%' }}>
        Log in for a smooth shopping experience and exclusive offers.
      </p>
      <div style={{ border: `1px solid ${gold}`, borderRadius: 30, display: 'flex', gap: 22, alignItems: 'center', padding: '8px 20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: 32, height: 32, flexShrink: 0 }}>
          <img src={asset('imgStarGold')} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
        <p style={{ ...F.m500, fontSize: 19, color: C.cardwhite, whiteSpace: 'nowrap' }}>All India Delivery</p>
      </div>
    </div>
  );
}

/* Bottom action button — matches the Figma "Verify" pill (198 wide, r6, p10).
   Disabled = #cdcdcd/#f4f4f4 (exact Figma); enabled = slate/white. */
function ActionButton({ label, enabled, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled || loading}
      style={{
        width: 198, padding: 10, borderRadius: 6, border: 'none',
        background: enabled && !loading ? slate : disabledBg,
        cursor: enabled && !loading ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <p style={{ ...F.m500, fontSize: 14, color: enabled && !loading ? C.white : disabledText, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {loading ? 'Please wait…' : label}
      </p>
    </button>
  );
}

/* ---------- Step 1: phone entry (Figma 340:3245) ---------- */
function PhoneStep({ phone, setPhone, onSubmit, loading, error }) {
  const valid = /^[6-9]\d{9}$/.test(phone);
  return (
    <div style={{ background: C.white, borderRadius: 12, overflow: 'hidden', width: '100%', height: 228, position: 'relative' }}>
      <p style={{ position: 'absolute', left: '50%', top: 27, transform: 'translateX(-50%)', ...F.m600, fontSize: 17, color: C.black, whiteSpace: 'nowrap' }}>
        LOGIN NOW!!
      </p>

      {/* phone field: 229-wide rounded box, 72-wide +91 country segment */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(); }}
        style={{ position: 'absolute', left: '50%', top: 71, transform: 'translateX(-50%)', width: 229, height: 38 }}
      >
        <div style={{ display: 'flex', width: 229, height: 38, border: `0.5px solid ${C.gray}`, borderRadius: 8, overflow: 'hidden', boxSizing: 'border-box' }}>
          <div style={{ width: 72, height: '100%', borderRight: `0.5px solid ${C.gray}`, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4.5, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, flexShrink: 0 }}>
              <img src={asset('imgFlagIndia')} alt="India" style={{ display: 'block', width: '100%', height: '100%' }} />
            </div>
            <span style={{ ...F.m500, fontSize: 19, color: slate }}>+91</span>
          </div>
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Mobile number"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: '0 10px', ...F.m500, fontSize: 16, color: C.black }}
          />
        </div>
      </form>

      <p style={{ position: 'absolute', left: '50%', top: 116, transform: 'translateX(-50%)', minHeight: 14, ...F.m400, fontSize: 11, color: C.pink, textAlign: 'center', width: 229 }}>
        {error || ' '}
      </p>

      <p style={{ position: 'absolute', left: '50%', top: 134, transform: 'translateX(-50%)', width: 240, ...F.m300, fontSize: 12, color: C.black, textAlign: 'center' }}>
        I accept that I have read &amp; understood your Privacy Policy and T&amp;Cs.
      </p>

      <div style={{ position: 'absolute', left: '50%', top: 178, transform: 'translateX(-50%)' }}>
        <ActionButton label="Send OTP" enabled={valid} loading={loading} onClick={() => valid && onSubmit()} />
      </div>
    </div>
  );
}

/* ---------- Step 2: OTP verification (Figma 324:3662 otp verification) ---------- */
function OtpStep({ phone, onVerify, onResend, loading, error }) {
  const [digits, setDigits] = useState(Array(OTP_LEN).fill(''));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const refs = useRef([]);
  const code = digits.join('');
  const complete = code.length === OTP_LEN;

  // resend countdown
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '');
    setDigits((prev) => {
      const next = [...prev];
      if (d.length > 1) {
        // paste: distribute across boxes from i
        for (let k = 0; k < d.length && i + k < OTP_LEN; k++) next[i + k] = d[k];
        const last = Math.min(i + d.length, OTP_LEN - 1);
        refs.current[last]?.focus();
      } else {
        next[i] = d;
        if (d && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
      }
      return next;
    });
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handleResend = () => {
    if (seconds > 0) return;
    setDigits(Array(OTP_LEN).fill(''));
    refs.current[0]?.focus();
    setSeconds(RESEND_SECONDS);
    onResend();
  };

  return (
    <div style={{ background: C.white, borderRadius: 12, overflow: 'hidden', width: '100%', height: 228, position: 'relative' }}>
      <p style={{ position: 'absolute', left: '50%', top: 18, transform: 'translateX(-50%)', ...F.m600, fontSize: 17, color: C.black, whiteSpace: 'nowrap' }}>
        OTP Verification
      </p>
      <p style={{ position: 'absolute', left: '50%', top: 48, transform: 'translateX(-50%)', ...F.m400, fontSize: 12, color: C.black, textAlign: 'center', whiteSpace: 'nowrap' }}>
        Verification code sent to
      </p>
      <p style={{ position: 'absolute', left: '50%', top: 72, transform: 'translateX(-50%)', ...F.m500, fontSize: 14, color: C.black, textAlign: 'center', whiteSpace: 'nowrap' }}>
        +91 {phone}
      </p>

      {/* 4 OTP boxes: 34x34, r6, 0.5px #565656, gap 16, centered (Figma top 97) */}
      <div style={{ position: 'absolute', left: '50%', top: 97, transform: 'translateX(-50%)', display: 'flex', gap: 16 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="tel"
            inputMode="numeric"
            maxLength={OTP_LEN}
            value={d}
            autoFocus={i === 0}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            style={{ width: 34, height: 34, border: `0.5px solid ${C.gray}`, borderRadius: 6, textAlign: 'center', outline: 'none', ...F.m500, fontSize: 18, color: C.black, padding: 0, boxSizing: 'border-box' }}
          />
        ))}
      </div>

      {/* resend row (Figma top 140) */}
      <div style={{ position: 'absolute', left: '50%', top: 137, transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 20, height: 20, flexShrink: 0 }}>
          <img src={asset('imgHistory')} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
        {seconds > 0 ? (
          <p style={{ ...F.m400, fontSize: 14, color: C.black, whiteSpace: 'nowrap' }}>Resend OTP in {seconds} sec</p>
        ) : (
          <p onClick={handleResend} style={{ ...F.m500, fontSize: 14, color: slate, whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline' }}>
            Resend OTP
          </p>
        )}
      </div>

      <p style={{ position: 'absolute', left: '50%', top: 158, transform: 'translateX(-50%)', minHeight: 12, ...F.m400, fontSize: 11, color: C.pink, textAlign: 'center', width: 220, whiteSpace: 'nowrap' }}>
        {error || ' '}
      </p>

      <div style={{ position: 'absolute', left: '50%', top: 173, transform: 'translateX(-50%)' }}>
        <ActionButton label="Verify" enabled={complete} loading={loading} onClick={() => complete && onVerify(code)} />
      </div>
    </div>
  );
}

/* ---------- Step 3: success / congratulations (Figma 682:8315) ---------- */
function CongratsPanel({ panelRef, scale, onClose, onUpdateProfile }) {
  return (
    <div
      ref={panelRef}
      style={{ position: 'relative', width: DESIGN_W, height: 420, background: slate, borderRadius: 10, transform: `scale(${scale})`, transformOrigin: 'center center', boxShadow: '0px 8px 32px rgba(0,0,0,0.35)' }}
    >
      {/* × close — Outline/Interface/Cross, 46px @ (272,12) */}
      <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', left: 272, top: 12, width: 46, height: 46, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
        <img src={asset('imgCrossWhite')} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
      </button>

      {/* heading block @ (36,74) w259 gap20 */}
      <div style={{ position: 'absolute', left: 36, top: 74, width: 259, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}>
        <p style={{ ...F.m600, fontSize: 26, color: C.white, width: '100%' }}>Congratulations!!</p>
        <p style={{ ...F.m500, fontSize: 19, color: C.cardwhite, lineHeight: '32px', width: 211 }}>You have successfully logged in.</p>
      </div>

      {/* happy shopping + smileys @ (36,210) w259 gap7 */}
      <div style={{ position: 'absolute', left: 36, top: 210, width: 259, display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
        <p style={{ ...F.m600, fontSize: 24, color: C.white, textAlign: 'center', width: '100%' }}>Happy Shopping!!</p>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 24, height: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: '18.47%' }}>
                <img src={asset('imgSmile')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Update Profile @ (center,307) w198 r6 bg #8ad80d */}
      <button onClick={onUpdateProfile} style={{ position: 'absolute', left: '50%', top: 307, transform: 'translateX(-50%)', width: 198, padding: '12px 10px', borderRadius: 6, border: 'none', background: congratsGreen, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ ...F.m500, fontSize: 16, color: C.cardwhite, textAlign: 'center', whiteSpace: 'nowrap' }}>Update Profile</p>
      </button>
    </div>
  );
}

export default function LoginModal({ open, onClose, onSuccess }) {
  const { login } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'congrats'
  const [phone, setPhone] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const panelRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Reset to a clean state every time the modal is (re)opened.
  useEffect(() => {
    if (open) { setStep('phone'); setPhone(''); setVerifiedUser(null); setError(''); setLoading(false); }
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Scale-to-fit: shrink (never enlarge) the 331px panel to fit small viewports.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const h = panelRef.current?.offsetHeight || 520;
      const s = Math.min(1, (window.innerWidth - 32) / DESIGN_W, (window.innerHeight - 32) / h);
      setScale(s > 0 ? s : 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, step]);

  const handleSend = async () => {
    setError(''); setLoading(true);
    try {
      const { phone: normalized } = await sendOtp(phone);
      setPhone(normalized);
      setStep('otp');
    } catch (e) {
      setError(e.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try { await resendOtp(phone); } catch (e) { setError(e.message || 'Could not resend OTP.'); }
  };

  const handleVerify = async (code) => {
    setError(''); setLoading(true);
    try {
      const { token, user, isNewUser } = await verifyOtp(phone, code);
      login(token, user);
      trackCompleteRegistration(isNewUser);
      setVerifiedUser(user);
      setStep('congrats'); // show the success modal instead of closing
    } catch (e) {
      setError(e.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Dismissing the congrats modal (× / outside click / Update Profile) finalises
  // the login and runs the caller's onSuccess (e.g. continue to checkout).
  // NOTE: "Update Profile" just dismisses for now — wire it to a profile page
  // once that design exists.
  const finishCongrats = () => { onClose(); onSuccess?.(verifiedUser); };

  if (!open) return null;

  // The scrim (outside click) closes — and on the congrats step also finalises.
  const onScrim = step === 'congrats' ? finishCongrats : onClose;

  // Portal to <body> so the fixed overlay escapes the scaled Frame transform.
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onScrim} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      {step === 'congrats' ? (
        <CongratsPanel panelRef={panelRef} scale={scale} onClose={finishCongrats} onUpdateProfile={finishCongrats} />
      ) : (
        <div
          ref={panelRef}
          style={{
            position: 'relative',
            width: DESIGN_W,
            background: slate,
            borderRadius: 10,
            padding: '50px 35px 32px',
            boxSizing: 'border-box',
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            boxShadow: '0px 8px 32px rgba(0,0,0,0.35)',
          }}
        >
          <Cross onClick={onClose} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: step === 'otp' ? 35 : 28, alignItems: 'center', width: '100%' }}>
            <Header gap={step === 'otp' ? 21 : 18} />
            {step === 'phone' ? (
              <PhoneStep phone={phone} setPhone={setPhone} onSubmit={handleSend} loading={loading} error={error} />
            ) : (
              <OtpStep phone={phone} onVerify={handleVerify} onResend={handleResend} loading={loading} error={error} />
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
