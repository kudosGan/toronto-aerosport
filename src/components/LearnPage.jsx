import { ImageSlot } from './Art';
import IntroFlight from './IntroFlight';
import PartCards from './PartCards';
import { groundTopics, dualStages, requirements } from '../data/learnData';
import { contact } from '../data/siteData';
import './LearnPage.css';

export default function LearnPage() {
  return (
    <>
      <section className="lp-hero">
        <div className="container lp-hero__inner">
          <div>
            <span className="eyebrow">Flight training</span>
            <h1>Learning to fly</h1>
            <p className="lp-lead">A pilot in the making. Here is how you go from first lesson to your Ultralight Pilot Permit.</p>
            <a href="#intro-flight" className="btn btn-primary">Book an introductory flight</a>
          </div>
          <div className="lp-hero__img"><ImageSlot name="learn" alt="Student and instructor in an ultralight aircraft" /></div>
        </div>
      </section>

      <section className="lp-parts">
        <div className="container">
          <h2 className="lp-parts__title">Training has 4 main parts</h2>
          <PartCards />
          <p className="lp-tip">
            <strong>Good to know:</strong> ground school and flying lessons can happen at the same time. Many students
            like to fly a little first. It helps the theory make sense.
          </p>
        </div>
      </section>

      {/* Part 1 */}
      <section className="lp-block" id="ground">
        <div className="container lp-block__grid">
          <div className="lp-block__head">
            <span className="lp-badge">1</span>
            <h2>Ground school</h2>
            <p>The Ultralight Pilot Permit needs <strong>20 hours</strong> of ground school.</p>
          </div>
          <div className="lp-block__body">
            <p>Classes run on a set schedule. They are often held over one weekend. Check the Toronto Aerosport calendar for the next dates.</p>
            <h3>What you will learn</h3>
            <ul className="lp-pills">{groundTopics.map((t) => <li key={t}>{t}</li>)}</ul>
            <p>The price includes classroom time, text books and practice tests.</p>
            <div className="lp-callout">
              <h3>Two exams to prepare for</h3>
              <ol>
                <li><strong>The pre-solo exam (PSTAR).</strong> You take it here at Toronto Aerosport. It lets you get your student pilot permit.</li>
                <li><strong>The final written exam.</strong> You take it at a Transport Canada office.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Part 2 */}
      <section className="lp-block lp-block--tint" id="dual">
        <div className="container lp-block__grid">
          <div className="lp-block__head">
            <span className="lp-badge">2</span>
            <h2>Flying with an instructor</h2>
            <p>This is called <strong>dual</strong> training. You can start it before, during or after ground school. There is no need to wait.</p>
          </div>
          <div className="lp-block__body">
            <ol className="lp-stages">
              {dualStages.map((s) => (
                <li key={s.title}>
                  <small>{s.hours}</small>
                  <h3>{s.title}</h3>
                  <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
                </li>
              ))}
            </ol>
            <p className="lp-note">Hours depend on how fast you learn. Then comes the magic moment in every pilot's life: your first solo flight.</p>
          </div>
        </div>
      </section>

      {/* Part 3 */}
      <section className="lp-block" id="solo">
        <div className="container lp-block__grid">
          <div className="lp-block__head">
            <span className="lp-badge">3</span>
            <h2>Flying solo</h2>
            <p>Your first solo is a big day. It is a tradition for every pilot.</p>
          </div>
          <div className="lp-block__body">
            <p>When you fly with confidence and fly well every time, your instructor steps out of the aircraft. You take off, fly one circuit and land, all by yourself. It proves you can fly. It is a time to celebrate.</p>
            <p>After that, you keep training. Some flights are with your instructor to check your skills. Others are supervised solo flights, where you practise circuits, flying skills, take-offs and landings.</p>
          </div>
        </div>
      </section>

      {/* Part 4 */}
      <section className="lp-block lp-block--tint" id="exam">
        <div className="container lp-block__grid">
          <div className="lp-block__head">
            <span className="lp-badge">4</span>
            <h2>The final written exam</h2>
            <p>Finish the minimum training. Then write your exam at a Transport Canada Civil Aviation office.</p>
          </div>
          <div className="lp-block__body">
            <h3>Minimum for your permit</h3>
            <ul className="lp-reqs">
              {requirements.map((r) => (
                <li key={r.text}><strong>{r.big}</strong><span>{r.text}</span></li>
              ))}
            </ul>
            <p>Ground school and your flying time prepare you to pass. When you do, you are an Ultralight (UL) pilot.</p>
          </div>
        </div>
      </section>

      {/* Next step */}
      <section className="lp-next">
        <div className="container lp-next__box">
          <div>
            <span className="eyebrow">Next step</span>
            <h2>Passenger Carrying Endorsement</h2>
            <p>After your permit, the next step is to carry passengers. It needs more training in flying skills, navigation, emergencies and cross-country flights.</p>
            <p>You need <strong>25 hours</strong> of supervised flying in total, and a check-out ride with a Transport Canada approved flight inspector. Ask us for the full list of requirements.</p>
          </div>
          <div className="lp-next__contact">
            <h3>Questions? Talk to us.</h3>
            <a className="lp-phone" href={`tel:${contact.phoneLink}`}>{contact.phone}</a>
            <small>{contact.phoneLabel}</small>
          </div>
        </div>
      </section>

      <IntroFlight />
    </>
  );
}
