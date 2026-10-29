import { GroundArt, DualArt, SoloArt, ExamArt } from './IsoArt';
import { parts } from '../data/learnData';
import './PartCards.css';

const arts = { ground: GroundArt, dual: DualArt, solo: SoloArt, exam: ExamArt };
const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export default function PartCards() {
  return (
    <ul className="pc-grid">
      {parts.map((p, i) => {
        const Art = arts[p.id];
        return (
          <li key={p.id} className="pc">
            <div className="pc__bar">
              <span className="pc__mark">{i + 1}</span>
              <span className="pc__part">Part {i + 1} of 4</span>
              <span className="pc__dots" aria-hidden="true">
                {parts.map((_, d) => <i key={d} className={d <= i ? 'on' : ''} />)}
              </span>
            </div>
            <div className="pc__body">
              <div className="pc__text">
                <h3>{p.title}</h3>
                <p>{p.short}</p>
                <button className="pc__btn" onClick={() => goTo(p.id)}>Learn more</button>
              </div>
              <div className="pc__art"><Art /></div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
