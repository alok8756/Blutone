import { useEffect, useRef, useState } from 'react';
import { DESIGN_W, DESIGN_H } from '../tokens.js';

// `height` lets each page declare its own Figma frame height (Home 4319, PDP 3031...).

/**
 * Renders children inside a fixed 393x4319 "canvas" (the exact Figma frame)
 * and scales that canvas proportionally to fill the available width.
 * This keeps the design pixel-identical at every viewport ("scale-to-fit").
 */
// `cropTop` (design px) hides that many px from the top of the canvas and pulls
// the content up — used to reclaim the space the removed dummy status bar left.
export default function Frame({ children, maxWidth = 500, height = DESIGN_H, cropTop = 0 }) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / DESIGN_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      ref={outerRef}
      style={{
        width: '100%',
        maxWidth,
        margin: '0 auto',
        height: scale ? (height - cropTop) * scale : undefined,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: DESIGN_W,
          height,
          position: 'absolute',
          top: scale ? -cropTop * scale : -cropTop,
          left: 0,
          transformOrigin: 'top left',
          transform: scale ? `scale(${scale})` : 'scale(1)',
          visibility: scale ? 'visible' : 'hidden',
          background: '#f2f2f2',
        }}
      >
        {children}
      </div>
    </div>
  );
}
