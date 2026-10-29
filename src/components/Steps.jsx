import { useEffect, useState } from 'react';
import useReveal from '../hooks/useReveal';
import { steps } from '../data/siteData';
import './Steps.css';

function useCountUp(target, run, ms = 1300) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - start) / ms, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return n;
}

export default function Steps() {
  const [ref, visible] = useReveal(0.2);
  const hours = useCountUp(25, visible);

  return (
    <section className="section steps" id="learn">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Learn to fly</span>
          <h2>Four easy steps to your pilot permit</h2>
          <p>Talk to us about getting your Ultralight Pilot Permit in 25 hours or less.{' '}
            <a className="steps__more" href="#learning-to-fly">Read the full guide →</a></p>
        </div>

        <div ref={ref} className="steps__layout">
          <ol className="steps__list">
            {steps.map((s, i) => (
              <li key={s.title} className={`reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: `${i * 140}ms` }}>
                <span className="steps__num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="steps__counter">
            <small>Your permit in</small>
            <strong>{hours}</strong>
            <span>hours or less</span>
            <a href="#intro-flight" className="btn btn-primary">Start with a flight</a>
          </div>
        </div>
      </div>
    </section>
  );
}
