import { useCallback, useEffect, useState } from 'react';
import {
  fetchPayments, reportPayment, confirmPayment, declinePayment, deletePayment, waLink, portalUrl, today,
} from '../lib/students';
import { signoff, payments as payInfo, contact } from '../data/siteData';
import { money, allocate } from '../lib/billing';
import { dateText } from '../lib/format';
import Icon from './Icon';
import './Payments.css';

const BADGES = {
  pending: ['wait', 'clock', 'Waiting for the school to confirm'],
  confirmed: ['ok', 'check', 'Received'],
  declined: ['back', 'back', 'Not received'],
};

export function usePayments(studentUserId) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(
    () => fetchPayments(studentUserId).then((r) => { setRows(r); setError(''); }).catch(() => setError('Could not load the payments. Please try again.')),
    [studentUserId],
  );
  useEffect(() => { reload(); }, [reload]);
  return [rows, reload, error];
}

function Notice({ title, text, to, mail, onClose }) {
  return (
    <div className="tp-card lb-notice" role="status">
      <Icon name="check" size={28} />
      <div>
        <strong>{title}</strong>
        <div className="lb-notice__btns">
          {to
            ? <a className="btn btn-primary" href={waLink(to, text)} target="_blank" rel="noreferrer">Message on WhatsApp</a>
            : <span className="sc-hint">No WhatsApp number is saved for this student yet.</span>}
          {mail && <a className="btn btn-ghost" href={`mailto:${mail}?subject=${encodeURIComponent('e-Transfer sent')}&body=${encodeURIComponent(text)}`}>Send an email</a>}
        </div>
      </div>
      <button className="lb-notice__x" onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}

function HowToPay() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(payInfo.etransferEmail); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <section className="tp-card pay-how">
      <div className="pay-how__head"><Icon name="mail" size={28} /><h2>Pay by Interac e-Transfer</h2></div>
      <ol>
        <li>Open your bank app or online banking and choose <strong>Interac e-Transfer</strong>.</li>
        <li>Send it to this email:
          <div className="pay-how__email"><code>{payInfo.etransferEmail}</code><button type="button" onClick={copy}><Icon name="copy" size={16} />{copied ? 'Copied' : 'Copy'}</button></div>
        </li>
        <li>Write your <strong>student ID</strong> in the message box, so we know it is from you.</li>
        <li>Then fill in the form below so the school can check it and confirm.</li>
      </ol>
      <p className="sc-hint">Questions about the amount or the transfer? Call <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a>.</p>
    </section>
  );
}

/** Reports an e-Transfer. With a flight it is the payment for that trip and the amount is fixed. */
function ReportForm({ student, flight, amount, onDone, onSkip }) {
  const [f, setF] = useState({ amount: amount ?? '', sent_on: today(), reference: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const value = Number(f.amount);
    if (!(value > 0)) return setErr('Please type the amount you sent.');
    setBusy(true); setErr('');
    const fields = { amount: value, sent_on: f.sent_on, reference: f.reference.trim() || null };
    try {
      await reportPayment(student.user_id, flight ? { ...fields, flight_id: flight.id } : fields);
      setF({ amount: amount ?? '', sent_on: today(), reference: '' });
      await onDone(fields);
    } catch (ex) { setErr(`Could not save: ${ex?.message || 'unknown problem'}`); }
    setBusy(false);
  };
  return (
    <form className="tp-card pay-form" onSubmit={submit}>
      <h2>I have sent an e-Transfer</h2>
      <div className="lb-grid">
        <label>Amount sent (CAD)
          <input type="number" inputMode="decimal" min="0" step="0.01" value={f.amount} onChange={set('amount')} placeholder="0.00" readOnly={amount != null} required />
        </label>
        <label>Date you sent it<input type="date" value={f.sent_on} max={today()} onChange={set('sent_on')} required /></label>
        <label>Confirmation number <small>(optional)</small><input value={f.reference} onChange={set('reference')} placeholder="from your bank" /></label>
      </div>
      {err && <p className="tp-err">{err}</p>}
      <div className="tp-actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : flight ? 'I have paid, tell the instructor' : 'Tell the school'}</button>
        {onSkip && <button type="button" className="btn btn-ghost" onClick={onSkip} disabled={busy}>Pay later</button>}
      </div>
    </form>
  );
}

/** Shown right after a student sends a log: pay for that trip, then the instructor checks both. */
export function PayStep({ student, flight, amount, kind, onDone, onSkip }) {
  return (
    <>
      <section className="tp-card pay-due">
        <Icon name="wallet" size={30} />
        <div>
          <small>Your flight is sent. Now pay for this trip.</small>
          <strong>{money(amount)}</strong>
          <span>{kind} trip on {dateText(flight.flown_on)}{flight.aircraft ? ` · ${flight.aircraft}` : ''}</span>
        </div>
      </section>
      <HowToPay />
      <ReportForm student={student} flight={flight} amount={amount} onDone={onDone} onSkip={onSkip} />
      <p className="sc-hint">The instructor checks your flight and your payment together. Both show as done once he approves.</p>
    </>
  );
}

/** Payments: the student reports an e-Transfer, the team confirms it. */
export default function Payments({ student, viewer, rows, reload, error, flights }) {
  const bill = allocate(flights || [], rows || []);
  const flightById = Object.fromEntries((flights || []).map((f) => [f.id, f]));
  const [notice, setNotice] = useState(null);
  const [err, setErr] = useState('');
  const received = (rows || []).filter((p) => p.status === 'confirmed').reduce((a, p) => a + Number(p.amount), 0);

  const reported = async (p) => {
    await reload();
    const text = `Hi, ${student.full_name} (${student.student_id}) sent an e-Transfer of ${money(p.amount)} on ${dateText(p.sent_on)}${p.reference ? `, confirmation ${p.reference}` : ''}. Please check and confirm it here: ${portalUrl()}`;
    setNotice({ title: 'Sent. The school will check and confirm it.', text, to: signoff.whatsapp, mail: signoff.email });
  };
  const act = (fn, after) => async () => {
    setErr('');
    try { await fn(); await reload(); if (after) setNotice(after); } catch (ex) { if (ex.message) setErr(ex.message); }
  };
  const first = student.full_name.split(' ')[0];

  const confirm = (p) => act(async () => {
    const saved = window.localStorage.getItem('instructorName') || '';
    const name = window.prompt('Your name, to confirm that the money arrived:', saved);
    if (name === null) throw new Error('');
    if (!name.trim()) throw new Error('Please type your name to confirm.');
    window.localStorage.setItem('instructorName', name.trim());
    await confirmPayment(p.id, name.trim());
  }, {
    title: `Confirmed. Let ${first} know.`,
    text: `Hi ${first}, we received your e-Transfer of ${money(p.amount)}. Thank you! Your payments page is updated: ${portalUrl()}`,
    to: student.whatsapp,
  });
  const decline = (p) => act(async () => {
    const note = window.prompt('Why not? For example "nothing has arrived yet". The student will see this.');
    if (note === null) throw new Error('');
    if (!note.trim()) throw new Error('Please write a short reason.');
    await declinePayment(p.id, note.trim());
  }, null);

  return (
    <>
      {!viewer.isStaff && <HowToPay />}
      {!viewer.isStaff && <ReportForm student={student} onDone={reported} />}
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}

      <section className="tp-card sc-block pay-sum">
        <h2>{viewer.isStaff ? 'Account' : 'Your account'}</h2>
        <ul className="pay-sum__tiles">
          <li><small>Flights so far</small><strong>{money(bill.charges)}</strong></li>
          <li><small>Payments received</small><strong className="ok">{money(bill.received)}</strong></li>
          <li><small>{bill.balance < 0 ? 'Credit' : 'Still to pay'}</small><strong className={bill.balance > 0 ? 'owe' : 'ok'}>{money(Math.abs(bill.balance))}</strong></li>
        </ul>
        <p className="sc-hint">Each trip is priced in the logbook: a dual trip and a solo trip each have one price. A payment made for a trip pays that trip. Other confirmed money pays the oldest trips first.</p>
      </section>

      <section className="tp-card sc-block">
        <div className="sc-block__head"><h2>Payments</h2><span className="pay-total">Received: <b>{money(received)}</b></span></div>
        {(err || error) && <p className="tp-err">{err || error}</p>}
        {!rows ? <p className="sc-hint">Loading…</p> : rows.length === 0 ? <p className="sc-hint">No payments yet.</p> : (
          <ul className="pay-list">
            {rows.map((p) => {
              const [tone, icon, label] = BADGES[p.status];
              const trip = p.flight_id ? flightById[p.flight_id] : null;
              return (
                <li key={p.id} className={`pay-item pay-item--${p.status}`}>
                  <div className="pay-item__main">
                    <strong>{money(p.amount)}</strong>
                    <span>Sent {dateText(p.sent_on)}{p.reference ? ` · Confirmation ${p.reference}` : ''}</span>
                    {trip && <span>For the trip on {dateText(trip.flown_on)}{trip.aircraft ? ` · ${trip.aircraft}` : ''}</span>}
                    <p className={`lb-badge lb-badge--${tone}`}><Icon name={icon} size={16} />{label}</p>
                    {p.status === 'confirmed' && <span className="pay-item__by">Confirmed by {p.confirmed_by}</span>}
                    {p.status === 'declined' && p.team_note && <span className="pay-item__by">{p.team_note}</span>}
                  </div>
                  <div className="pay-item__btns">
                    {viewer.isStaff && p.status !== 'confirmed' && <button className="good" onClick={confirm(p)}>Money received</button>}
                    {viewer.isStaff && p.status === 'pending' && <button className="danger" onClick={decline(p)}>Not received</button>}
                    {!viewer.isStaff && p.status === 'pending' && <button className="danger" onClick={act(() => deletePayment(p.id))}>Remove</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
