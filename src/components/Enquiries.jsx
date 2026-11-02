import { useCallback, useEffect, useState } from 'react';
import { fetchEnquiries, setEnquiryStatus } from '../lib/enquiries';
import { waLink } from '../lib/students';
import { dateText } from '../lib/format';
import Icon from './Icon';
import './Enquiries.css';

const LABEL = { new: 'New', contacted: 'Contacted', booked: 'Booked', closed: 'Closed' };

/** Introductory flight requests from the website form, for the team. */
export default function Enquiries() {
  const [rows, setRows] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(() => fetchEnquiries().then(setRows).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);

  const mark = (id, status) => async () => {
    setErr('');
    try { await setEnquiryStatus(id, status); load(); } catch (ex) { setErr(ex.message); }
  };
  const open = (rows || []).filter((r) => r.status === 'new' || r.status === 'contacted');
  const shown = showAll ? rows : open;
  const newCount = (rows || []).filter((r) => r.status === 'new').length;

  return (
    <section className="tp-card sc-block enq">
      <div className="sc-block__head">
        <h2><Icon name="mail" size={22} />Flight enquiries{newCount > 0 ? ` (${newCount} new)` : ''}</h2>
        <button className="sc-link" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show open only' : 'Show all'}</button>
      </div>
      {err && <p className="tp-err">{err}</p>}
      {!rows ? <p className="sc-hint">Loading…</p> : shown.length === 0 ? (
        <p className="sc-hint">{showAll ? 'No enquiries yet.' : 'No open enquiries. New requests from the website appear here.'}</p>
      ) : (
        <ul className="enq__list">
          {shown.map((r) => {
            const text = `Hi ${r.name.split(' ')[0]}, thank you for asking about an introductory flight with Toronto Aerosport. When would suit you best?`;
            return (
              <li key={r.id} className={`enq__item enq__item--${r.status}`}>
                <div className="enq__top">
                  <strong>{r.name}</strong>
                  <span className={`enq__badge enq__badge--${r.status}`}>{LABEL[r.status]}</span>
                </div>
                <p className="enq__meta">
                  <span>{dateText(r.created_at.slice(0, 10))}</span>
                  {r.heard_from && <span>Heard from: {r.heard_from}</span>}
                  {r.source && <span>Link: {r.source}</span>}
                </p>
                <p className="enq__contact">
                  {r.phone && <a href={`tel:${r.phone}`}>{r.phone}</a>}
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                </p>
                {r.message && <p className="enq__msg">{r.message}</p>}
                <div className="enq__btns">
                  {r.phone && <a className="good" href={waLink(r.phone, text)} target="_blank" rel="noreferrer">Reply on WhatsApp</a>}
                  <a href={`mailto:${r.email}?subject=${encodeURIComponent('Your introductory flight')}&body=${encodeURIComponent(text)}`}>Reply by email</a>
                  {r.status === 'new' && <button onClick={mark(r.id, 'contacted')}>Mark contacted</button>}
                  {r.status !== 'booked' && <button onClick={mark(r.id, 'booked')}>Booked a flight</button>}
                  {r.status !== 'closed' && <button className="danger" onClick={mark(r.id, 'closed')}>Close</button>}
                  {(r.status === 'closed' || r.status === 'booked') && <button onClick={mark(r.id, 'new')}>Reopen</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
