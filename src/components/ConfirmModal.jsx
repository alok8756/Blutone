import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { C, F } from '../tokens.js';

/**
 * Reusable confirmation dialog (e.g. "Log out?"). Centered card with a × close,
 * a Cancel/No and a Confirm/Yes button. Closes on the × button, an outside
 * (scrim) click, or Escape — all of which are treated as "cancel".
 *
 * Portaled to <body> so it escapes any scaled/transformed ancestor (Frame).
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onClose,
  destructive = false,
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const bar = { position: 'absolute', left: '50%', top: '50%', width: 16, height: 1.5, background: C.slate, borderRadius: 1 };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 320, background: '#fff', borderRadius: 14, padding: '30px 24px 24px', boxSizing: 'border-box', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', right: 12, top: 12, width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ ...bar, transform: 'translate(-50%,-50%) rotate(45deg)' }} />
          <span style={{ ...bar, transform: 'translate(-50%,-50%) rotate(-45deg)' }} />
        </button>

        <p style={{ ...F.m600, fontSize: 19, color: C.black, margin: '0 0 8px', textAlign: 'center' }}>{title}</p>
        {message && <p style={{ ...F.m400, fontSize: 15, color: C.gray, margin: '0 0 24px', textAlign: 'center', lineHeight: '21px' }}>{message}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 10px', borderRadius: 10, border: `1px solid ${C.slate}`, background: '#fff', color: C.slate, ...F.m600, fontSize: 15, cursor: 'pointer' }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px 10px', borderRadius: 10, border: 'none', background: destructive ? C.pink : C.slate, color: '#fff', ...F.m600, fontSize: 15, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
