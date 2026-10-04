import { asset } from '../assets.js';
import { C, F } from '../tokens.js';
import { Rupee, CardStars, VLine } from './bits.jsx';

function Photo({ name }) {
  return (
    <div style={{ width: '100%', aspectRatio: '928 / 1152', position: 'relative', flexShrink: 0, borderRadius: 14, overflow: 'hidden' }}>
      <img
        src={asset(name)}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none' }}
      />
    </div>
  );
}

function PriceRow({ price, mrp, off, full }) {
  return (
    <div style={{ display: 'flex', gap: 23, alignItems: 'center', flexShrink: 0, width: full ? '100%' : undefined }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
          <Rupee size={24} />
          <p style={{ ...F.m600, fontSize: 20, color: C.dark, whiteSpace: 'nowrap' }}>{price}</p>
        </div>
        <p style={{ ...F.m400, fontSize: 20, color: C.gray, textDecoration: 'line-through', whiteSpace: 'nowrap' }}>{mrp}</p>
      </div>
      <div style={{ background: C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 10px', flexShrink: 0 }}>
        <p style={{ ...F.m500, fontSize: 16, color: C.offwhite, whiteSpace: 'nowrap' }}>{off}</p>
      </div>
    </div>
  );
}

// Two lines reserved: a long name used to push the price/rating rows down on
// that one card, so the rail read as uneven next to its neighbours.
const title = { ...F.m500, fontSize: 18, lineHeight: '22px', height: 44, color: C.slate, width: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' };

export default function ProductCard({ variant, product, onClick }) {
  const cursor = onClick ? 'pointer' : undefined;
  if (variant === 'na') {
    return (
      <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'flex-start', flexShrink: 0, width: 270, cursor }}>
        <Photo name={product.img} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', flexShrink: 0, width: 215 }}>
          <p style={title}>{product.title}</p>
          <PriceRow price={product.price} mrp={product.mrp} off={product.off} />
        </div>
      </div>
    );
  }

  // best seller
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'flex-start', flexShrink: 0, width: 270, cursor }}>
      <Photo name={product.img} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', flexShrink: 0, width: 225 }}>
        <p style={title}>{product.title}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', flexShrink: 0, width: 199 }}>
          <PriceRow price={product.price} mrp={product.mrp} off={product.off} full />
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexShrink: 0 }}>
            <CardStars full={product.full} half={product.half} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
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
