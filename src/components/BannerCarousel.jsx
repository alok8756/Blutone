import { useEffect, useState } from 'react';
import { asset } from '../assets.js';

/*
 * Top hero banner carousel (Figma "outer banners", 173:2071 @ y=141).
 * Auto-alternates between the banner images every `interval` ms with a smooth
 * horizontal slide (it advances forward and wraps, so it reads as sliding
 * left↔right). Pauses while the tab is hidden. The banner artwork already
 * includes its headline + SHOP NOW, so each slide is just the full image.
 */
// Both banners' SHOP NOW go to the Leggings listing.
const BANNERS = [
  { key: 'imgHomeBanner1', alt: 'Effortless Bottoms', to: '/list?group=leggings' },
  { key: 'imgHomeBanner2', alt: 'Modern Moves — Ethnic Roots', to: '/list?group=leggings' },
];

export default function BannerCarousel({ width = 393, height = 464, interval = 1000, onShop }) {
  const [i, setI] = useState(0);
  const n = BANNERS.length;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return; // don't advance in a background tab
      setI((c) => (c + 1) % n);
    }, interval);
    return () => clearInterval(id);
  }, [interval, n]);

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
      {/* Track holds all slides side by side; translateX slides to the active one. */}
      <div
        style={{
          display: 'flex',
          width: `${n * 100}%`,
          height: '100%',
          transform: `translateX(-${i * (100 / n)}%)`,
          transition: 'transform 0.6s ease',
        }}
      >
        {BANNERS.map((b) => (
          <div key={b.key} style={{ position: 'relative', flex: `0 0 ${100 / n}%`, height: '100%' }}>
            <img src={asset(b.key)} alt={b.alt} draggable={false} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none' }} />
            {/* Transparent hit-area over the painted "SHOP NOW" CTA. Navigation happens
                ONLY here — tapping (or scrolling over) the rest of the banner never
                redirects, which was causing accidental navigation while scrolling. */}
            {onShop && (
              <button
                aria-label="Shop Now"
                onClick={() => onShop(b.to)}
                style={{ position: 'absolute', left: 20, top: 352, width: 150, height: 64, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Slide dots */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
        {BANNERS.map((b, idx) => (
          <span
            key={b.key}
            onClick={() => setI(idx)}
            style={{ width: idx === i ? 20 : 8, height: 8, borderRadius: 4, background: idx === i ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'width 0.3s ease', cursor: 'pointer' }}
          />
        ))}
      </div>
    </div>
  );
}
