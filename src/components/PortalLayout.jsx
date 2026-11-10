import { useState } from 'react';
import Icon from './Icon';

/**
 * The Student Corner frame: a side menu on the left and one page on the right.
 * items: [{ key, icon, label, badge?, children?, onClick?, foot? }]. Items with foot: true sit at the bottom (Sign out).
 * children: [{ key, label, tag?, note?, pills?: [{ icon, n, title }] }] are listed in a dropdown under their item, for example one line per student.
 * The dropdown starts closed. The arrow opens it. The number badge on the item stays visible while it is closed.
 * On a phone the menu slides in from the left.
 */
export default function PortalLayout({ items, current, onSelect, who, title, children }) {
  const [open, setOpen] = useState(false);
  const [dropped, setDropped] = useState({}); // which dropdowns the user opened or closed
  const hasKids = (it) => Boolean(it.children && it.children.length);
  const isDropped = (it) => (dropped[it.key] !== undefined ? dropped[it.key] : it.children?.some((c) => c.key === current) ?? false);
  const toggle = (it) => () => setDropped((d) => ({ ...d, [it.key]: !isDropped(it) }));
  const pick = (it) => () => {
    if (hasKids(it)) setDropped((d) => ({ ...d, [it.key]: true })); // opening the page also opens its list
    setOpen(false);
    if (it.onClick) it.onClick(); else onSelect(it.key);
  };
  const button = (it) => (
    <button key={it.key} className={`${current === it.key ? 'on' : ''} ${it.foot ? 'foot' : ''}`} onClick={pick(it)} aria-current={current === it.key ? 'page' : undefined}>
      <Icon name={it.icon} size={22} />
      <span>{it.label}</span>
      {it.badge > 0 && <em>{it.badge}</em>}
    </button>
  );
  const child = (c) => (
    <button key={c.key} className={current === c.key ? 'on' : ''} onClick={pick(c)} aria-current={current === c.key ? 'page' : undefined}>
      <span>{c.label}</span>
      {c.tag && <i className="sc-pill sc-pill--new">{c.tag}</i>}
      {(c.pills || []).map((p) => (
        <i key={p.icon} className={`sc-pill sc-pill--${p.icon}`} title={p.title} aria-label={`${p.n} ${p.title}`}><Icon name={p.icon} size={13} />{p.n}</i>
      ))}
      {c.note && <small className="sc-side__note">{c.note}</small>}
    </button>
  );

  return (
    <div className="sc-shell">
      <button className="sc-shell__toggle" onClick={() => setOpen(true)} aria-expanded={open}><Icon name="menu" size={22} />Menu</button>
      <div className={`sc-shell__scrim ${open ? 'on' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sc-side ${open ? 'open' : ''}`} aria-label="Student Corner menu">
        <button className="sc-side__close" onClick={() => setOpen(false)} aria-label="Close menu">×</button>
        {who && (
          <div className="sc-side__who">
            <span className="sc-side__avatar"><Icon name={who.icon} size={28} /></span>
            <div><strong>{who.name}</strong>{who.lines.map((l) => <small key={l}>{l}</small>)}</div>
          </div>
        )}
        <nav>
          {items.filter((i) => !i.foot).map((it) => (
            <div key={it.key} className="sc-side__item">
              {hasKids(it) ? (
                <div className={`sc-side__row ${current === it.key ? 'on' : ''}`}>
                  {button(it)}
                  <button className="sc-side__chev" onClick={toggle(it)} aria-expanded={isDropped(it)} aria-label={`${isDropped(it) ? 'Hide' : 'Show'} the list under ${it.label}`}>
                    <Icon name="chevron" size={20} className={isDropped(it) ? 'up' : ''} />
                  </button>
                </div>
              ) : button(it)}
              {hasKids(it) && isDropped(it) && <div className="sc-side__sub">{it.children.map(child)}</div>}
            </div>
          ))}
          {items.some((i) => i.foot) && <div className="sc-side__foot">{items.filter((i) => i.foot).map(button)}</div>}
        </nav>
      </aside>
      <main className="sc-main">
        {title && <h1 className="sc-title">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
