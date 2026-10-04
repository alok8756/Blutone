// Reusable loading UI — shimmer skeletons + a spinner.
//
// Skeletons mirror the real content's layout so the page doesn't jump when data
// arrives; the spinner is for whole-section loads (orders, order tracking).
// The animations live in index.css (.bt-skel / .bt-spinner) so they're shared
// by both the mobile (scaled Frame) and desktop layouts.
import { C, F } from '../tokens.js';

/** A single shimmer block. Size it with w/h/r; extra style merges on top. */
export function Skeleton({ w = '100%', h = 12, r = 8, style }) {
  return <div className="bt-skel" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

/** Centered spinner with an optional label — for section / page-level loading. */
export function Spinner({ size = 40, label, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', ...style }}>
      <div className="bt-spinner" style={{ width: size, height: size }} />
      {label && <p style={{ ...F.m500, fontSize: 15, color: C.gray, textAlign: 'center' }}>{label}</p>}
    </div>
  );
}

/** Placeholder for GridProductCard (170×350) — product-list grid. */
export function GridCardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 170, height: 350 }}>
      <Skeleton w="100%" h={256} r={14} />
      <Skeleton w="90%" h={14} />
      <Skeleton w="62%" h={16} />
      <Skeleton w="48%" h={12} />
    </div>
  );
}

/** Placeholder for ProductCard rails (270 wide). variant 'na' | 'bs'. */
export function RailCardSkeleton({ variant = 'bs' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: 270, flexShrink: 0 }}>
      {/* image keeps the card's 928/1152 ratio → ~335px tall at 270 wide */}
      <Skeleton w="100%" h={335} r={14} />
      <Skeleton w="85%" h={16} />
      <Skeleton w="70%" h={18} />
      {variant === 'bs' && <Skeleton w="55%" h={14} />}
    </div>
  );
}

/** A stack of line skeletons — generic list placeholder (e.g. menu rows). */
export function LinesSkeleton({ rows = 5, gap = 20, w = '100%', h = 18 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, width: '100%' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} w={typeof w === 'function' ? w(i) : w} h={h} />
      ))}
    </div>
  );
}
