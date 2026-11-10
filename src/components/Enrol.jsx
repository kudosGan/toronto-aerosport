import { useState } from 'react';
import { enrolStudent, waLink } from '../lib/students';
import { signoff } from '../data/siteData';
import Icon from './Icon';
import './Profile.css';

const empty = {
  first_name: '', last_name: '', date_of_birth: '', citizen_of: '', aircraft_category: '',
  whatsapp: '', email: '', emergency_name: '', emergency_phone: '', emergency_relationship: '', website: '',
};

function Done({ result, onSignIn }) {
  const first = result.name.split(' ')[0];
  const nudge = `Hi, this is ${result.name}. I enrolled as a student at Toronto Aerosport. Please add my permit details and send my Student ID and temporary password to this WhatsApp number.`;
  return (
    <section className="tp-card pf-done">
      <Icon name="check" size={40} />
      <h2>Thank you, {first}. You are enrolled.</h2>
      <p>Your instructor now adds your student pilot permit details and makes your <b>Student ID</b>. The school then sends your Student ID and a <b>temporary password</b> to your WhatsApp number <b>+{result.whatsapp}</b>. The temporary password works for <b>48 hours</b> from when it is sent. When you sign in with it, you choose your own new password.</p>
      <a className="btn btn-primary" href={waLink(signoff.whatsapp, nudge)} target="_blank" rel="noreferrer">Message the school on WhatsApp</a>
      <p className="sc-hint">Tap the button to let the school know now, so you get your Student ID sooner. Your lessons and logbook open once the school approves your enrolment.</p>
      <button className="btn btn-ghost" onClick={onSignIn}>Go to sign in</button>
    </section>
  );
}

/** The enrolment form: only what the student knows. The instructor adds the permit details afterwards. */
export default function Enrol({ onSignIn }) {
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const name = `${f.first_name.trim()} ${f.last_name.trim()}`.trim();

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.website) { setResult({ name, whatsapp: f.whatsapp.replace(/\D/g, '') }); return; } // hidden field: only automatic form-fillers complete it
    setBusy(true);
    try { setResult(await enrolStudent({ ...f, full_name: name })); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  if (result) return <Done result={result} onSignIn={onSignIn} />;

  const box = (k, label, { type = 'text', help = '', wide = false, ...rest } = {}) => (
    <label className={wide ? 'pf-wide' : ''}><span className="pf-cap">{label}</span>
      <input type={type} inputMode={type === 'tel' ? 'tel' : undefined} value={f[k]} onChange={set(k)} maxLength={160} required {...rest} />
      <small>{help || ' '}</small>
    </label>
  );

  return (
    <form className="pf-enrol" onSubmit={submit}>
      <section className="tp-card pf-form">
        <h2>Enrol as a student</h2>
        <p className="sc-hint">Fill in this form once. Your instructor then adds your student pilot permit details and makes your Student ID. The school sends it to your WhatsApp with a temporary password that works for 48 hours.</p>
        <div className="pf-grid">
          {box('first_name', 'First name', { autoComplete: 'given-name', help: 'As on your student pilot permit.' })}
          {box('last_name', 'Last name', { autoComplete: 'family-name' })}
          {box('date_of_birth', 'Date of birth', { type: 'date', max: new Date().toLocaleDateString('en-CA') })}
          {box('citizen_of', 'Citizen of (Citoyenneté)')}
          {box('aircraft_category', 'Category of aircraft (Catégorie d’aéronef)', { help: 'For example Ultralight aeroplane.', wide: true })}
        </div>
      </section>

      <section className="tp-card pf-form">
        <h2>Contact</h2>
        <div className="pf-grid">
          {box('whatsapp', 'Phone number (the one you use for WhatsApp)', { type: 'tel', autoComplete: 'tel', help: 'With the country code, for example 1 647 555 0100. We send your Student ID and password here.' })}
          {box('email', 'Email address', { type: 'email', autoComplete: 'email' })}
        </div>
      </section>

      <section className="tp-card pf-form">
        <h2>Emergency contact</h2>
        <div className="pf-grid">
          {box('emergency_name', 'Name')}
          {box('emergency_phone', 'Phone number', { type: 'tel' })}
          {box('emergency_relationship', 'Relationship to you', { help: 'For example spouse or parent.', wide: true })}
        </div>
        <label className="pf-hp" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
        {err && <p className="tp-err" role="alert">{err}</p>}
        <div className="tp-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Enrolling…' : 'Enrol'}</button></div>
      </section>
    </form>
  );
}
