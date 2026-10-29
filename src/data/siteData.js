// Edit this file to change the words on the site.
// Facts taken from torontoaerosport.com: Stouffville, Ontario; ultralight & light sport aircraft; permit in 25 hours or less.
// PLACEHOLDER = replace with your real details.

export const navLinks = [
  { label: 'Learn to Fly', href: '#learning-to-fly' },
  { label: 'Costs', href: '#costs' },
  { label: 'Try a Flight', href: '#intro-flight' },
  { label: 'Visit Us', href: '#where' },
  { label: 'FAQ', href: '#faq' },
];

export const heroFacts = [
  { big: '25', small: 'hours or less to get your permit' },
  { big: '10', small: 'hours is the minimum flying time' },
  { big: '100%', small: 'of the theory can be studied online' },
];

// Set `price` to text like '$199' to show it on the card. While it is null the card says "Call for price".
export const features = [
  { art: 'learn', title: 'Easy to start', text: 'No flying experience needed. We teach you step by step.', link: '#learn', cta: 'See how it works', priceLabel: 'Introductory flight', price: null },
  { art: 'plane', title: 'Fun, simple aircraft', text: 'Fly ultralight and light sport aircraft. They are light, modern and fun.', link: '#costs', cta: 'Compare permits', priceLabel: 'Ground school (20 hours)', price: null },
  { art: 'cost', title: 'Costs less', text: 'Fewer training hours means flying is less expensive than ever.', link: '#costs', cta: 'See the costs', priceLabel: 'Flight training, per hour', price: null },
];

export const steps = [
  { title: 'Try a flight', text: 'Meet an instructor and fly with us. See if you love it.' },
  { title: 'Learn the basics', text: 'Study the theory online, at your own speed.' },
  { title: 'Train in the air', text: 'Practise with your instructor until you are ready to fly solo.' },
  { title: 'Get your permit', text: 'Pass your exam and your flight test. Then go fly!' },
];

export const faqs = [
  { q: 'How long does it take to get a permit?', a: 'Talk to us about getting your Ultralight Pilot Permit in 25 hours or less. The Transport Canada minimum is 10 hours of flying.' },
  { q: 'Is flying really less expensive now?', a: 'Yes. New sport aircraft and new permit types make flying cheaper and open to more people.' },
  { q: 'Can I study at home?', a: 'Yes. Our ultralight ground school is online, so you can study the theory when it suits you.' },
  { q: 'Where are you?', a: 'In Stouffville, Ontario, north-east of Toronto in the GTA.' },
  { q: 'How do I try it first?', a: 'Fill in the form on this page to ask for an introductory flight. We will call you.' },
];

// PLACEHOLDER contact details
// Contact details come from the current website.
export const contact = {
  phone: '647-218-5403',
  phoneLink: '+16472185403',
  phoneLabel: 'Airport',
  email: 'bill@torontoairsport.com',   // CHECK: spelled "airsport" on the old site, not "aerosport"
  people: ['Bill Bryan', 'Manny Morales', 'Harpreet Walia'],
  flyingAt: 'Stouffville, Ontario',
  officeAddress: '31 Cobbler Crescent, Markham, ON L3P 6P4',   // CHECK: office or mailing address?
};

// Pages from the old site that can be added next:
// About Us, What Are Ultralights, What You Fly, Introductory Flight, Aircraft Ownership,
// Maintenance/Building, Aircraft For Sale, Links Of Interest
