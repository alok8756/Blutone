import { asset } from '../assets.js';
import Icon from './Icon.jsx';

// Vertical hairline reproduced the way Figma does it (a horizontal line rotated 90deg).
// The source SVG is `len`x1 with no intrinsic size, so we pin its box to len x 1px
// before rotating to avoid the replaced-element default-size blow-up.
export function VLine({ name, len }) {
  return (
    <div style={{ width: 0, height: len, flexShrink: 0, position: 'relative' }}>
      <img
        src={asset(name)}
        alt=""
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: len,
          height: 1,
          maxWidth: 'none',
          display: 'block',
          transform: 'translate(-50%, -50%) rotate(90deg)',
        }}
      />
    </div>
  );
}

// ₹ rupee glyph (mdi:rupee) in a 24px box
export function Rupee({ size = 24 }) {
  return <Icon name="imgVector1" size={size} inset={['12.5%', '25%', '12.5%', '29.17%']} />;
}

// Star row for product cards. `full` solid stars, optional half.
// Defaults match the best-seller cards (16px, gap 2); the grid card passes size 12, gap 1.
export function CardStars({ full, half, size = 16, gap = 2 }) {
  const items = [];
  for (let i = 0; i < full; i++) {
    items.push(<Icon key={'f' + i} name="imgIcon11" size={size} inset={['10.41%', '6.62%', '10.25%', '6.62%']} />);
  }
  if (half) {
    items.push(<Icon key="h" name="imgIcon12" size={size} inset={['8.52%', '47.92%', '12.33%', '8.33%']} />);
  }
  return <div style={{ display: 'flex', gap, alignItems: 'center', flexShrink: 0 }}>{items}</div>;
}
