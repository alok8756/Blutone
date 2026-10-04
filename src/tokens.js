// Exact design tokens read from the Figma file (no invented values).

export const DESIGN_W = 393;
export const DESIGN_H = 4319;

// Colors (exactly as defined in the Figma layers)
export const C = {
  bg: '#f2f2f2',
  status: '#020912', // Primary-color-010
  statusText: '#fffefe',
  slate: '#3c4154',
  navy: '#2f3343',
  wine: '#520c1e',
  pink: '#fa0789',
  green: '#75b809',   // ORDER IN BULK "Call Now" button
  green50: '#d9ffbf', // Color/Green/Green 50 — Call Now icon + circle border
  gray: '#565656',
  dark: '#212121',
  placeholder: '#a2a2a2',
  border: '#8590ba',
  lilac70: 'rgba(212,220,249,0.7)',
  lilac60: 'rgba(212,220,249,0.6)',
  offwhite: '#f3f3f3',
  cardwhite: '#fefefe',
  white: '#ffffff',
  black: '#000000',
};

// Font families mapped from Figma font names "Family:Style"
export const F = {
  m300: { fontFamily: 'Montserrat, sans-serif', fontWeight: 300 },
  m400: { fontFamily: 'Montserrat, sans-serif', fontWeight: 400 },
  m500: { fontFamily: 'Montserrat, sans-serif', fontWeight: 500 },
  m600: { fontFamily: 'Montserrat, sans-serif', fontWeight: 600 },
  m700: { fontFamily: 'Montserrat, sans-serif', fontWeight: 700 },
  allura: { fontFamily: '"Allura", cursive', fontWeight: 400 },
  playfair: { fontFamily: '"Playfair Display", serif', fontWeight: 700 },
  // Cormorant Garamond — serif used for the new home section headings
  // (SHOP BY CATEGORY, Blutone Essentials, ORDER IN BULK, …).
  cormorant500: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 500 },
  cormorant600: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 },
  cormorant700: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 },
  sf: {
    fontFamily: '-apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
    fontWeight: 500,
  },
};
