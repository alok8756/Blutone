import { jsPDF } from 'jspdf';

/*
 * Generates and auto-downloads a PDF payment receipt for a completed Razorpay
 * order. Called on payment success (see payWithRazorpay). Pulls every detail
 * from the order-detail payload so there's a permanent record for tracking:
 * order number, payment ids, items, amounts, address, timestamps.
 */
const inr = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN');
const fmt = (d) => {
  try { return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return '—'; }
};

export function downloadPaymentReceipt(order) {
  const doc = buildReceiptDoc(order);
  if (!doc) return;
  const num = order.orderNumber || order.ref || String(order.id || '').slice(-6).toUpperCase();
  doc.save(`Blutone-Receipt-${num}.pdf`);
}

// Builds the receipt PDF document (separate from saving so it can be unit-tested
// and reused, e.g. to email/store the receipt server-side later).
export function buildReceiptDoc(order) {
  if (!order) return null;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const RIGHT = W - M;
  const pay = order.payment || {};
  const a = order.shippingAddress || {};
  const num = order.orderNumber || order.ref || String(order.id || '').slice(-6).toUpperCase();

  let y = 54;
  const line = () => { doc.setDrawColor(210); doc.line(M, y, RIGHT, y); y += 18; };
  const kv = (label, value) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120);
    doc.text(label, M, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
    doc.text(String(value ?? '—'), M + 150, y);
    y += 18;
  };

  // Header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(30);
  doc.text('BLUTONE', M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(120);
  doc.text('Payment Receipt', RIGHT, y, { align: 'right' });
  y += 16; line();

  // Order + payment meta
  kv('Order No.', `#${num}`);
  kv('Order Date', fmt(order.placedAt));
  kv('Payment Method', pay.method === 'cod' ? 'Cash on Delivery' : 'Razorpay (Online)');
  kv('Payment Status', String(order.paymentStatus || '—').toUpperCase());
  if (pay.razorpayOrderId) kv('Razorpay Order ID', pay.razorpayOrderId);
  if (pay.razorpayPaymentId) kv('Razorpay Payment ID', pay.razorpayPaymentId);
  if (pay.paidAt) kv('Paid At', fmt(pay.paidAt));
  y += 4; line();

  // Bill to
  const addr = [a.houseFlat, a.laneStreet, a.locality, a.townCity, a.state, a.pin].filter(Boolean).join(', ');
  if (addr) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30);
    doc.text('Bill To', M, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80);
    doc.splitTextToSize(addr, RIGHT - M).forEach((ln) => { doc.text(ln, M, y); y += 14; });
    y += 8; line();
  }

  // Items table
  const cols = { name: M, size: 300, qty: 360, price: 420, total: RIGHT };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30);
  doc.text('Item', cols.name, y);
  doc.text('Size', cols.size, y);
  doc.text('Qty', cols.qty, y);
  doc.text('Price', cols.price, y);
  doc.text('Total', cols.total, y, { align: 'right' });
  y += 8; line();
  doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
  (order.items || []).forEach((it) => {
    const nameLines = doc.splitTextToSize(it.name || '', 250);
    doc.text(nameLines[0] || '', cols.name, y);
    doc.text(String(it.size || '—'), cols.size, y);
    doc.text(String(it.qty || 1), cols.qty, y);
    doc.text(inr(it.price), cols.price, y);
    doc.text(inr((it.price || 0) * (it.qty || 1)), cols.total, y, { align: 'right' });
    y += 18;
  });
  y += 4; line();

  // Totals
  const amt = order.amount || {};
  const total = (label, value, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(bold ? 20 : 90);
    doc.text(label, cols.price, y);
    doc.text(inr(value), cols.total, y, { align: 'right' });
    y += bold ? 20 : 16;
  };
  total('Total MRP', amt.itemsTotal);
  total('Shipping', amt.shipping);
  if (amt.discount > 0) total('Discount', -amt.discount);
  total('Grand Total', amt.grandTotal, true);

  y += 20;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(140);
  doc.text('Thank you for shopping with Blutone. This is a computer-generated receipt.', M, y);
  y += 12;
  doc.text('For support: customercare@blutone.com', M, y);

  return doc;
}
