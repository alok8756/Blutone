import { asset } from '../assets.js';
import { C, F } from '../tokens.js';
import { Rupee, CardStars, VLine } from './bits.jsx';

// "ps card mob" (Figma 571:5845) — the 170x350 card used in the product-list grid.
export default function GridProductCard({ product, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', width: 170, height: 350, cursor: onClick ? 'pointer' : undefined }}
    >
      {/* Fixed photo height (not flex:1): the image used to be whatever height
          the text block left over, so a two-line title shrank it and the card
          no longer matched its neighbours in the grid. */}
      <div style={{ height: 234, flexShrink: 0, width: '100%', position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <img src={asset(product.img)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start', width: '100%' }}>
        {/* Two lines reserved either way, so the price/rating rows line up across
            the row whether the name is short or long (clamped past 2 lines). */}
        <p style={{ ...F.m500, fontSize: 16, lineHeight: '20px', height: 40, color: C.slate, width: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.title}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Rupee size={24} />
                <p style={{ ...F.m600, fontSize: 17, color: C.dark, whiteSpace: 'nowrap' }}>{product.price}</p>
              </div>
              <p style={{ ...F.m400, fontSize: 17, color: C.gray, textDecoration: 'line-through', whiteSpace: 'nowrap' }}>{product.mrp}</p>
            </div>
            <div style={{ background: C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 10px' }}>
              <p style={{ ...F.m500, fontSize: 16, color: C.offwhite, whiteSpace: 'nowrap' }}>{product.off}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
            <CardStars full={product.full} half={product.half} size={12} gap={1} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <p style={{ ...F.m500, fontSize: 15, color: C.dark, whiteSpace: 'nowrap' }}>{product.rating}</p>
              <VLine name="imgLine2" len={15} />
              <p style={{ ...F.m400, fontSize: 15, color: C.gray, whiteSpace: 'nowrap' }}>{product.count}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
