import { useState } from 'react';
import { updateMyDetails, fetchMyStudent, staffSetPermit, changeMyPassword, today } from '../lib/students';
import { makeStudentId } from '../lib/studentId';
import { dateText } from '../lib/format';
import Icon from './Icon';
import './Profile.css';

// [key, label, input type, hint, full width]
const ABOUT = [
  ['full_name', 'Name (first and last)', 'text', 'Change it only if your name changed or has a spelling mistake.', true],
  ['date_of_birth', 'Date of birth', 'date', ''],
  ['citizen_of', 'Citizen of (Citoyenneté)', 'text', ''],
  ['aircraft_category', 'Category of aircraft (Catégorie d’aéronef)', 'text', 'For example Ultralight aeroplane.'],
];
const CONTACT = [
  ['whatsapp', 'WhatsApp number', 'tel', 'With the country code, for example 1 647 555 0100.'],
  ['phone', 'Phone number', 'tel', ''],
  ['contact_email', 'Email address', 'email', ''],
];
const EMERGENCY = [
  ['emergency_name', 'Emergency contact name', 'text', 'Someone we can call in an emergency.'],
  ['emergency_phone', 'Emergency contact phone', 'tel', ''],
  ['emergency_relationship', 'Relationship to you', 'text', 'For example spouse or parent.'],
];
// The boxes on the Transport Canada Student Pilot Permit. The school fills these in.
const PERMIT = [
  ['permit_number', 'Permit number (No.)', 'text', 'The number printed on the permit.'],
  ['file_number', 'File number (N° de dossier)', 'text', 'On the permit it starts with 5802.'],
  ['permit_issued_on', 'Issued on (Délivrance le)', 'date', ''],
  ['permit_valid_to', 'Valid to (Valable jusqu’au)', 'date', ''],
  ['permit_issued_at', 'Issued at (Délivré à) – flight training unit', 'text', ''],
  ['authorized_person', 'Name of authorized person', 'text', 'The person who signed the permit.'],
];
// Nothing about the student is locked. Only the permit details below are written by the school.

const ALL_STUDENT = [...ABOUT, ...CONTACT, ...EMERGENCY];
const pick = (s, fields) => Object.fromEntries(fields.map(([k]) => [k, s[k] || '']));

function PermitStatus({ validTo }) {
  if (!validTo) return null;
  const days = Math.round((new Date(`${validTo}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
  if (days < 0) return <p className="pf-status pf-status--bad"><Icon name="clock" size={18} />This permit ended on {dateText(validTo)}. Ask the school about renewing it.</p>;
  if (days <= 30) return <p className="pf-status pf-status--soon"><Icon name="clock" size={18} />This permit ends in {days} day{days === 1 ? '' : 's'}, on {dateText(validTo)}.</p>;
  return <p className="pf-status pf-status--ok"><Icon name="check" size={18} />This permit is valid until {dateText(validTo)}.</p>;
}

function Box({ field, value, onChange, disabled }) {
  const [k, label, type, help, wide] = field;
  return (
    <label className={wide ? 'pf-wide' : ''}><span className="pf-cap">{label}</span>
      <input type={type} inputMode={type === 'tel' ? 'tel' : undefined} value={value} onChange={onChange(k)} maxLength={160} disabled={disabled} />
      {help && <small>{help}</small>}
    </label>
  );
}

/** The student's own details. Everything on it can be changed by the student. Only the permit details are written by the school. */
function MyDetails({ student, onSaved }) {
  const saved = pick(student, ALL_STUDENT);
  const [f, setF] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const changed = ALL_STUDENT.some(([k]) => (f[k] || '') !== saved[k]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMsg(''); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    try {
      await updateMyDetails(f);
      // read it back, so a box that was not really saved is never reported as saved
      const row = await fetchMyStudent();
      const norm = {
        whatsapp: (v) => String(v || '').replace(/\D/g, ''),
        contact_email: (v) => String(v || '').trim().toLowerCase(),
        full_name: (v) => String(v || '').trim().replace(/\s+/g, ' '),
      };
      const missed = ALL_STUDENT.filter(([k]) => (norm[k] ? norm[k](f[k]) : String(f[k] || '').trim()) !== String(row?.[k] || ''));
      if (missed.length) setErr(`These could not be saved: ${missed.map(([, label]) => label).join(', ')}. Please try again or ask the school.`);
      else setMsg('Saved. Your details are updated.');
      if (onSaved) await onSaved();
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  const group = (fields) => <div className="pf-grid pf-stack">{fields.map((fl) => <Box key={fl[0]} field={fl} value={f[fl[0]]} onChange={set} />)}</div>;

  return (
    <form className="tp-card pf-form" onSubmit={submit}>
      <h2>Your details</h2>
      {group(ABOUT)}
      <h3 className="pf-sub">Contact</h3>
      {group(CONTACT)}
      <h3 className="pf-sub">Emergency contact</h3>
      {group(EMERGENCY)}
      {err && <p className="tp-err">{err}</p>}
      {msg && <p className="pf-ok"><Icon name="check" size={18} />{msg}</p>}
      <div className="tp-actions">
        <button className="btn btn-primary" disabled={busy || !changed}>{busy ? 'Saving…' : 'Save changes'}</button>
        {changed && <button type="button" className="btn btn-ghost" onClick={() => setF(saved)} disabled={busy}>Undo</button>}
      </div>
    </form>
  );
}

/** What the school added from the permit. The student can only read it. */
function PermitReadOnly({ student }) {
  const filled = PERMIT.some(([k]) => student[k]);
  return (
    <section className="tp-card pf-form">
      <h2>Student pilot permit</h2>
      <p className="sc-hint">{filled ? 'The school fills these in from your Transport Canada Student Pilot Permit. You cannot change them. Passenger carrying is prohibited on a student pilot permit.' : 'The school adds these after checking your permit. They will appear here.'}</p>
      <PermitStatus validTo={student.permit_valid_to} />
      <dl className="pf-dl pf-rows">
        {PERMIT.map(([k, label, type]) => (
          <div key={k}><dt>{label}</dt><dd>{student[k] ? (type === 'date' ? dateText(student[k]) : student[k]) : <span className="sc-hint">Not added yet</span>}</dd></div>
        ))}
      </dl>
    </section>
  );
}

/** The team adds the permit details. Saving makes the Student ID and locks the student's details. */
export function PermitForm({ student, onSaved, compact }) {
  const saved = pick(student, PERMIT);
  const [f, setF] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMsg(''); };
  const newId = makeStudentId(student.full_name, f.permit_number);
  const hasId = !String(student.student_id).startsWith('PENDING-');

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (hasId && newId && newId !== student.student_id
      && !window.confirm(`The Student ID will change from ${student.student_id} to ${newId}. The student must sign in with the new one. Continue?`)) return;
    setBusy(true);
    try {
      const r = await staffSetPermit(student.user_id, f);
      setMsg(`Saved. The Student ID is ${r.student_id}.`);
      if (onSaved) await onSaved();
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  return (
    <form className={compact ? 'pf-form pf-compact' : 'tp-card pf-form'} onSubmit={submit}>
      {!compact && <h2>Student pilot permit</h2>}
      <p className="sc-hint">Copy these from the student's Transport Canada permit. Saving makes the Student ID and locks the student's details, so they cannot change them.</p>
      <div className="pf-grid pf-stack">{PERMIT.map((fl) => <Box key={fl[0]} field={fl} value={f[fl[0]]} onChange={set} />)}</div>
      <p className={`pf-idpreview ${newId ? 'on' : ''}`}>
        <Icon name="user" size={22} />
        {newId ? <>Student ID: <strong>{newId}</strong></> : 'The Student ID appears here when the permit number is typed.'}
      </p>
      {err && <p className="tp-err">{err}</p>}
      {msg && <p className="pf-ok"><Icon name="check" size={18} />{msg}</p>}
      <div className="tp-actions"><button className="btn btn-primary" disabled={busy || !f.permit_number.trim()}>{busy ? 'Saving…' : 'Save permit details and make the Student ID'}</button></div>
    </form>
  );
}

/** What the team sees about the student: their own answers, read only. */
export function StudentFacts({ student, plain }) {
  return (
    <section className={plain ? 'pf-form pf-plain' : 'tp-card pf-form'}>
      {plain ? <h3 className="pf-sub">What the student told us</h3> : <h2>What the student told us</h2>}
      <dl className="pf-dl pf-rows">
        {ALL_STUDENT.map(([k, label, type]) => (
          <div key={k}><dt>{label}</dt><dd>{student[k] ? (type === 'date' ? dateText(student[k]) : student[k]) : <span className="sc-hint">Not added</span>}</dd></div>
        ))}
      </dl>
    </section>
  );
}

/** The student's own page. The team sees the permit form and the student's answers. */
export default function Profile({ student, isStaff, onSaved }) {
  if (isStaff) {
    return (
      <>
        <PermitForm key={`${student.permit_number}-${student.student_id}`} student={student} onSaved={onSaved} />
        <StudentFacts student={student} />
      </>
    );
  }
  return (
    <>
      <MyDetails key={JSON.stringify(pick(student, ALL_STUDENT))} student={student} onSaved={onSaved} />
      <PermitReadOnly student={student} />
    </>
  );
}

/** A page of its own: the student picks a new password. */
export function PasswordPage() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    if (a.length < 6) return setErr('Please use at least 6 characters.');
    if (a !== b) return setErr('The two passwords are not the same.');
    setBusy(true);
    try { await changeMyPassword(a); setA(''); setB(''); setMsg('Your password is changed. Use the new one next time you sign in.'); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  return (
    <form className="tp-card pf-form pf-pass pf-stackform" onSubmit={submit}>
      <div className="pf-pass__head"><Icon name="lock" size={30} /><div><h2>Change your password</h2><p className="sc-hint">Pick something only you know. Do not use your name or your student ID.</p></div></div>
      <label><span className="pf-cap">New password</span><input type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" /><small>At least 6 characters.</small></label>
      <label><span className="pf-cap">Type it again</span><input type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" /></label>
      {err && <p className="tp-err">{err}</p>}
      {msg && <p className="pf-ok"><Icon name="check" size={18} />{msg}</p>}
      <div className="tp-actions"><button className="btn btn-primary" disabled={busy || !a}>{busy ? 'Saving…' : 'Change password'}</button></div>
    </form>
  );
}
