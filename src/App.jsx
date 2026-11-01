import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Steps from './components/Steps';
import Compare from './components/Compare';
import IntroFlight from './components/IntroFlight';
import Location from './components/Location';
import Faq from './components/Faq';
import Footer from './components/Footer';
import StickyCta from './components/StickyCta';
import LearnPage from './components/LearnPage';
import Cockpit from './components/Cockpit';
import ForSalePage from './components/ForSalePage';
import TeamPage from './components/TeamPage';
import SaleTeaser from './components/SaleTeaser';

// Pages use a plain hash name (no slashes), e.g. #learning-to-fly. Any other hash is a scroll point on the home page.
const PAGES = { 'learning-to-fly': 'learn', 'aircraft-for-sale': 'sale', 'team': 'team' };
const readHash = () => window.location.hash.replace('#', '');
const routeFor = (hash) => PAGES[hash] || 'home';

export default function App() {
  const [hash, setHash] = useState(readHash());
  const route = routeFor(hash);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'day'; } catch { return 'day'; }
  });

  useEffect(() => {
    const onHash = () => setHash(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme]);

  // After the page changes, scroll to the right place
  useEffect(() => {
    const t = setTimeout(() => {
      const target = route === 'home' && hash ? document.getElementById(hash) : null;
      if (target) target.scrollIntoView();
      else window.scrollTo(0, 0);
    }, 0);
    return () => clearTimeout(t);
  }, [route, hash]);

  return (
    <>
      <Navbar theme={theme} onToggleTheme={() => setTheme(theme === 'day' ? 'night' : 'day')} />
      <main>
        {route === 'learn' ? (
          <LearnPage />
        ) : route === 'sale' ? (
          <ForSalePage />
        ) : route === 'team' ? (
          <TeamPage />
        ) : (
          <>
            <Hero />
            <Features />
            <Cockpit />
            <SaleTeaser />
            <Steps />
            <Compare />
            <IntroFlight />
            <Location />
            <Faq />
          </>
        )}
      </main>
      <Footer />
      <StickyCta />
    </>
  );
}
