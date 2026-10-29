import useReveal from '../hooks/useReveal';
import './Compare.css';

// Minimums come from Transport Canada rules as summarised by UPAC, COPA and Ontario flight schools.
const cols = ['Ultralight Permit', 'Recreational Permit', 'Private Licence'];
const rows = [
  { label: 'Least flying time', vals: ['10 hours', '25 hours', '45 hours'] },
  { label: 'Youngest age', vals: ['16', '16', '17'] },
  { label: 'Medical', vals: ['Simple self-declaration', 'Category 1, 3 or 4', 'Category 1 or 3'] },
  { label: 'Training cost', vals: ['Lowest', 'Higher', 'Highest'], hot: true },
];

export default function Compare() {
  const [ref, visible] = useReveal(0.1);
  return (
    <section className="section compare" id="costs">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Costs</span>
          <h2>The lowest-cost way to fly</h2>
          <p>Ultralights need the fewest training hours. Fewer hours means a lower bill.</p>
        </div>

        <div ref={ref} className={`compare__wrap reveal ${visible ? 'visible' : ''}`}>
          <table className="compare__table">
            <thead>
              <tr>
                <th><span className="sr-only">Detail</span></th>
                {cols.map((c, i) => (
                  <th key={c} className={i === 0 ? 'is-us' : ''}>
                    {i === 0 && <em>Our focus</em>}{c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={r.hot ? 'is-hot' : ''}>
                  <th scope="row">{r.label}</th>
                  {r.vals.map((v, i) => (
                    <td key={i} className={i === 0 ? 'is-us' : ''} data-label={cols[i]}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="compare__note">
          Most ultralight pilots fly their own or shared aircraft. We can help you with{' '}
          <strong>buying, owning and maintaining</strong> one.
        </p>
        <p className="compare__src">
          These are minimums only. Real hours vary by person. Check with Transport Canada. Sources:{' '}
          <a href="https://upac.ca/?p=19380" target="_blank" rel="noreferrer">UPAC</a>,{' '}
          <a href="https://copanational.org/learn-to-fly/ultralights/" target="_blank" rel="noreferrer">COPA</a>,{' '}
          <a href="https://ofc.ca/recreational-pilot-license-rpl/" target="_blank" rel="noreferrer">Ottawa Flying Club</a>.
        </p>
      </div>
    </section>
  );
}
