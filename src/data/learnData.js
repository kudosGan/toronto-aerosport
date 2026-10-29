// Words for the "Learning to Fly" page. Based on the text supplied by Toronto Aerosport, written in simple English.
// Items marked CHECK were blank ("xx" / "XXXXX") in the original text. Fill them in before launch.

export const parts = [
  { id: 'ground', icon: '📚', title: 'Ground school', short: 'Learn the theory in 20 hours of classes.' },
  { id: 'dual', icon: '👩‍✈️', title: 'Flying with an instructor', short: 'Fly with an instructor beside you.' },
  { id: 'solo', icon: '🛩️', title: 'Solo flights', short: 'Your first flight on your own.' },
  { id: 'exam', icon: '📝', title: 'Written exam', short: 'Pass the final test. Then you are a pilot.' },
];

export const groundTopics = [
  'Airframes and engines', 'Theory of flight', 'Airmanship', 'Air law and rules',
  'Airspace and airports', 'Weather', 'Navigation', 'Radio use', 'Human factors', 'Decision making',
];

export const dualStages = [
  { hours: 'First 3–6 hours', title: 'Get to know the aircraft', items: ['Getting the aircraft ready', 'Taxiing', 'How the aircraft moves', 'Flying straight and level', 'Climbing, descending and turning'] },
  { hours: 'Next 3–6 hours', title: 'Circuits, take-offs and landings', items: ['Circuits', 'Take-offs and landings', 'Side slips and forward slips', 'Crosswind take-offs and landings'] },
  { hours: 'Then', title: 'Fly beyond the circuit', items: ['Long flights (endurance)', 'Slow flight', 'Stall recovery', 'Forced landings', 'Precautionary landings'] },
];

export const requirements = [
  { big: '10', text: 'hours of total flying time (minimum)' },
  { big: '2', text: 'hours of solo flying (minimum)' },
  { big: '30', text: 'take-offs and landings (minimum)' },
];

export const contactPeople = ['Bill Bryan', 'Harry Walia'];
