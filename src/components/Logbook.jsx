import { useCallback, useEffect, useState } from 'react';
import {
  fetchFlights, saveFlight, deleteFlight, setSignOff, approveFlight, returnFlight, saveMyWhatsapp,
  summarize, statusOf, waLink, portalUrl, today,
} from '../lib/students';
import { signoff } from '../data/siteData';
import { money, allocate, chargeFor } from '../lib/billing';
import { dateText } from '../lib/format';
import { PayStep } from './Payments';
import Icon from './Icon';
import './Logbook.css';

export { dateText };

/** Loads a student's flights. Returns [flights, reload, error]. */
export function useFlights(studentUserId) {
  const [flights, setFlights] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(
    () => fetchFlights(studentUserId).then((f) => { setFlights(f); setError(''); }).catch(() => setError('Could not load the logbook. Please try again.')),
    [studentUserId],
  );
  useEffect(() => { reload(); }, [reload]);
  return [flights, reload, error];
}

/** The tiles with icons: totals for every kind of flying. Pass only the approved flights. */
export function StatTiles({ flights }) {
  const t = summarize(flights || []);
  const tiles = [
    ['clock', t.total, 'Total hours'], ['takeoff', t.takeoffs, 'Take-offs'], ['landing', t.landings, 'Landings'],
    ['user', t.solo, 'Solo'], ['users', t.dual, 'Dual'], ['target', t.pic, 'Pilot in command'],
    ['compass', t.crossCountry, 'Cross-country'], ['moon', t.night, 'Night'], ['cloud', t.ifr, 'Instrument (IFR)'], ['monitor', t.sim, 'Simulator'],
  ];
  return (
    <ul className="lb-tiles">
      {tiles.map(([icon, n, label]) => (
        <li key={label}><span><Icon name={icon} size={26} /></span><strong>{n}</strong><small>{label}</small></li>
      ))}
    </ul>
  );
}

/** The student types their WhatsApp number so the school can message them when a flight is approved. */
export function WhatsappCard({ student, onSaved }) {
  const [v, setV] = useState(student.whatsapp || '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    try { await saveMyWhatsapp(v); setMsg('Saved.'); await onSaved(); } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  return (
    <form className="tp-card lb-wa" onSubmit={save}>
      <Icon name="radio" size={28} />
      <div>
        <h3>Your WhatsApp number</h3>
        <p>We message you here when an instructor approves a flight. Type it with the country code, for example 1 647 555 0100.</p>
        <div className="lb-wa__row">
          <input type="tel" inputMode="tel" value={v} onChange={(e) => setV(e.target.value)} placeholder="1 647 555 0100" aria-label="WhatsApp number" />
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
        {msg && <p className="lb-wa__ok">{msg}</p>}
        {err && <p className="tp-err">{err}</p>}
      </div>
    </form>
  );
}

const HOURS = [
  ['dual_hours', 'Dual'], ['solo_hours', 'Solo'], ['pic_hours', 'Pilot in command'], ['cross_country_hours', 'Cross-country'],
  ['night_hours', 'Night'], ['ifr_hours', 'Instrument (IFR)'], ['simulator_hours', 'Simulator'],
];
const NUMBERS = ['total_hours', ...HOURS.map(([k]) => k), 'takeoffs', 'landings'];
const TEXTS = ['flight_number', 'aircraft', 'registration', 'instructor', 'from_airport', 'to_airport', 'weather', 'notes'];

const blank = () => ({ flown_on: today(), departed_at: '', ...Object.fromEntries([...TEXTS, ...NUMBERS].map((k) => [k, ''])) });
const fromFlight = (f) => ({
  ...blank(), ...f,
  departed_at: f.departed_at ? f.departed_at.slice(0, 5) : '',
  ...Object.fromEntries(TEXTS.map((k) => [k, f[k] ?? ''])),
  ...Object.fromEntries(NUMBERS.map((k) => [k, Number(f[k]) ? f[k] : ''])),
});

function FlightForm({ initial, studentUserId, isStaff, onSaved, onCancel }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(editing ? fromFlight(initial) : blank());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const num = (v) => (v === '' ? 0 : Number(v));

  const submit = async (e) => {
    e.preventDefault();
    const total = num(f.total_hours);
    if (!f.aircraft.trim()) return setErr('Please add the aircraft name.');
    if (!(total > 0)) return setErr('Please add the total flight time in hours.');
    for (const [k, label] of HOURS.filter(([k]) => k !== 'simulator_hours')) {
      if (num(f[k]) > total) return setErr(`${label} time cannot be more than the total flight time.`);
    }
    if (num(f.dual_hours) + num(f.solo_hours) > total + 0.001) return setErr('Dual plus solo cannot be more than the total flight time.');
    const fields = {
      flown_on: f.flown_on, departed_at: f.departed_at || null,
      ...Object.fromEntries(TEXTS.map((k) => [k, f[k].trim() || null])),
      ...Object.fromEntries(NUMBERS.map((k) => [k, k === 'takeoffs' || k === 'landings' ? Math.round(num(f[k])) : num(f[k])])),
      returned_note: null, // sending it again puts it back in the "waiting" list
    };
    setBusy(true); setErr('');
    try { const row = await saveFlight(studentUserId, fields, initial?.id); onSaved(fields, !editing, row); }
    catch (ex) { setErr(`Could not save: ${ex?.message || 'unknown problem'}`); setBusy(false); }
  };

  const hours = (k, label, step = '0.1') => (
    <label key={k}>{label}<input type="number" inputMode="decimal" min="0" step={step} value={f[k]} onChange={set(k)} placeholder="0" /></label>
  );

  return (
    <form className="tp-card lb-form" onSubmit={submit}>
      <h2>{editing ? 'Edit flight' : 'Add a flight'}</h2>
      {initial?.returned_note && <p className="lb-back"><Icon name="back" size={18} />Your instructor sent this back: {initial.returned_note}</p>}

      <fieldset>
        <legend>Flight</legend>
        <div className="lb-grid">
          <label>Date<input type="date" value={f.flown_on} max={today()} onChange={set('flown_on')} required /></label>
          <label>Departure time<input type="time" value={f.departed_at} onChange={set('departed_at')} /></label>
          <label>Flight number<input value={f.flight_number} onChange={set('flight_number')} placeholder="for example 12" /></label>
        </div>
        <div className="lb-grid">
          <label>Aircraft name or type<input value={f.aircraft} onChange={set('aircraft')} placeholder="for example Sonex" required /></label>
          <label>Registration<input value={f.registration} onChange={set('registration')} placeholder="C-XXXX" autoCapitalize="characters" /></label>
          <label>Instructor or pilot in command<input value={f.instructor} onChange={set('instructor')} /></label>
        </div>
        <div className="lb-grid">
          <label>From (airport)<input value={f.from_airport} onChange={set('from_airport')} placeholder="for example CNU8" /></label>
          <label>To (airport)<input value={f.to_airport} onChange={set('to_airport')} /></label>
          <label>Weather<input value={f.weather} onChange={set('weather')} placeholder="for example clear, wind 270 at 8" /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Time in the air (hours, for example 1.2)</legend>
        <div className="lb-grid">
          {hours('total_hours', 'Total flight time *')}
          {HOURS.map(([k, label]) => hours(k, label))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Take-offs and landings</legend>
        <div className="lb-grid">
          {hours('takeoffs', 'Take-offs', '1')}
          {hours('landings', 'Landings', '1')}
        </div>
      </fieldset>

      <label>Lesson and remarks<textarea rows="3" value={f.notes} onChange={set('notes')} placeholder="What you practised, and your instructor's comments" /></label>
      {!isStaff && <p className="sc-hint">After you send it you pay for the trip by e-Transfer. An instructor then checks the flight and the payment together. It counts towards your totals once he approves.</p>}

      {err && <p className="tp-err">{err}</p>}
      <div className="tp-actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save and send again' : isStaff ? 'Add to logbook' : 'Send for sign-off'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

const BADGES = {
  waiting: ['wait', 'clock', 'Waiting for instructor sign-off'],
  approved: ['ok', 'check', 'Approved by instructor'],
  returned: ['back', 'back', 'Sent back to fix'],
};

const PAY_BADGE = {
  paid: ['ok', 'check', 'Paid'], part: ['wait', 'clock', 'Part paid'],
  sent: ['wait', 'clock', 'Payment sent, waiting'], unpaid: ['back', 'clock', 'Not paid yet'],
};

/** What this flight costs and whether it is paid. */
function BillBox({ bill, isStaff }) {
  if (!bill || bill.state === 'none') return null;
  const [tone, icon, label] = PAY_BADGE[bill.state];
  const how = bill.dual ? 'Dual trip, one price for the whole flight' : 'Solo trip, one price for the whole flight';
  return (
    <div className={`lb-bill lb-bill--${bill.state}`}>
      <Icon name="wallet" size={24} />
      <div className="lb-bill__main"><strong>{money(bill.amount)}</strong><small>{how}</small></div>
      <div className="lb-bill__state">
        <p className={`lb-badge lb-badge--${tone}`}><Icon name={icon} size={16} />{label}</p>
        {bill.state === 'part' && <small>{money(bill.paid)} of {money(bill.amount)} received</small>}
        {bill.state === 'paid' && <small>{money(bill.paid)} received</small>}
      </div>
      {bill.pending.map((p) => (
        <p key={p.id} className="lb-bill__note">
          {isStaff ? 'Student says' : 'You said'} {money(p.amount)} was sent on {dateText(p.sent_on)}{p.reference ? `, confirmation ${p.reference}` : ''}.{isStaff ? ' Check your bank, then approve.' : ' The instructor will confirm it.'}
        </p>
      ))}
    </div>
  );
}

function FlightCard({ f, bill, canEdit, isStaff, onEdit, onPay, onChanged, onError, onApproved, onReturned }) {
  const [confirm, setConfirm] = useState(false);
  const status = statusOf(f);
  const [tone, icon, label] = BADGES[status];
  const run = (fn) => async () => { try { await fn(); onChanged(); } catch (ex) { onError(ex.message); } };
  const chips = [
    ['Dual', f.dual_hours], ['Solo', f.solo_hours], ['PIC', f.pic_hours], ['Cross-country', f.cross_country_hours],
    ['Night', f.night_hours], ['IFR', f.ifr_hours], ['Simulator', f.simulator_hours],
  ].filter(([, v]) => Number(v) > 0);
  const route = [f.from_airport, f.to_airport].filter(Boolean).join(' → ');

  const approve = run(async () => {
    const saved = window.localStorage.getItem('instructorName') || '';
    const name = window.prompt('Instructor name to sign this entry:', f.instructor || saved);
    if (name === null) return;
    if (!name.trim()) throw new Error('Please type your name to sign.');
    await approveFlight(f.id, name.trim());
    window.localStorage.setItem('instructorName', name.trim());
    onApproved(f, name.trim(), (bill?.pending || []).reduce((a, p) => a + Number(p.amount), 0));
  });
  const sendBack = run(async () => {
    const note = window.prompt('What should the student fix? They will see this note.');
    if (note === null) return;
    if (!note.trim()) throw new Error('Please write what needs to be fixed.');
    await returnFlight(f.id, note.trim());
    onReturned(f, note.trim());
  });

  return (
    <li className={`tp-card lb-card lb-card--${status}`}>
      <div className="lb-card__top">
        <div>
          <strong>{dateText(f.flown_on)}{f.departed_at ? ` · ${f.departed_at.slice(0, 5)}` : ''}</strong>
          <span>{[f.flight_number && `Flight ${f.flight_number}`, f.aircraft, f.registration].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="lb-card__total"><b>{f.total_hours}</b> h</div>
      </div>
      <p className={`lb-badge lb-badge--${tone}`}><Icon name={icon} size={16} />{label}</p>
      {route && <p className="lb-card__route"><Icon name="plane" size={18} />{route}</p>}
      {chips.length > 0 && <ul className="lb-chips">{chips.map(([k, v]) => <li key={k}>{k} <b>{v}</b></li>)}</ul>}
      <p className="lb-card__meta">
        {(f.takeoffs > 0 || f.landings > 0) && <span><Icon name="takeoff" size={18} />{f.takeoffs} take-offs · {f.landings} landings</span>}
        {f.weather && <span><Icon name="cloud" size={18} />{f.weather}</span>}
        {f.instructor && <span><Icon name="user" size={18} />{f.instructor}</span>}
      </p>
      {f.notes && <p className="lb-card__notes">{f.notes}</p>}
      {status === 'returned' && <p className="lb-card__returned"><b>Note from the instructor:</b> {f.returned_note}</p>}
      <BillBox bill={bill} isStaff={isStaff} />
      {f.signed_off && <p className="lb-card__signed"><Icon name="check" size={18} />Signed by {f.signed_by}{f.signed_at ? ` on ${dateText(f.signed_at.slice(0, 10))}` : ''}</p>}
      {(canEdit || isStaff) && (
        <div className="lb-card__btns">
          {isStaff && !f.signed_off && <button className="good" onClick={approve}>{bill?.pending?.length ? 'Approve flight and payment' : 'Approve flight'}</button>}
          {!isStaff && canEdit && !f.signed_off && bill?.state === 'unpaid' && <button className="good" onClick={() => onPay(f)}>Pay for this trip</button>}
          {isStaff && !f.signed_off && status !== 'returned' && <button onClick={sendBack}>Send back</button>}
          {isStaff && f.signed_off && <button onClick={run(() => setSignOff(f.id, null))}>Remove signature</button>}
          {canEdit && <button onClick={() => onEdit(f)}>{status === 'returned' ? 'Fix and send again' : 'Edit'}</button>}
          {canEdit && (confirm
            ? <button className="danger" onClick={run(() => deleteFlight(f.id))}>Yes, delete</button>
            : <button className="danger" onClick={() => setConfirm(true)}>Delete</button>)}
        </div>
      )}
    </li>
  );
}

/** After a send, approve or send-back: a ready-made WhatsApp or email message, one tap away. */
function Notice({ n, student, onClose }) {
  const url = portalUrl();
  const first = student.full_name.split(' ')[0];
  const f = n.flight;
  const when = `${dateText(f.flown_on)}, ${f.aircraft || 'flight'}, ${f.total_hours} h`;
  let title; let text; let to; let mail = null;

  if (n.kind === 'submitted') {
    const p = n.payment;
    title = p ? 'Sent for sign-off and payment check' : 'Sent for instructor sign-off';
    text = p
      ? `Hi, ${student.full_name} (${student.student_id}) sent a flight for sign-off: ${when}, and paid ${money(p.amount)} by e-Transfer on ${dateText(p.sent_on)}${p.reference ? ` (confirmation ${p.reference})` : ''}. Please check your bank, then approve the flight and payment here: ${url}`
      : `Hi, ${student.full_name} (${student.student_id}) sent a flight for sign-off: ${when}. Please check and sign it here: ${url}`;
    to = signoff.whatsapp;
    mail = { to: signoff.email, subject: `Flight for sign-off: ${student.full_name}`, body: text };
  } else if (n.kind === 'approved') {
    title = n.paid > 0 ? `Flight and payment approved. Let ${first} know.` : `Approved. Let ${first} know.`;
    text = n.paid > 0
      ? `Hi ${first}, your flight (${when}) was approved by ${n.by} and your payment of ${money(n.paid)} was received. Both are updated in your logbook: ${url}`
      : `Hi ${first}, your flight (${when}) was approved by ${n.by}. It now counts in your logbook: ${url}`;
    to = student.whatsapp;
  } else {
    title = `Sent back. Let ${first} know.`;
    text = `Hi ${first}, your flight (${when}) needs a fix: ${n.note}. Please update it here: ${url}`;
    to = student.whatsapp;
  }

  return (
    <div className="tp-card lb-notice" role="status">
      <Icon name="check" size={28} />
      <div>
        <strong>{title}</strong>
        {n.kind === 'submitted' && <p>{n.payment ? 'The instructor checks the flight and your payment together. Tap to tell him now.' : 'It stays on "waiting" until an instructor approves it. You can pay for the trip from its card. Tap to tell your instructor now.'}</p>}
        <div className="lb-notice__btns">
          {to
            ? <a className="btn btn-primary" href={waLink(to, text)} target="_blank" rel="noreferrer">Message on WhatsApp</a>
            : <span className="sc-hint">{first} has not saved a WhatsApp number yet.</span>}
          {mail && <a className="btn btn-ghost" href={`mailto:${mail.to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}>Send an email</a>}
        </div>
      </div>
      <button className="lb-notice__x" onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}

/** The logbook: flights with add, edit, delete. The team approves, signs or sends back. */
export default function Logbook({ student, flights, reload, viewer, onProfileChange, payments, reloadPayments }) {
  const bills = allocate(flights || [], payments || []).byId;
  const [editing, setEditing] = useState(null); // null | {} (new) | flight
  const [notice, setNotice] = useState(null);
  const [pay, setPay] = useState(null); // the trip the student is paying for now
  const [err, setErr] = useState('');
  const refresh = () => { reload(); if (reloadPayments) reloadPayments(); };
  const canEdit = (f) => viewer.isStaff || (!f.signed_off && f.entered_by === viewer.id);
  const afterSave = (fields, isNew, row) => {
    setEditing(null); setErr(''); refresh();
    if (viewer.isStaff) { setNotice(null); return; }
    if (isNew && row && chargeFor(row).amount > 0) setPay(row); // pay for the trip right away
    else setNotice({ kind: 'submitted', flight: fields });
  };
  const paid = async (payment) => {
    const flight = pay;
    setPay(null); refresh();
    setNotice({ kind: 'submitted', flight, payment });
  };
  const skipPay = () => { setNotice({ kind: 'submitted', flight: pay }); setPay(null); };

  if (pay) {
    const c = chargeFor(pay);
    return <PayStep student={student} flight={pay} amount={c.amount} kind={c.dual ? 'Dual' : 'Solo'} onDone={paid} onSkip={skipPay} />;
  }
  if (editing) {
    return <FlightForm initial={editing} studentUserId={student.user_id} isStaff={viewer.isStaff} onSaved={afterSave} onCancel={() => setEditing(null)} />;
  }
  return (
    <>
      <div className="lb-head">
        <h2>Logbook</h2>
        <button className="btn btn-primary" onClick={() => { setNotice(null); setEditing({}); }}>+ Add a flight</button>
      </div>
      {!viewer.isStaff && !student.whatsapp && <WhatsappCard student={student} onSaved={onProfileChange} />}
      {notice && <Notice n={notice} student={student} onClose={() => setNotice(null)} />}
      {err && <p className="tp-err">{err}</p>}
      {!flights ? <p className="lb-empty">Loading…</p> : flights.length === 0 ? (
        <div className="tp-card lb-empty"><Icon name="book" size={44} /><p>No flights are logged yet. Add your first one.</p></div>
      ) : (
        <ul className="lb-list">
          {flights.map((f) => (
            <FlightCard key={f.id} f={f} bill={bills[f.id]} canEdit={canEdit(f)} isStaff={viewer.isStaff} onEdit={setEditing}
              onPay={setPay} onChanged={() => { setErr(''); refresh(); }} onError={(m) => m && setErr(m)}
              onApproved={(fl, by, paidAmount) => setNotice({ kind: 'approved', flight: fl, by, paid: paidAmount })}
              onReturned={(fl, note) => setNotice({ kind: 'returned', flight: fl, note })} />
          ))}
        </ul>
      )}
    </>
  );
}
