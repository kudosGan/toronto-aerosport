import paths from './iconPaths';
import './Icon.css';

/** A thin line icon. The paths are fixed strings from iconPaths.js. */
export default function Icon({ name, size = 24, className = '' }) {
  return (
    <svg className={`ic ${className}`} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: paths[name] || '' }} />
  );
}
