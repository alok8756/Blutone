import { useEffect, useRef, useState } from 'react';

// If one image is slow or wedged, commit the set anyway rather than freezing the
// gallery on the old colour forever.
const MAX_WAIT = 2500;
// decode() is a nice-to-have, not a gate — see preload().
const DECODE_CAP = 150;

/** Resolve once `src` is downloaded (and decoded, if decoding is quick). */
function preload(src) {
  return new Promise((resolve) => {
    if (!src) return resolve();
    const img = new Image();
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    img.onload = () => {
      // decode() moves the expensive raster work off the paint that follows the
      // swap, so the tiles don't stagger while each one decodes. But it stalls
      // indefinitely while the document is hidden (decoding is tied to
      // rendering), so cap it — the bytes are already in cache either way.
      if (!img.decode) return done();
      setTimeout(done, DECODE_CAP);
      img.decode().then(done, done);
    };
    img.onerror = done; // a broken URL must not stall the whole swap
    img.src = src;
  });
}

/**
 * Hold a gallery on its current images until an entire new set is downloaded and
 * decoded, then swap every image in a single render.
 *
 * Product photos are remote (Cloudinary), so pointing the PDP's four gallery
 * tiles at four new URLs makes them pop in one by one as each request lands.
 * This preloads the whole incoming set off-screen and commits it as one state
 * update, so switching colour repaints the gallery all at once.
 *
 * @param {string[]} urls  resolved image URLs for the product being shown
 * @returns {{ images: string[], swapping: boolean }} images to render, plus
 *   whether a newer set is still loading (for a loading affordance).
 */
export default function useSyncedImages(urls) {
  const list = Array.isArray(urls) ? urls : [];
  const key = list.join('|');
  const [committed, setCommitted] = useState(list);
  const [swapping, setSwapping] = useState(false);
  // The committed key lives in a ref so it doesn't have to be an effect dep —
  // re-running on every commit would restart the preload it just finished.
  const committedKey = useRef(key);

  useEffect(() => {
    if (!key || key === committedKey.current) return;
    let active = true;
    setSwapping(true);
    let timer;
    const commit = () => {
      if (!active) return;
      active = false;
      clearTimeout(timer);
      committedKey.current = key;
      setCommitted(list);
      setSwapping(false);
    };
    timer = setTimeout(commit, MAX_WAIT);
    Promise.all(list.map((u) => preload(u))).then(commit);
    return () => { active = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { images: committed, swapping };
}
