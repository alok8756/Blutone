// A complete customer profile is REQUIRED before any order can be placed: the
// profile name plus EVERY delivery-address field (House/Flat, Lane/Street,
// Locality, Town/City, State) and a valid 6-digit PIN. This mirrors the backend
// rule in payment.service.js (resolveShippingAddress) so the UI blocks checkout
// up front instead of letting the API reject the order.

// Treats null/undefined/numbers and whitespace-only strings as "not filled".
const isFilled = (v) => String(v ?? '').trim().length > 0;
const PIN_RE = /^\d{6}$/;
const isPin = (v) => PIN_RE.test(String(v ?? '').trim());

// [key, label] for every required address field, in the account-form order.
export const REQUIRED_ADDRESS_FIELDS = [
  ['houseFlat', 'House/Flat'],
  ['laneStreet', 'Lane/Street'],
  ['locality', 'Locality'],
  ['townCity', 'Town/City'],
  ['state', 'State'],
  ['pin', 'PIN'],
];

export function isCompleteAddress(addr) {
  if (!addr || typeof addr !== 'object') return false;
  return REQUIRED_ADDRESS_FIELDS.every(([k]) => (k === 'pin' ? isPin(addr.pin) : isFilled(addr[k])));
}

// True only when the profile name AND the full delivery address are present.
export function isCompleteProfile(user) {
  return isFilled(user?.name) && isCompleteAddress(user?.address);
}

// Ordered human labels for everything still missing/invalid, so the shopper can
// be told exactly what to complete (e.g. "Name, State, a valid 6-digit PIN").
export function profileGaps(user) {
  const gaps = [];
  if (!isFilled(user?.name)) gaps.push('Name');
  const a = user?.address || {};
  for (const [k, label] of REQUIRED_ADDRESS_FIELDS) {
    if (k === 'pin') {
      if (!isPin(a.pin)) gaps.push(isFilled(a.pin) ? 'a valid 6-digit PIN' : 'PIN');
    } else if (!isFilled(a[k])) {
      gaps.push(label);
    }
  }
  return gaps;
}

export const PROFILE_REQUIRED_MESSAGE =
  'Please complete your profile — add your name and every delivery address field before placing your order.';

// A ready-to-show sentence naming the missing fields, with a sensible fallback.
export function profileGapMessage(user) {
  const gaps = profileGaps(user);
  return gaps.length ? `Please add your ${gaps.join(', ')} before placing your order.` : PROFILE_REQUIRED_MESSAGE;
}
