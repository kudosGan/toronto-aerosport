import { ImageSlot } from './Art';
import useReveal from '../hooks/useReveal';
import './Cockpit.css';

const points = [
  { icon: '🧭', title: 'A moving map', text: 'A GPS screen shows where you are.' },
  { icon: '⏱️', title: 'Simple dials', text: 'Clear gauges show your speed and height.' },
  { icon: '🖥️', title: 'A digital screen', text: 'One screen shows your horizon and engine.' },
];

export default function Cockpit() {
  const [ref, visible] = useReveal();
  return (
    <section className="section cockpit" id="cockpit">
      <div ref={ref} className={`container cockpit__inner reveal ${visible ? 'visible' : ''}`}>
        <div className="cockpit__img">
          <ImageSlot name="cockpit" alt="Cockpit with a GPS, dials and a digital flight screen" />
        </div>
        <div className="cockpit__copy">
          <span className="eyebrow">Inside the cockpit</span>
          <h2>Modern, easy to read</h2>
          <p>Today's light aircraft use clear screens and dials. We show you how to read each one.</p>
          <ul>
            {points.map((p) => (
              <li key={p.title}>
                <span aria-hidden="true">{p.icon}</span>
                <div><strong>{p.title}</strong><small>{p.text}</small></div>
              </li>
            ))}
          </ul>
          <a href="#learning-to-fly" className="btn btn-ghost">See how you learn</a>
        </div>
      </div>
    </section>
  );
}
