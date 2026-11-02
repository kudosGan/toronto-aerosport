import { rates } from '../data/siteData';

export const money = (n) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(n));
const cents = (n) => Math.round(n * 100) / 100;

/** What one trip costs. Flat price: dual if any of it was dual, solo if it was only solo. Nothing for other entries. */
export function chargeFor(f) {
  const dual = Number(f.dual_hours) > 0;
  const solo = Number(f.solo_hours) > 0;
  if (!dual && !solo) return { amount: 0, dual: false, solo: false };
  return { amount: dual ? rates.dualTrip : rates.soloTrip, dual, solo };
}

/**
 * Works out what is paid, trip by trip.
 * A confirmed payment linked to a trip pays that trip. Confirmed money that is not linked to a trip
 * pays the oldest unpaid trips first.
 * Returns { byId: { [flightId]: { ...charge, paid, state, pending } }, charges, received, balance }.
 * state: paid, part, sent (a payment was reported and waits for the school), unpaid, none.
 */
export function allocate(flights, payments) {
  const all = payments || [];
  const ordered = [...(flights || [])].sort((a, b) => (a.flown_on + a.created_at).localeCompare(b.flown_on + b.created_at));
  const known = new Set(ordered.map((f) => f.id));
  const confirmed = all.filter((p) => p.status === 'confirmed');
  const received = cents(confirmed.reduce((a, p) => a + Number(p.amount), 0));

  const linked = {};
  let spare = 0;
  for (const p of confirmed) {
    if (p.flight_id && known.has(p.flight_id)) linked[p.flight_id] = (linked[p.flight_id] || 0) + Number(p.amount);
    else spare += Number(p.amount);
  }

  const byId = {};
  let charges = 0;
  for (const f of ordered) {
    const c = chargeFor(f);
    const own = linked[f.id] || 0;
    let paid = Math.min(c.amount, own);
    spare += own - paid; // paid more than the trip cost: the rest becomes spare money
    const need = c.amount - paid;
    const take = Math.min(need, spare);
    paid = cents(paid + take);
    spare = cents(spare - take);
    charges += c.amount;
    const pending = all.filter((p) => p.flight_id === f.id && p.status === 'pending');
    let state = 'unpaid';
    if (c.amount === 0) state = 'none';
    else if (paid >= c.amount - 0.005) state = 'paid';
    else if (paid > 0) state = 'part';
    else if (pending.length) state = 'sent';
    byId[f.id] = { ...c, paid, state, pending };
  }
  return { byId, charges, received, balance: cents(charges - received) };
}
