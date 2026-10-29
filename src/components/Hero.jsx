import { ImageSlot } from './Art';
import { heroFacts } from '../data/siteData';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="eyebrow">Stouffville, Ontario · north-east of Toronto</span>
          <h1>Learn to fly.<br /><span>It's easier than you think.</span></h1>
          <p>
            Fly ultralight and light sport aircraft with Toronto Aerosport. Flying now costs less and is open
            to more people than ever before.
          </p>
          <div className="hero__buttons">
            <a href="#intro-flight" className="btn btn-primary">Book an introductory flight</a>
            <a href="#learn" className="btn btn-ghost">How it works</a>
          </div>
        </div>

        <div className="hero__image">
          <ImageSlot name="hero" alt="A small yellow aircraft flying over a lake" />
        </div>
      </div>

      <div className="container">
        <ul className="hero__facts">
          {heroFacts.map((f) => (
            <li key={f.small}><strong>{f.big}</strong><span>{f.small}</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
