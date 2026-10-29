import { useState } from 'react';
import './IntroFlight.css';

const empty = { name: '', email: '', phone: '' };

export default function IntroFlight() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!form.name.trim()) err.name = 'Please add your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Please add a valid email.';
    setErrors(err);
    if (Object.keys(err).length) return;
    // TODO: connect to your email or backend service (for example Formspree or EmailJS)
    console.log('Lead', form);
    setSent(true);
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
            <label>Phone <small>(optional)</small>
              <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <button className="btn btn-primary" type="submit">Request my flight</button>
          </form>
        )}
      </div>
    </section>
  );
}
