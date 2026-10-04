// Shared Product-page accordion content (exact Figma values), reused by the
// mobile ProductPage and the desktop DesktopProduct so there's one source of truth.
import Icon from '../components/Icon.jsx';
import { passet } from './passet.js';

export const PRODUCT_DETAILS =
  'Complete any look, be it traditional or western with these Solid Black Leggings. Made from cotton & elastane, it has a elasticised waistband & has a slim fit.';

export const SPEC_ROWS = [
  ['Fabric', 'Cotton', 'Fit', 'Slim'],
  ['Pattern', 'Solid', 'Length', 'Ankle Length'],
  ['Box Content', 'A pair of Ankle Length Leggings', 'Model', "The model is wearing S is of the height 5'6'"],
];

export const REVIEW_TEXT = 'It is comfortable & looks great 😊';

// ---- Configurable product reviews --------------------------------------------
// Reviews keyed by category slug. Each product shows a random-but-STABLE slice of
// its category's reviews (seeded by the product id/slug), so the 4 reviews are
// distributed across the products in that category — the same product always shows
// the same set, but different products vary. Add/edit categories & reviews here.
export const REVIEWS_BY_CATEGORY = {
  'ankle-leggings': [
    { name: 'Simran K.', text: 'Fits perfectly right at the ankle with no extra folds. Looks very neat and unique!' },
    { name: 'Ipshita', text: "This is my 3rd year using Blutone products, it's the best." },
    { name: 'Neha Singh', text: 'Good thick fabric, fully opaque. Planning to buy more colors soon!' },
    { name: 'Bhavna Kamat', text: 'Stays tight and smooth even after many washes. Very high quality material.' },
  ],
  'chuddidar-leggings': [
    { name: 'Dr. Sunita Rakesh', text: 'Honestly, gives lovely, neat folds at the ankles. Feels just like a custom-stitched one.' },
    { name: 'Deepika Janardan', text: 'The color does not fade after washing. Very stretchable and easy to sit in.' },
    { name: 'Aarti M.', text: 'Very soft fabric for daily wear. It keeps its shape and does not get loose.' },
    { name: 'Priya G.', text: 'Fits nicely on the legs without feeling too tight. Super stretch and comfortable all day.' },
  ],
};

// Fallback for any product whose category has no configured reviews.
export const DEFAULT_REVIEWS = [
  { name: 'Sneha Sharma', text: REVIEW_TEXT },
  { name: 'Ritu Verma', text: 'Great fit and very comfortable. Would definitely recommend!' },
  { name: 'Anjali P.', text: 'Nice quality and true to size. Very happy with the purchase.' },
];

// How many reviews to show per product.
export const REVIEWS_PER_PRODUCT = 3;

// Deterministic string hash → stable pseudo-randomness (no Math.random, so reviews
// don't reshuffle on every render).
function hashStr(s = '') {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Stable, "randomly distributed" slice of a category's reviews for one product.
export function reviewsFor(product) {
  const pool = REVIEWS_BY_CATEGORY[product?.category] || DEFAULT_REVIEWS;
  const seed = String(hashStr(product?.id || product?.slug || product?.title || 'x'));
  const ordered = pool
    .map((r, i) => ({ r, k: hashStr(seed + '#' + i) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.r);
  return ordered.slice(0, Math.min(REVIEWS_PER_PRODUCT, ordered.length));
}

// Washing Instructions (Figma 597:6553): 60px circle + 45px glyph (offset 7,7) + label.
export const WASH = [
  { icon: 'imgWashMachine', inset: ['8.33%', '16.78%', '8.33%', '17.91%'], inner: ['-2.67%', '-3.4%', '-2.67%', '-3.4%'], label: 'Machine Wash', w: 77 },
  { icon: 'imgWashBleach', inset: ['12.37%', '12.5%', '12.5%', '12.47%'], inner: ['-2.96%', '-2.96%', '-2.96%', '-2.96%'], label: 'Do Not Bleach', w: 77 },
  { icon: 'imgWashHand', inset: ['25%', '12.5%', '25%', '12.5%'], inner: ['-4.45%', '-2.96%', '-4.44%', '-2.96%'], label: 'Hand Wash', w: 77 },
  { icon: 'imgWashTemp', inset: ['25%', '12.5%', '25%', '12.5%'], inner: ['-4.45%', '-2.96%', '-4.44%', '-2.96%'], label: 'Wash with like Colors', w: 100 },
  { icon: 'imgWashHoodie', inset: ['8.33%', '8.33%', '8.33%', '8.33%'], inner: ['-2.67%', '-2.67%', '-2.67%', '-2.67%'], label: 'Line Dry in Shade', w: 98 },
  { icon: 'imgWashIron', inset: ['17.89%', '6.17%', '16.93%', '8.91%'], inner: ['-3.41%', '-2.62%', '-3.41%', '-2.64%'], label: 'Use Iron on a Low Setting', w: 113 },
];

// The 60px grey circle + dark line-icon glyph (identical in mobile & desktop).
export function WashGlyph({ item }) {
  return (
    <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
      <img src={passet('imgWashEllipse')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', maxWidth: 'none' }} />
      <div style={{ position: 'absolute', left: 7, top: 7 }}>
        <Icon src={passet(item.icon)} size={45} inset={item.inset} inner={item.inner} />
      </div>
    </div>
  );
}

// Color swatches (Figma 190:1429): row 1 has 4 real fills then empties; row 2 all empty.
export const SWATCH_COLORS = ['#FFCC00', '#FA2307', '#09E638', '#DE14C3'];
