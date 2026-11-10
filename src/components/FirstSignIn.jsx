import { useState } from 'react';
import { changeMyPassword, requestTempPassword, waLink } from '../lib/students';
import { signoff } from '../data/siteData';
import { dateTimeText } from '../lib/format';
import Icon from './Icon';
import './Profile.css';

/** First sign-in with a temporary password: the student must pick their own password before anything else opens. */
export function SetNewPassword({ student, onDone }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (a.length < 6) return setErr('Please use at least 6 characters.');
    if (a !== b) return setErr('The two passwords are not the same.');
    setBusy(true);
    try { await changeMyPassword(a); await onDone(); }
    catch (ex) { setErr(ex.message); setBusy(false); }
  };
  return (
    <form className="tp-card pf-form pf-pass" onSubmit={submit}>
      <div className="pf-pass__head">
        <Icon name="lock" size={30} />
        <div>
          <h2>Choose your new password</h2>
          <p className="sc-hint">Hello {student.full_name.split(' ')[0]}. You signed in with a temporary password. Choose a password only you know. It replaces the temporary one.</p>
        </div>
      </div>
      <label><span className="pf-cap">New password</span><input type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" required /><small>At least 6 characters.</small></label>
      <label><span className="pf-cap">Confirm your new password</span><input type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" required /></label>
      {err && <p className="tp-err">{err}</p>}
      <div className="tp-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save my new password'}</button></div>
    </form>
  );
}

/** The 48 hours ran out. The student asks for a new temporary password. */
export function TempExpired({ student, onSignOut }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const ask = async () => {
    setBusy(true); setErr('');
    try { await requestTempPassword(student.student_id); setSent(true); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  return (
    <div className="tp-card pf-form pf-pass">
      <div className="pf-pass__head">
        <Icon name="clock" size={30} />
        <div>
          <h2>Your temporary password has expired</h2>
          <p className="sc-hint">It ended on {dateTimeText(student.temp_password_expires)}. Ask the school for a new one. They send it to your WhatsApp, and it works for 48 hours from then.</p>
        </div>
      </div>
      {sent && <p className="pf-ok"><Icon name="check" size={18} />The school knows. They will send a new temporary password to your WhatsApp. Then sign in again.</p>}
      {err && <p className="tp-err">{err}</p>}
      <div className="tp-actions">
        {!sent && <button className="btn btn-primary" onClick={ask} disabled={busy}>{busy ? 'Sending…' : 'Ask the school for a new temporary password'}</button>}
        {sent && <a className="btn btn-primary" href={waLink(signoff.whatsapp, `Hi, this is ${student.full_name.split(' ')[0]} (Student ID ${student.student_id}). My temporary password expired. Please send me a new one on WhatsApp.`)} target="_blank" rel="noreferrer">Message the school on WhatsApp</a>}
        <button className="btn btn-ghost" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
