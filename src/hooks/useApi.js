import { useEffect, useRef, useState } from 'react';

/**
 * Run an async function and track its state.
 *
 *   const { data, loading, error } = useAsync(() => getProducts({ category }), [category]);
 *
 * `fn` is re-run whenever `deps` change. Results from a stale run (deps changed
 * mid-flight) are discarded so the UI never shows the wrong response.
 *
 * @param {() => Promise<any>} fn
 * @param {Array} deps
 * @param {any} [initial]  value for `data` before the first resolve
 */
export function useAsync(fn, deps = [], initial = null) {
  const [state, setState] = useState({ data: initial, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef.current()
      .then((data) => { if (active) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (active) setState({ data: initial, loading: false, error }); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/**
 * Debounced value — used to avoid firing a search/suggest request on every
 * keystroke. Returns the latest `value` after it has been stable for `delay` ms.
 */
export function useDebounced(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
