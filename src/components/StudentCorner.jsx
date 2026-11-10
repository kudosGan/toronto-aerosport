import { useEffect, useState } from 'react';
import { isDemo } from '../lib/listings';
import {
  signInStudent, signInStaff, signOutStudent, getRole, fetchStudents, createStudent, updateStudent,
  summarize, isOpen, today, MINIMUMS, MILESTONES, approvedOnly, statusOf, fetchPending, fetchPendingPayments,
  requestTempPassword, tempExpired, staffResetPassword, removeEnrolment, waLink, portalUrl,
} from '../lib/students';
import { fetchEnquiries } from '../lib/enquiries';
import { groundTopics } from '../data/learnData';
import { contact, signoff } from '../data/siteData';
import Logo from './Logo';
import Icon from './Icon';
import PortalLayout from './PortalLayout';
import Profile, { PasswordPage, PermitForm, StudentFacts } from './Profile';
import Logbook, { StatTiles, useFlights } from './Logbook';
import Payments, { usePayments } from './Payments';
import Enquiries from './Enquiries';
import { money } from '../lib/billing';
import { dateText, dateTimeText } from '../lib/format';
import Enrol from './Enrol';
import { SetNewPassword, TempExpired } from './FirstSignIn';
import './TeamPage.css';
import './StudentCorner.css';

function GetTempPassword({ onBack }) {
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await requestTempPassword(who); } catch { /* the answer is always the same */ }
    setSent(true); setBusy(false);
  };
  return (
    <form className="tp-card tp-login sc-login" onSubmit={submit}>
      <h2>Get a new temporary password</h2>
      <p className="sc-hint">Use this if your temporary password has expired or has not arrived. Type your Student ID or your WhatsApp number. The school sends the new password to your WhatsApp.</p>
      <label>Student ID or WhatsApp number<input value={who} onChange={(e) => setWho(e.target.value)} autoCapitalize="none" required /></label>
      {sent && <p className="pf-ok">The school has been told. They will send a new temporary password to your WhatsApp.</p>}
      {sent && <a className="btn btn-ghost" href={waLink(signoff.whatsapp, `Hi, I need a new temporary password for the Student Corner. My Student ID or number: ${who}`)} target="_blank" rel="noreferrer">Message the school on WhatsApp</a>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Ask for a new temporary password'}</button>
      <button type="button" className="sc-link sc-login__link" onClick={onBack}>← Back to sign in</button>
    </form>
  );
}

function Login({ onDone, onForgot }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (id.includes('@')) { setErr('Students sign in with their Student ID. The school team uses "School admin login" at the top of the page.'); return; }
    setBusy(true);
    try { await signInStudent(id, password); await onDone(); } catch { setErr('Student ID or password is wrong.'); }
    setBusy(false);
  };
  return (
    <form className="tp-card tp-login sc-login" onSubmit={submit}>
      <h2>Student sign in</h2>
      <p className="sc-hint">Use the student ID and password the school gave you.</p>
      <label>Student ID<input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      {err && <p className="tp-err">{err}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <button type="button" className="sc-link sc-login__link" onClick={onForgot}>Temporary password expired? Get a new one</button>
    </form>
  );
}

/** The school team (instructors and admin) sign in here. Students cannot get in with this. */
function AdminLogin({ onDone, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await signInStaff(email, password); await onDone(); }
    catch (ex) { setErr(ex.message === 'NOT_STAFF' ? 'This login is only for the school team. Students sign in with their Student ID.' : 'Email or password is wrong.'); }
    setBusy(false);
  };
  return (
    <form className="tp-card tp-login sc-login" onSubmit={submit}>
      <h2>School admin sign in</h2>
      <p className="sc-hint">For instructors and the school team. You will see all students, new enrolments, flights to sign and payments.</p>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      {err && <p className="tp-err">{err}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <button type="button" className="sc-link sc-login__link" onClick={onBack}>← Student sign in</button>
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

const STATUS_TEXT = { waiting: 'Waiting for sign-off', approved: 'Approved', returned: 'Sent back' };

function Overview({ flights, goLogbook }) {
  const approved = approvedOnly(flights);
  const t = summarize(approved);
  const waiting = (flights || []).filter((f) => statusOf(f) === 'waiting');
  const returned = (flights || []).filter((f) => statusOf(f) === 'returned');
  const recent = (flights || []).slice(0, 3);
  return (
    <>
      {(waiting.length > 0 || returned.length > 0) && (
        <button className="sc-alert" onClick={goLogbook}>
          <Icon name="clock" size={22} />
          <span>
            {waiting.length > 0 && <>{waiting.length} flight{waiting.length > 1 ? 's' : ''} ({Math.round(waiting.reduce((a, f) => a + Number(f.total_hours), 0) * 10) / 10} h) waiting for an instructor to sign off. </>}
            {returned.length > 0 && <b>{returned.length} sent back for you to fix.</b>}
          </span>
          <em>Open logbook →</em>
        </button>
      )}
      <StatTiles flights={approved} />
      <p className="sc-hint sc-hint--tight">Only flights signed by an instructor are counted here.</p>
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
                <div className="sc-log__hrs">{f.total_hours} h<em className={`is-${statusOf(f)}`}>{STATUS_TEXT[statusOf(f)]}</em></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const signOutItem = (onClick) => ({ key: 'signout', icon: 'logout', label: 'Sign out', onClick, foot: true });

function StudentView({ student, viewer, onSignOut, onProfileChange }) {
  const open = isOpen(student);
  const waiting = student.approved === false;
  const [section, setSection] = useState(waiting ? 'profile' : 'overview');
  const [flights, reload, error] = useFlights(student.user_id);
  const [pays, reloadPays, payError] = usePayments(student.user_id);
  const toFix = (flights || []).filter((f) => statusOf(f) === 'returned').length;

  // Signed in with a temporary password: nothing opens until a new password is chosen (or, if it ran out, a new one is requested)
  if (student.must_change_password) {
    const expired = tempExpired(student);
    return (
      <PortalLayout
        items={[signOutItem(onSignOut)]} current="" onSelect={() => {}} title={expired ? 'Temporary password expired' : 'Choose your new password'}
        who={{ icon: 'plane', name: student.full_name, lines: [`ID ${student.student_id}`] }}
      >
        {expired ? <TempExpired student={student} onSignOut={onSignOut} /> : <SetNewPassword student={student} onDone={onProfileChange} />}
      </PortalLayout>
    );
  }

  const items = [
    { key: 'overview', icon: 'home', label: 'Overview' },
    { key: 'logbook', icon: 'book', label: 'Logbook', badge: toFix },
    { key: 'school', icon: 'cap', label: 'Ground school' },
    { key: 'pay', icon: 'wallet', label: 'Payments' },
    { key: 'profile', icon: 'user', label: 'Profile' },
    { key: 'password', icon: 'lock', label: 'Password' },
    signOutItem(onSignOut),
  ];
  const titles = { overview: 'Overview', logbook: 'Logbook', school: 'Ground school', pay: 'Payments', profile: 'Profile', password: 'Change password' };

  return (
    <PortalLayout
      items={waiting ? items.filter((i) => ['profile', 'password', 'signout'].includes(i.key)) : items} current={section} onSelect={setSection} title={titles[section]}
      who={{ icon: 'plane', name: student.full_name, lines: [`ID ${student.student_id}`, waiting ? 'Waiting for approval' : open ? `Access until ${dateText(student.access_ends)}` : 'Access ended'] }}
    >
      {waiting && (
        <div className="tp-card sc-ended sc-pending">
          <h2>Your enrolment is waiting for approval</h2>
          <p>The school will approve it soon. Your logbook, lessons and payments open as soon as it is approved. In the meantime you can complete your Profile.</p>
        </div>
      )}
      {section === 'profile' ? (
        <Profile student={student} onSaved={onProfileChange} />
      ) : section === 'password' ? (
        <PasswordPage />
      ) : !open ? (
        <div className="tp-card sc-ended">
          <h2>Your access has ended</h2>
          <p>Access ended on {dateText(student.access_ends)}{student.active ? '' : ' (switched off by the school)'}. To get it back, call us on <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a>.</p>
        </div>
      ) : (
        <>
          {error && <p className="tp-err">{error}</p>}
          {section === 'overview' && <Overview flights={flights} goLogbook={() => setSection('logbook')} />}
          {section === 'logbook' && <Logbook student={student} flights={flights} reload={reload} viewer={viewer} onProfileChange={onProfileChange} payments={pays} reloadPayments={reloadPays} />}
          {section === 'school' && <GroundSchool />}
          {section === 'pay' && <Payments student={student} viewer={viewer} rows={pays} reload={reloadPays} error={payError} flights={flights} />}
        </>
      )}
    </PortalLayout>
  );
}

const STAFF_TABS = [['overview', 'home', 'Overview'], ['logbook', 'book', 'Logbook'], ['pay', 'wallet', 'Payments'], ['profile', 'user', 'Profile'], ['access', 'lock', 'Access']];

/** The team manages a student's access and gives a new temporary password. */
function AccessPanel({ student, onUpdate, onReset }) {
  const [value, setValue] = useState(student.access_ends);
  const open = isOpen(student);
  return (
    <section className="tp-card sc-block">
      <h2>Access</h2>
      <p className="sc-hint">{open ? `Active until ${dateText(student.access_ends)}.` : student.active ? `Access ended on ${dateText(student.access_ends)}.` : 'Access is switched off.'}</p>
      <div className="sc-student__tools">
        <label className="enr-item__date">Access until
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button disabled={value === student.access_ends} onClick={() => onUpdate({ access_ends: value }, `New end date saved for ${student.full_name}.`)}>Save date</button>
        {student.active
          ? <button className="danger" onClick={() => onUpdate({ active: false }, `${student.full_name} no longer has access.`)}>End access</button>
          : <button onClick={() => onUpdate({ active: true }, `${student.full_name} has access again.`)}>Restore access</button>}
      </div>
      <h3 className="pf-sub">Password</h3>
      <p className="sc-hint">Use this when a student has forgotten their password. It makes a temporary password to send on WhatsApp. It works for 48 hours.</p>
      <div className="sc-student__tools"><button onClick={() => onReset(student)}>New temporary password</button></div>
    </section>
  );
}

/** The team looks at one student: totals, the logbook with sign-off, payments, contact details and access. */
function StaffStudent({ student, viewer, onBack, startTab, onChanged, onUpdate, onReset }) {
  const [tab, setTab] = useState(startTab);
  const [flights, reload, error] = useFlights(student.user_id);
  const [pays, reloadPays, payError] = usePayments(student.user_id);
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
      <div className="sc-tabs" role="tablist">
        {STAFF_TABS.map(([k, icon, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={icon} size={20} />{label}</button>
        ))}
      </div>
      {error && <p className="tp-err">{error}</p>}
      {tab === 'overview' && <Overview flights={flights} goLogbook={() => setTab('logbook')} />}
      {tab === 'logbook' && <Logbook student={student} flights={flights} reload={reload} viewer={viewer} payments={pays} reloadPayments={reloadPays} />}
      {tab === 'pay' && <Payments student={student} viewer={viewer} rows={pays} reload={reloadPays} error={payError} flights={flights} />}
      {tab === 'profile' && <Profile student={student} isStaff onSaved={onChanged} />}
      {tab === 'access' && <AccessPanel student={student} onUpdate={onUpdate} onReset={onReset} />}
    </>
  );
}

/** After the team gives a student a new temporary password: shown once, with a one-tap WhatsApp message as a back-up. */
function ResetNotice({ r, onClose }) {
  const first = r.name.split(' ')[0];
  const text = `Hi ${first}, welcome to Toronto Aerosport. Your Student ID is ${r.studentId}. Your temporary password is ${r.temp}. It works for 48 hours from now. Sign in here and then choose your own new password: ${portalUrl()}`;
  return (
    <div className="tp-card lb-notice" role="status">
      <Icon name="check" size={28} />
      <div>
        <strong>New temporary password for {r.name}</strong>
        <p className="pf-temp">{r.temp}</p>
        <p>It works for 48 hours from now. This is the only time it is shown, so send it now.</p>
        <div className="lb-notice__btns">
          {r.whatsapp ? <a className="btn btn-primary" href={waLink(r.whatsapp, text)} target="_blank" rel="noreferrer">Send on WhatsApp</a> : <span className="sc-hint">This student has no WhatsApp number saved. Give them the password another way.</span>}
        </div>
      </div>
      <button className="lb-notice__x" onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}

function StaffView({ viewer, onSignOut }) {
  const [section, setSection] = useState('students');
  const [students, setStudents] = useState(null);
  const [selected, setSelected] = useState(null);
  const [startTab, setStartTab] = useState('logbook');
  const [form, setForm] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    return { name: '', ends: d.toLocaleDateString('en-CA') };
  });
  const [find, setFind] = useState(''); // the search box on the students page
  const [focusEnrol, setFocusEnrol] = useState(null); // one enrolment opened from the menu
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [payQueue, setPayQueue] = useState(null);
  const [newEnquiries, setNewEnquiries] = useState(0);
  const [reset, setReset] = useState(null);
  const [apprEnds, setApprEnds] = useState({}); // access end date chosen for each enrolment

  const load = () => {
    fetchStudents().then((rows) => {
      setStudents(rows);
      setSelected((cur) => (cur ? rows.find((r) => r.user_id === cur.user_id) || cur : cur)); // keep the open student up to date
    }).catch((e) => setErr(e.message));
    fetchPending().then(setPending).catch(() => setPending([]));
    fetchPendingPayments().then(setPayQueue).catch(() => setPayQueue([]));
    fetchEnquiries().then((r) => setNewEnquiries(r.filter((x) => x.status === 'new').length)).catch(() => {});
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // look again every minute, so new flights and payments show up
    return () => clearInterval(t);
  }, []);
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
  const tabFor = (id) => (!flightsBy[id] && paysBy[id] ? 'pay' : 'logbook'); // open on whatever is waiting
  const openStudent = (userId, tab) => {
    const s = (students || []).find((x) => x.user_id === userId);
    if (!s) return;
    setStartTab(tab); setSelected(s); setSection('students');
  };
  const approvedStudents = students ? students.filter((s) => s.approved !== false) : null;
  const enrolments = (students || []).filter((s) => s.approved === false);
  const requests = (students || []).filter((s) => s.approved !== false && s.must_change_password && s.temp_request_pending);

  // what is waiting for each student: flights to sign and payments to confirm
  const flightsBy = {};
  (pending || []).forEach((f) => { flightsBy[f.student_user_id] = (flightsBy[f.student_user_id] || 0) + 1; });
  const paysBy = {};
  (payQueue || []).forEach((p) => { paysBy[p.student_user_id] = (paysBy[p.student_user_id] || 0) + 1; });
  const waitingFor = (s) => (flightsBy[s.user_id] || 0) + (paysBy[s.user_id] || 0);
  const pillsFor = (s) => [
    flightsBy[s.user_id] && { icon: 'book', n: flightsBy[s.user_id], title: flightsBy[s.user_id] === 1 ? 'flight to sign' : 'flights to sign' },
    paysBy[s.user_id] && { icon: 'wallet', n: paysBy[s.user_id], title: paysBy[s.user_id] === 1 ? 'payment to confirm' : 'payments to confirm' },
  ].filter(Boolean);

  const doReset = (s) => async () => {
    setErr(''); setMsg(''); setReset(null);
    try {
      const r = await staffResetPassword(s.user_id);
      setReset({ name: s.full_name, studentId: s.student_id, temp: r.temp_password, whatsapp: s.whatsapp });
      load();
    } catch (ex) { setErr(ex.message); }
  };
  const approve = (s) => async () => {
    setErr(''); setMsg('');
    const ends = apprEnds[s.user_id] || form.ends;
    try {
      await updateStudent(s.user_id, { approved: true, active: true, access_ends: ends });
      setMsg(`${s.full_name} is approved. Access runs until ${dateText(ends)}.`);
      load();
    } catch (ex) { setErr(ex.message); }
  };
  const remove = (s) => async () => {
    if (!window.confirm(`Remove ${s.full_name}'s enrolment? This cannot be undone.`)) return;
    setErr(''); setMsg('');
    try { await removeEnrolment(s.user_id); setMsg(`${s.full_name}'s enrolment was removed.`); load(); } catch (ex) { setErr(ex.message); }
  };

  const choose = (key) => {
    setMsg(''); setErr('');
    if (key.startsWith('s:')) { // one student, opened from the menu: go to what is waiting
      const id = key.slice(2);
      openStudent(id, tabFor(id));
      return;
    }
    if (key.startsWith('e:')) { setSelected(null); setFocusEnrol(key.slice(2)); setSection('enrolments'); return; }
    setSection(key);
    if (key === 'students') setSelected(null);
    if (key === 'enrolments') setFocusEnrol(null);
  };

  const items = [
    {
      key: 'students', icon: 'users', label: 'Students',
      badge: Object.values(flightsBy).reduce((a, n) => a + n, 0) + Object.values(paysBy).reduce((a, n) => a + n, 0),
      children: [
        ...enrolments.map((s) => ({ key: `e:${s.user_id}`, label: s.full_name, tag: 'New', note: 'Waiting for approval' })),
        ...[...(approvedStudents || [])]
          .sort((a, b) => waitingFor(b) - waitingFor(a) || a.full_name.localeCompare(b.full_name))
          .map((s) => ({ key: `s:${s.user_id}`, label: s.full_name, note: s.student_id, pills: pillsFor(s) })),
      ],
    },
    { key: 'enrolments', icon: 'user', label: 'Enrolments', badge: enrolments.length + requests.length },
    { key: 'signoffs', icon: 'book', label: 'Flights to sign', badge: (pending || []).length },
    { key: 'payments', icon: 'wallet', label: 'Payments', badge: (payQueue || []).length },
    { key: 'enquiries', icon: 'mail', label: 'Enquiries', badge: newEnquiries },
    signOutItem(onSignOut),
  ];
  const titles = { students: selected ? selected.full_name : 'Students', enrolments: 'Enrolments and password requests', signoffs: 'Flights waiting for sign-off', payments: 'Payments to confirm', enquiries: 'Flight enquiries' };

  return (
    <PortalLayout
      items={items} current={selected && section === 'students' ? `s:${selected.user_id}` : focusEnrol && section === 'enrolments' ? `e:${focusEnrol}` : section} onSelect={choose} title={selected && section === 'students' ? undefined : titles[section]}
      who={{ icon: 'users', name: 'Chief Flight Instructor (CFI)', lines: ['Flight school admin'] }}
    >
      {msg && <p className="sc-ok" role="status">{msg}</p>}
      {err && <p className="tp-err">{err}</p>}
      {reset && <ResetNotice r={reset} onClose={() => setReset(null)} />}

      {section === 'enquiries' && <Enquiries />}

      {section === 'enrolments' && (
        <>
          {!students ? <p className="sc-hint">Loading…</p> : enrolments.length === 0 && requests.length === 0 && (
            <section className="tp-card sc-block"><p className="sc-hint">Nothing is waiting. New enrolments and password requests appear here.</p></section>
          )}

          {enrolments.length > 0 && (
            <section className="enr-section">
              <div className="enr-section__head">
                <h2>New enrolments ({enrolments.length})</h2>
                {focusEnrol && enrolments.length > 1 && <button className="sc-link" onClick={() => setFocusEnrol(null)}>Show all enrolments</button>}
              </div>
              <ul className="enr-list">
                {(focusEnrol && enrolments.some((s) => s.user_id === focusEnrol) ? enrolments.filter((s) => s.user_id === focusEnrol) : enrolments).map((s) => {
                  const noId = String(s.student_id).startsWith('PENDING-');
                  return (
                    <li key={s.user_id} className="tp-card enr-item">
                      <div className="enr-item__top"><strong>{s.full_name}</strong><span className="enq__badge">Waiting for approval</span></div>
                      <p className="enr-item__id">{noId ? <>Student ID: <b>not made yet</b>. Fill in the permit details below.</> : <>Student ID <b>{s.student_id}</b></>}</p>
                      <p className="enq__meta">
                        <span>Enrolled {dateTimeText(s.created_at)}</span>
                        <span>{!s.must_change_password ? 'Has chosen their own password' : s.temp_request_pending ? 'Needs a temporary password' : tempExpired(s) ? 'Temporary password expired' : `Temporary password valid until ${dateTimeText(s.temp_password_expires)}`}</span>
                      </p>
                      <StudentFacts student={s} plain />
                      <div className="enq__contact">
                        {s.whatsapp && <a href={waLink(s.whatsapp, `Hi ${s.full_name.split(' ')[0]}, this is Toronto Aerosport about your enrolment.`)} target="_blank" rel="noreferrer">Message on WhatsApp</a>}
                        {s.contact_email && <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>}
                      </div>
                      <h3 className="pf-sub">Permit details (filled in by the school)</h3>
                      <PermitForm compact key={`${s.permit_number}-${s.student_id}`} student={s} onSaved={async () => load()} />
                      <div className="enq__btns enr-item__actions">
                        <label className="enr-item__date">Access until
                          <input type="date" value={apprEnds[s.user_id] || form.ends} min={today()} onChange={(e) => setApprEnds({ ...apprEnds, [s.user_id]: e.target.value })} />
                        </label>
                        <button onClick={approve(s)} disabled={noId} title="Fill in the permit details first">Approve</button>
                        <button className="good" onClick={doReset(s)} disabled={noId} title="Fill in the permit details first">{s.temp_request_pending ? 'Send temporary password on WhatsApp' : 'Send a new temporary password'}</button>
                        <button className="danger" onClick={remove(s)}>Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {requests.length > 0 && (
            <section className="enr-section">
              <div className="enr-section__head"><h2>Password requests ({requests.length})</h2></div>
              <ul className="enr-list">
                {requests.map((s) => (
                  <li key={s.user_id} className="tp-card enr-item">
                    <div className="enr-item__top"><strong>{s.full_name}</strong><span className="enq__badge">Asked for a new password</span></div>
                    <p className="enr-item__id">Student ID <b>{s.student_id}</b></p>
                    <p className="enq__meta">
                      {s.temp_requested_at && <span>Asked {dateTimeText(s.temp_requested_at)}</span>}
                      {s.whatsapp ? <span>WhatsApp +{s.whatsapp}</span> : <span>No WhatsApp number saved</span>}
                    </p>
                    <div className="enq__btns"><button className="good" onClick={doReset(s)}>Send temporary password on WhatsApp</button></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {section === 'signoffs' && (
        <section className="tp-card sc-block sc-queue">
          {!pending ? <p className="sc-hint">Loading…</p> : pending.length === 0 ? <p className="sc-hint">Nothing is waiting. New flights from students appear here.</p> : (
            <ul className="sc-log">
              {pending.map((f) => (
                <li key={f.id}>
                  <div><strong>{f.students?.full_name} · {dateText(f.flown_on)}</strong><span>{[f.aircraft, f.registration, `${f.total_hours} h`].filter(Boolean).join(' · ')}</span></div>
                  <button className="sc-link" onClick={() => openStudent(f.student_user_id, 'logbook')}>Review →</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === 'payments' && (
        <section className="tp-card sc-block sc-queue">
          {!payQueue ? <p className="sc-hint">Loading…</p> : payQueue.length === 0 ? <p className="sc-hint">No e-Transfers are waiting to be confirmed.</p> : (
            <ul className="sc-log">
              {payQueue.map((p) => (
                <li key={p.id}>
                  <div><strong>{p.students?.full_name} · {money(p.amount)}</strong><span>Sent {dateText(p.sent_on)}{p.reference ? ` · Confirmation ${p.reference}` : ''}</span></div>
                  <button className="sc-link" onClick={() => openStudent(p.student_user_id, 'pay')}>Check →</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === 'students' && selected && (
        <StaffStudent student={selected} viewer={viewer} startTab={startTab} onChanged={load} onBack={() => { setSelected(null); load(); }}
          onUpdate={(patch, ok) => change(selected.user_id, patch, ok)()} onReset={(st) => doReset(st)()} />
      )}

      {section === 'students' && !selected && (
        <>
          <div className="sc-find">
            <Icon name="user" size={20} />
            <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a student by name or ID" aria-label="Find a student" />
          </div>
          {!approvedStudents ? <p className="sc-hint">Loading…</p> : approvedStudents.length === 0 ? (
            <div className="tp-card tp-empty"><p>No students yet. New students enrol on the sign-in page.</p></div>
          ) : (
            <ul className="sc-rows">
              {approvedStudents
                .filter((s) => `${s.full_name} ${s.student_id}`.toLowerCase().includes(find.trim().toLowerCase()))
                .sort((a, b) => waitingFor(b) - waitingFor(a) || a.full_name.localeCompare(b.full_name))
                .map((s) => {
                  const isActive = isOpen(s);
                  return (
                    <li key={s.user_id}>
                      <button className="sc-row" onClick={() => openStudent(s.user_id, tabFor(s.user_id))}>
                        <span className="sc-row__name"><strong>{s.full_name}</strong><small>ID {s.student_id}</small></span>
                        <span className="sc-row__tags">
                          {pillsFor(s).map((pl) => <i key={pl.icon} className={`sc-pill sc-pill--${pl.icon}`}><Icon name={pl.icon} size={13} />{pl.n} {pl.title}</i>)}
                          <em className={isActive ? 'on' : 'off'}>{isActive ? 'Active' : s.active ? 'Expired' : 'Access ended'}</em>
                        </span>
                        <Icon name="chevron" size={18} className="sc-row__go" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}

          <details className="tp-card sc-oldadd">
            <summary>Add a student manually</summary>
            <form className="tp-form sc-add" onSubmit={add}>
              <p className="sc-hint">The student ID is made for you (TAS-001, TAS-002 and so on). For now the password is the student's full name, typed exactly the same. Most students should enrol on the sign-in page instead.</p>
              <div className="tp-row">
                <label>Full name<input value={form.name} onChange={set('name')} minLength={6} required /></label>
                <label>Access ends on<input type="date" value={form.ends} min={today()} onChange={set('ends')} required /></label>
              </div>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add student'}</button>
            </form>
          </details>
        </>
      )}
    </PortalLayout>
  );
}

export default function StudentCorner({ theme, onToggleTheme }) {
  const [state, setState] = useState({ loading: true });
  const [guest, setGuest] = useState('signin');
  const [forgot, setForgot] = useState(false);
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
  else if (!state.role) {
    body = (
      <PortalLayout
        items={guest === 'admin'
          ? [{ key: 'admin', icon: 'lock', label: 'School admin sign in' }, { key: 'signin', icon: 'login', label: 'Student sign in' }]
          : [{ key: 'signin', icon: 'login', label: 'Student sign in' }, { key: 'enrol', icon: 'user', label: 'Enrol as a student' }]}
        current={guest} onSelect={(k) => { setGuest(k); setForgot(false); }}
        title={guest === 'admin' ? 'School team' : guest === 'enrol' ? 'Student enrolment' : forgot ? 'New temporary password' : 'Welcome, student'}
      >
        {guest === 'admin' ? <AdminLogin onDone={load} onBack={() => setGuest('signin')} />
          : guest === 'enrol' ? <Enrol onSignIn={() => setGuest('signin')} />
            : forgot ? <GetTempPassword onBack={() => setForgot(false)} />
              : <Login onDone={load} onForgot={() => setForgot(true)} />}
      </PortalLayout>
    );
  } else if (state.role === 'staff') body = <StaffView viewer={viewer} onSignOut={signOut} />;
  else if (state.role === 'student') body = <StudentView student={state.student} viewer={viewer} onSignOut={signOut} onProfileChange={load} />;
  else {
    body = (
      <PortalLayout items={[signOutItem(signOut)]} current="" onSelect={() => {}} title="This account is not set up yet">
        <div className="tp-card sc-ended">
          <p>Please call the school on <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a>.</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <div className="portal">
      <header className="portal__bar">
        <div className="container portal__inner">
          <a href="#student-corner" className="portal__brand" aria-label="Student Corner home"><Logo /><span>Student Corner</span></a>
          <div className="portal__right">
            {!state.loading && !state.role && !state.error && !isDemo && (
              <button className={`portal__admin ${guest === 'admin' ? 'on' : ''}`} onClick={() => { setGuest('admin'); setForgot(false); }} aria-label="School admin login">
                <Icon name="users" size={18} /><span>School admin login</span>
              </button>
            )}
            <a href="#top" className="portal__back" aria-label="Back to the Toronto Aerosport website"><Icon name="back" size={18} /><span>Toronto Aerosport website</span></a>
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
