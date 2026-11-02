import { useEffect, useState } from 'react';
import { isDemo } from '../lib/listings';
import {
  signInStudent, signOutStudent, getRole, fetchStudents, createStudent, updateStudent,
  summarize, isOpen, today, MINIMUMS, MILESTONES,
} from '../lib/students';
import { groundTopics } from '../data/learnData';
import { contact } from '../data/siteData';
import Logo from './Logo';
import Icon from './Icon';
import Logbook, { StatTiles, useFlights, dateText } from './Logbook';
import './TeamPage.css';
import './StudentCorner.css';

function Login({ onDone }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await signInStudent(id, password); await onDone(); } catch { setErr('Student ID or password is wrong.'); }
    setBusy(false);
  };
  return (
    <form className="tp-card tp-login" onSubmit={submit}>
      <h2>Student sign in</h2>
      <p className="sc-hint">Use the student ID and password the school gave you.</p>
      <label>Student ID<input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      {err && <p className="tp-err">{err}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

function Bar({ label, value, min }) {
  const done = value >= min;
  return (
    <div className="sc-bar">
      <div className="sc-bar__top"><span>{label}</span><strong>{value} of {min}{done ? ' ✓' : ''}</strong></div>
      <div className="sc-bar__track"><i className={done ? 'done' : ''} style={{ width: `${Math.min(100, (value / min) * 100)}%` }} /></div>
    </div>
  );
}

const TOPIC_ICONS = ['cog', 'plane', 'shield', 'doc', 'map', 'cloud', 'compass', 'radio', 'user', 'target'];

function GroundSchool() {
  return (
    <>
      <div className="sc-banner-note">
        <Icon name="cap" size={34} />
        <p><strong>Your online ground school.</strong> Lessons appear here as the school adds them. You can open them while your student access is active.</p>
      </div>
      <ul className="sc-lessons">
        {groundTopics.map((t, i) => (
          <li key={t}>
            <span className="sc-lessons__icon"><Icon name={TOPIC_ICONS[i % TOPIC_ICONS.length]} size={26} /></span>
            <div><strong>{t}</strong><small>Lesson {i + 1}</small></div>
            <em><Icon name="lock" size={15} />Coming soon</em>
          </li>
        ))}
      </ul>
    </>
  );
}

function Overview({ flights, goLogbook }) {
  const t = summarize(flights || []);
  const recent = (flights || []).slice(0, 3);
  return (
    <>
      <StatTiles flights={flights} />
      <section className="tp-card sc-block">
        <h2>Your progress to the Ultralight Permit</h2>
        <Bar label="Total flying time (hours)" value={t.total} min={MINIMUMS.total} />
        <Bar label="Solo flying time (hours)" value={t.solo} min={MINIMUMS.solo} />
        <Bar label="Take-offs and landings" value={t.landings} min={MINIMUMS.landings} />
      </section>
      <section className="tp-card sc-block">
        <h2>Your flying time on the way to each licence</h2>
        {MILESTONES.map((m) => <Bar key={m.name} label={m.name} value={t.total} min={m.hours} />)}
        <p className="sc-hint">These are the least total hours for each. Real hours vary by person. Check with Transport Canada.</p>
      </section>
      <section className="tp-card sc-block">
        <div className="sc-block__head"><h2>Latest flights</h2><button className="sc-link" onClick={goLogbook}>Open logbook →</button></div>
        {!flights ? <p className="sc-hint">Loading…</p> : recent.length === 0 ? <p className="sc-hint">No flights are logged yet.</p> : (
          <ul className="sc-log">
            {recent.map((f) => (
              <li key={f.id}>
                <div><strong>{dateText(f.flown_on)}</strong><span>{[f.aircraft, f.registration, [f.from_airport, f.to_airport].filter(Boolean).join(' → ')].filter(Boolean).join(' · ')}</span></div>
                <div className="sc-log__hrs">{f.total_hours} h{f.signed_off && <em>Signed</em>}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const TABS = [['overview', 'home', 'Overview'], ['logbook', 'book', 'Logbook'], ['school', 'cap', 'Ground school']];

function Tabs({ tab, setTab, skip = [] }) {
  return (
    <div className="sc-tabs" role="tablist">
      {TABS.filter(([k]) => !skip.includes(k)).map(([k, icon, label]) => (
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={icon} size={20} />{label}</button>
      ))}
    </div>
  );
}

function StudentView({ student, viewer, onSignOut }) {
  const open = isOpen(student);
  const [tab, setTab] = useState('overview');
  const [flights, reload, error] = useFlights(student.user_id);

  return (
    <>
      <header className="sc-banner">
        <div className="sc-banner__who">
          <span className="sc-banner__avatar"><Icon name="plane" size={34} /></span>
          <div>
            <small>Student Corner</small>
            <h1>Hello, {student.full_name.split(' ')[0]}</h1>
            <p><span>ID {student.student_id}</span><span>{open ? `Access until ${dateText(student.access_ends)}` : 'Access ended'}</span></p>
          </div>
        </div>
        <button className="sc-banner__out" onClick={onSignOut}>Sign out</button>
      </header>

      {!open ? (
        <div className="tp-card sc-ended">
          <h2>Your access has ended</h2>
          <p>Access ended on {dateText(student.access_ends)}{student.active ? '' : ' (switched off by the school)'}. To get it back, call us on <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a>.</p>
        </div>
      ) : (
        <>
          <Tabs tab={tab} setTab={setTab} />
          {error && <p className="tp-err">{error}</p>}
          {tab === 'overview' && <Overview flights={flights} goLogbook={() => setTab('logbook')} />}
          {tab === 'logbook' && <Logbook studentUserId={student.user_id} flights={flights} reload={reload} viewer={viewer} />}
          {tab === 'school' && <GroundSchool />}
        </>
      )}
    </>
  );
}

/** The team looks at one student: totals and the logbook, with sign-off. */
function StaffStudent({ student, viewer, onBack }) {
  const [tab, setTab] = useState('logbook');
  const [flights, reload, error] = useFlights(student.user_id);
  return (
    <>
      <button className="sc-link sc-back" onClick={onBack}><Icon name="back" size={18} />All students</button>
      <header className="sc-banner">
        <div className="sc-banner__who">
          <span className="sc-banner__avatar"><Icon name="user" size={34} /></span>
          <div>
            <small>Student</small>
            <h1>{student.full_name}</h1>
            <p><span>ID {student.student_id}</span><span>{isOpen(student) ? `Access until ${dateText(student.access_ends)}` : 'Access ended'}</span></p>
          </div>
        </div>
      </header>
      <Tabs tab={tab} setTab={setTab} skip={['school']} />
      {error && <p className="tp-err">{error}</p>}
      {tab === 'overview' && <Overview flights={flights} goLogbook={() => setTab('logbook')} />}
      {tab === 'logbook' && <Logbook studentUserId={student.user_id} flights={flights} reload={reload} viewer={viewer} />}
    </>
  );
}

function StaffView({ viewer, onSignOut }) {
  const [students, setStudents] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    return { name: '', ends: d.toLocaleDateString('en-CA') };
  });
  const [ends, setEnds] = useState({}); // edited end dates by user_id
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => fetchStudents().then(setStudents).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    try {
      const name = form.name.trim();
      const s = await createStudent(name, name, form.ends); // for now the password is the student's name
      setMsg(`${s.full_name} was added. Student ID: ${s.student_id}. Password: ${name}`);
      setForm({ ...form, name: '' });
      load();
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  const change = (userId, patch, okText) => async () => {
    setErr(''); setMsg('');
    try { await updateStudent(userId, patch); setMsg(okText); load(); } catch (ex) { setErr(ex.message); }
  };

  if (selected) return <StaffStudent student={selected} viewer={viewer} onBack={() => setSelected(null)} />;

  return (
    <>
      <header className="sc-banner">
        <div className="sc-banner__who">
          <span className="sc-banner__avatar"><Icon name="users" size={34} /></span>
          <div><small>Student Corner · Team</small><h1>Students</h1></div>
        </div>
        <button className="sc-banner__out" onClick={onSignOut}>Sign out</button>
      </header>
      {msg && <p className="sc-ok" role="status">{msg}</p>}
      {err && <p className="tp-err">{err}</p>}

      <form className="tp-card tp-form sc-add" onSubmit={add}>
        <h2>Add a student</h2>
        <p className="sc-hint">The student ID is made for you (TAS-001, TAS-002 and so on). For now the password is the student's full name, typed exactly the same.</p>
        <div className="tp-row">
          <label>Full name<input value={form.name} onChange={set('name')} minLength={6} required /></label>
          <label>Access ends on<input type="date" value={form.ends} min={today()} onChange={set('ends')} required /></label>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add student'}</button>
      </form>

      <h2 className="sc-list-title">Your students</h2>
      {!students ? <p className="sc-hint">Loading…</p> : students.length === 0 ? (
        <div className="tp-card tp-empty"><p>No students yet. Add the first one above.</p></div>
      ) : (
        <ul className="tp-list">
          {students.map((s) => {
            const open = isOpen(s);
            const value = ends[s.user_id] ?? s.access_ends;
            return (
              <li key={s.user_id} className="tp-card sc-student">
                <div className="sc-student__info">
                  <strong>{s.full_name}</strong>
                  <span>ID {s.student_id}</span>
                  <em className={open ? 'on' : 'off'}>{open ? 'Active' : s.active ? 'Expired' : 'Access ended'}</em>
                </div>
                <div className="sc-student__tools">
                  <button className="primary" onClick={() => setSelected(s)}><Icon name="book" size={18} />Logbook</button>
                  <input type="date" value={value} onChange={(e) => setEnds({ ...ends, [s.user_id]: e.target.value })} aria-label={`Access end date for ${s.full_name}`} />
                  <button disabled={value === s.access_ends} onClick={change(s.user_id, { access_ends: value }, `New end date saved for ${s.full_name}.`)}>Save date</button>
                  {s.active
                    ? <button className="danger" onClick={change(s.user_id, { active: false }, `${s.full_name} no longer has access.`)}>End access</button>
                    : <button onClick={change(s.user_id, { active: true }, `${s.full_name} has access again.`)}>Restore access</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function StudentCorner({ theme, onToggleTheme }) {
  const [state, setState] = useState({ loading: true });
  const load = async () => {
    try { setState({ loading: false, ...(await getRole()) }); }
    catch (e) { setState({ loading: false, error: e.message }); }
  };
  useEffect(() => { if (isDemo) setState({ loading: false }); else load(); }, []);
  useEffect(() => {
    const before = document.title;
    document.title = 'Student Corner | Toronto Aerosport';
    return () => { document.title = before; };
  }, []);
  const signOut = async () => { await signOutStudent(); setState({ loading: false }); };
  const viewer = { id: state.user?.id, isStaff: state.role === 'staff' };

  let body;
  if (isDemo) body = <p className="tp-note">The Student Corner needs the online database. It is not connected on this copy of the site.</p>;
  else if (state.loading) body = <p>Loading…</p>;
  else if (state.error === 'SETUP') body = <p className="tp-note">The Student Corner database is not set up yet. The team needs to run <code>supabase/student-corner.sql</code> in Supabase.</p>;
  else if (state.error) body = <p className="tp-err">Something went wrong: {state.error}</p>;
  else if (!state.role) body = <Login onDone={load} />;
  else if (state.role === 'staff') body = <StaffView viewer={viewer} onSignOut={signOut} />;
  else if (state.role === 'student') body = <StudentView student={state.student} viewer={viewer} onSignOut={signOut} />;
  else body = (
    <div className="tp-card sc-ended">
      <h2>This account is not set up yet</h2>
      <p>Please call the school on <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a>.</p>
      <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
    </div>
  );

  return (
    <div className="portal">
      <header className="portal__bar">
        <div className="container portal__inner">
          <a href="#student-corner" className="portal__brand" aria-label="Student Corner home"><Logo /><span>Student Corner</span></a>
          <div className="portal__right">
            <a href="#top" className="portal__back"><Icon name="back" size={18} />Toronto Aerosport website</a>
            <button className="navbar__icon" onClick={onToggleTheme} aria-label="Switch day and night colours"><Icon name={theme === 'night' ? 'sun' : 'moon'} size={20} /></button>
          </div>
        </div>
      </header>
      <section className="tp sc"><div className="container">{body}</div></section>
      <footer className="portal__foot">
        <div className="container">
          <span>© {new Date().getFullYear()} Toronto Aerosport Inc. Student portal.</span>
          <span>Need help? Call <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a></span>
        </div>
      </footer>
    </div>
  );
}
