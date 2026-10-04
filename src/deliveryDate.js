// Estimated delivery date shown on cart lines. Delivery takes up to 7 days, so
// the label is always "today + `days`" (default 7), recomputed on each render.
// Example: on 4 Jul it reads "Jul 11, Fri".
export function deliveryByLabel(days = 7, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${month} ${d.getDate()}, ${weekday}`;
}
