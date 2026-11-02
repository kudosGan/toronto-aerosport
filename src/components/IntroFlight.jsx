import { useState } from 'react';
import { submitEnquiry } from '../lib/enquiries';
import './IntroFlight.css';

const empty = { name: '', email: '', phone: '', heard_from: '', message: '', website: '' };
const HEARD = ['Instagram', 'Facebook', 'Google search', 'A friend or family', 'Saw an aircraft or flyer', 'Other'];

export default function IntroFlight() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.name.trim()) err.name = 'Please add your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Please add a valid email.';
    setErrors(err);
    if (Object.keys(err).length) return;
    if (form.website) { setSent(true); return; } // hidden field: only automatic form-fillers complete it
    setBusy(true);
    try { await submitEnquiry(form); setSent(true); }
    catch { setErrors({ send: 'Sorry, we could not send your request. Please try again, or call us.' }); }
    setBusy(false);
  };

  return (
    <section className="section intro" id="intro-flight">
      <div className="container intro__inner">
        <div className="intro__copy">
          <span className="eyebrow">Introductory flight</span>
          <h2>Take to the sky with us.</h2>
          <p>Not sure yet? Try one flight. Tell us who you are and we will call you to set a date.</p>
          <ul>
            <li>✔ No flying experience needed</li>
            <li>✔ Fly with a friendly instructor</li>
            <li>✔ North-east of Toronto</li>
          </ul>
        </div>

        {sent ? (
          <div className="intro__card intro__thanks" role="status">
            <span aria-hidden="true">🎉</span>
            <h3>Thank you, {form.name.split(' ')[0]}!</h3>
            <p>We got your request. We will be in touch soon.</p>
          </div>
        ) : (
          <form className="intro__card" onSubmit={submit} noValidate>
            <label>Your name
              <input value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} />
              {errors.name && <em>{errors.name}</em>}
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} />
              {errors.email && <em>{errors.email}</em>}
            </label>
            <label>Phone or WhatsApp <small>(optional, but it helps us reach you fast)</small>
              <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label>How did you hear about us? <small>(optional)</small>
              <select value={form.heard_from} onChange={set('heard_from')}>
                <option value="">Choose one</option>
                {HEARD.map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
            <label>Anything you would like us to know? <small>(optional)</small>
              <textarea rows="3" value={form.message} onChange={set('message')} maxLength={1000} placeholder="For example the best days, or a friend joining you" />
            </label>
            <label className="intro__hp" aria-hidden="true">Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </label>
            {errors.send && <em role="alert">{errors.send}</em>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Request my flight'}</button>
          </form>
        )}
      </div>
    </section>
  );
}
