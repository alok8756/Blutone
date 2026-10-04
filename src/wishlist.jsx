import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth.jsx';
import { getWishlist, addWishlist, removeWishlist } from './api/client.js';
import { trackAddToWishlist } from './lib/metaPixel.js';

/**
 * App-wide wishlist state. Loads the server wishlist whenever the user is
 * authenticated and clears it on logout. Items are hydrated product cards
 * (id === product slug). Used by the PDP heart and the account Wishlist tab.
 */
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) { setItems([]); return; }
    setLoading(true);
    getWishlist()
      .then((d) => { if (active) setItems(d || []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated]);

  const isWishlisted = useCallback((slug) => items.some((i) => i.id === slug), [items]);

  const add = useCallback(async (slug, size) => {
    const next = await addWishlist(slug, size);
    // Only the "added" direction is a Meta event — removing is not a signal.
    trackAddToWishlist(slug);
    setItems(next || []);
    return next;
  }, []);

  const remove = useCallback(async (slug) => {
    const next = await removeWishlist(slug);
    setItems(next || []);
    return next;
  }, []);

  const toggle = useCallback(
    (slug, size) => (items.some((i) => i.id === slug) ? remove(slug) : add(slug, size)),
    [items, add, remove]
  );

  return (
    <WishlistContext.Provider value={{ items, loading, count: items.length, isWishlisted, add, remove, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
