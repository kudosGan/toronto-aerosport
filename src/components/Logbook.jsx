import { useCallback, useEffect, useState } from 'react';
import { fetchFlights, saveFlight, deleteFlight, setSignOff, summarize, today } from '../lib/students';
import Icon from './Icon';
import './Logbook.css';

export const dateText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });

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

/** The tiles with icons: totals for every kind of flying */
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

function FlightForm({ initial, studentUserId, onSaved, onCancel }) {
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
    };
    setBusy(true); setErr('');
    try { await saveFlight(studentUserId, fields, initial?.id); onSaved(); }
    catch (ex) { setErr(`Could not save: ${ex?.message || 'unknown problem'}`); setBusy(false); }
  };

  const hours = (k, label, step = '0.1') => (
    <label key={k}>{label}<input type="number" inputMode="decimal" min="0" step={step} value={f[k]} onChange={set(k)} placeholder="0" /></label>
  );

  return (
    <form className="tp-card lb-form" onSubmit={submit}>
      <h2>{editing ? 'Edit flight' : 'Add a flight'}</h2>

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

      {err && <p className="tp-err">{err}</p>}
      <div className="tp-actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add to logbook'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

function FlightCard({ f, canEdit, isStaff, onEdit, onChanged, onError }) {
  const [confirm, setConfirm] = useState(false);
  const run = (fn) => async () => { try { await fn(); onChanged(); } catch (ex) { onError(ex.message); } };
  const chips = [
    ['Dual', f.dual_hours], ['Solo', f.solo_hours], ['PIC', f.pic_hours], ['Cross-country', f.cross_country_hours],
    ['Night', f.night_hours], ['IFR', f.ifr_hours], ['Simulator', f.simulator_hours],
  ].filter(([, v]) => Number(v) > 0);
  const route = [f.from_airport, f.to_airport].filter(Boolean).join(' → ');

  const sign = run(async () => {
    const name = window.prompt('Instructor name to sign this entry:', f.instructor || '');
    if (name === null) throw new Error('');
    if (!name.trim()) throw new Error('Please type your name to sign.');
    await setSignOff(f.id, name.trim());
  });

  return (
    <li className="tp-card lb-card">
      <div className="lb-card__top">
        <div>
          <strong>{dateText(f.flown_on)}{f.departed_at ? ` · ${f.departed_at.slice(0, 5)}` : ''}</strong>
          <span>{[f.flight_number && `Flight ${f.flight_number}`, f.aircraft, f.registration].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="lb-card__total"><b>{f.total_hours}</b> h{f.signed_off && <em>Signed</em>}</div>
      </div>
      {route && <p className="lb-card__route"><Icon name="plane" size={18} />{route}</p>}
      {chips.length > 0 && <ul className="lb-chips">{chips.map(([k, v]) => <li key={k}>{k} <b>{v}</b></li>)}</ul>}
      <p className="lb-card__meta">
        {(f.takeoffs > 0 || f.landings > 0) && <span><Icon name="takeoff" size={18} />{f.takeoffs} take-offs · {f.landings} landings</span>}
        {f.weather && <span><Icon name="cloud" size={18} />{f.weather}</span>}
        {f.instructor && <span><Icon name="user" size={18} />{f.instructor}</span>}
      </p>
      {f.notes && <p className="lb-card__notes">{f.notes}</p>}
      {f.signed_off && <p className="lb-card__signed"><Icon name="check" size={18} />Signed by {f.signed_by}{f.signed_at ? ` on ${dateText(f.signed_at.slice(0, 10))}` : ''}</p>}
      {(canEdit || isStaff) && (
        <div className="lb-card__btns">
          {isStaff && (f.signed_off
            ? <button onClick={run(() => setSignOff(f.id, null))}>Remove signature</button>
            : <button className="good" onClick={sign}>Sign off</button>)}
          {canEdit && <button onClick={() => onEdit(f)}>Edit</button>}
          {canEdit && (confirm
            ? <button className="danger" onClick={run(() => deleteFlight(f.id))}>Yes, delete</button>
            : <button className="danger" onClick={() => setConfirm(true)}>Delete</button>)}
        </div>
      )}
    </li>
  );
}

/** The logbook: list of flights with add, edit, delete and (for the team) sign-off. */
export default function Logbook({ studentUserId, flights, reload, viewer }) {
  const [editing, setEditing] = useState(null); // null | {} (new) | flight
  const [err, setErr] = useState('');
  const canEdit = (f) => viewer.isStaff || (!f.signed_off && f.entered_by === viewer.id);
  const done = () => { setEditing(null); setErr(''); reload(); };

  if (editing) return <FlightForm initial={editing} studentUserId={studentUserId} onSaved={done} onCancel={() => setEditing(null)} />;
  return (
    <>
      <div className="lb-head">
        <h2>Logbook</h2>
        <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add a flight</button>
      </div>
      {err && <p className="tp-err">{err}</p>}
      {!flights ? <p className="lb-empty">Loading…</p> : flights.length === 0 ? (
        <div className="tp-card lb-empty"><Icon name="book" size={44} /><p>No flights are logged yet. Add your first one.</p></div>
      ) : (
        <ul className="lb-list">
          {flights.map((f) => (
            <FlightCard key={f.id} f={f} canEdit={canEdit(f)} isStaff={viewer.isStaff} onEdit={setEditing}
              onChanged={() => { setErr(''); reload(); }} onError={(m) => m && setErr(m)} />
          ))}
        </ul>
      )}
    </>
  );
}
