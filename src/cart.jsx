// Cart store — React Context backed by localStorage so the bag survives reloads.
// A cart line is uniquely identified by product + selected colour + selected size.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCategories } from './api/client.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'blutone_cart_v1';
const DEFAULT_SHIPPING = 200; // fallback when a line has no known category charge

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Stable line key from the product identity + chosen variant.
export function lineKey({ id, title, color, size }) {
  return [id || title, color, size].join('||');
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  // slug -> shippingCharge, loaded once from the categories API (cached). Lets the
  // Bag mirror the backend's per-category shipping instead of a hardcoded value.
  const [shipBySlug, setShipBySlug] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [items]);

  useEffect(() => {
    let active = true;
    getCategories()
      .then((cats) => {
        if (!active) return;
        const map = {};
        (cats || []).forEach((c) => {
          map[c.slug] = Number.isFinite(c.shippingCharge) ? c.shippingCharge : DEFAULT_SHIPPING;
        });
        setShipBySlug(map);
      })
      .catch(() => { /* keep fallback shipping if the API is unreachable */ });
    return () => { active = false; };
  }, []);

  // entry: { id, title, img, color, size, price, mrp, qty, category }
  const addItem = useCallback((entry) => {
    const key = lineKey(entry);
    setItems((prev) => {
      const i = prev.findIndex((x) => x.key === key);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + (entry.qty || 1) };
        return next;
      }
      return [...prev, { ...entry, key, qty: entry.qty || 1 }];
    });
  }, []);

  const setQty = useCallback((key, qty) => {
    setItems((prev) => prev.map((x) => (x.key === key ? { ...x, qty: Math.max(1, qty) } : x)));
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((n, x) => n + x.qty, 0);
    const totalMrp = items.reduce((n, x) => n + Number(x.price || 0) * x.qty, 0);
    // Per-category shipping (mirrors the backend): an order pays the highest
    // charge among the categories in the bag, once. Prefer the charge carried on
    // the line itself (from the product detail — covers hidden categories like the
    // bundle that the categories API doesn't expose), then the categories map,
    // then the default for lines with no known category.
    let shipping = 0;
    if (items.length) {
      const charges = items.map((x) =>
        Number.isFinite(x.shippingCharge) ? x.shippingCharge
          : (x.category && Number.isFinite(shipBySlug[x.category])) ? shipBySlug[x.category]
            : DEFAULT_SHIPPING
      );
      shipping = Math.max(...charges);
    }
    return { items, addItem, setQty, removeItem, clear, count, totalMrp, shipping, total: totalMrp + shipping };
  }, [items, shipBySlug, addItem, setQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
