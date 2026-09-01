/* Content ported from portfolio-opus5. Facts follow LinkedIn with Dhanush's
   confirmed corrections. Nothing invented, nothing padded.

   Regrouped for this site's sections rather than copied wholesale: the reference site
   structure wants a different shape — one statement, one story, a gallery of
   named things, one featured piece — so the same facts are cut differently. */

export const SITE = {
  name: 'Dhanush Krishna',
  first: 'DHANUSH',
  last: 'KRISHNA',
  role: 'Machine Learning & Cybersecurity',
  location: 'Abu Dhabi, UAE',
  email: 'dhanushk0611@gmail.com',
  resume: '/dhanush-krishna-resume.pdf',
  available: 'Open to software, ML & data roles',
  year: '2026',
  school: 'BITS Pilani Dubai',
  degree: 'B.E. Computer Science, 2026',
};

export const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/DhanushKrishna4', handle: 'DhanushKrishna4' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/dhanushkrishna0611/', handle: 'dhanushkrishna0611' },
  { label: 'Email', href: 'mailto:dhanushk0611@gmail.com', handle: 'dhanushk0611@gmail.com' },
];

/* The marquee line. the reference site runs a race result here — a thing that just happened,
   in his own voice. The equivalent is the one sentence that says what the work
   is for, short enough to read sideways at speed. */
export const MARQUEE = 'BUILT TO RUN WHERE THE CLOUD CANNOT REACH';

/* The statement. the reference site's is serif-and-sans mixed with the emphasised words in
   acid; the emphasis carries the meaning, so the split has to fall on words
   that are worth emphasising rather than on a rhythm. */
export const STATEMENT = [
  { t: 'MACHINE LEARNING', em: false },
  { t: 'FOR PLACES THE', em: false },
  { t: 'CLOUD', em: true },
  { t: "CAN'T REACH.", em: false },
  { t: 'REGULATED DATA,', em: false },
  { t: 'AIR-GAPPED', em: true },
  { t: 'NETWORKS, AND', em: false },
  { t: 'WHATEVER HARDWARE', em: false },
  { t: 'IS ALREADY IN', em: false },
  { t: 'THE BUILDING.', em: false },
];

export const ABOUT = [
  'I’m a final-year Computer Science student at BITS Pilani Dubai, based in Abu Dhabi. The work I take on has hard constraints attached: regulated data, air-gapped networks, and whatever hardware is already in the building.',
  'Nexus is the clearest example. Built during my cybersecurity internship at exida, it puts five open-weight models on local hardware behind a router that chooses between them, adds retrieval over the organisation’s own documents, and reads P&ID engineering drawings through a vision pipeline. Nothing it processes leaves the premises.',
  'The smaller projects are where I try things that don’t have to survive an audit — a travel planner that works in fifteen languages, a link shortener that counts its own clicks, a watcher that tells me when a price drops.',
];

/* His words, kept unpolished on purpose — the clipped run is the least fluent
   writing here and that is exactly its value. "auto-switcher" stays over the
   site's own word "router" for the same reason: it is his. */
export const ASIDE = [
  'The companies we worked with couldn’t send their data to a cloud model. That’s the entire reason this runs locally.',
  'I built the first version on Qwen 2.5 and had to rebuild it. The RAG pipeline didn’t work. The auto-switcher didn’t work. I fixed them.',
];

/* The pull quote. the reference site's is "It doesn't matter where you start, it's how you
   progress from there." set in serif beside his signature. */
export const PULL_QUOTE = 'Nothing it processes leaves the premises.';

export const NEXUS = {
  title: 'NEXUS',
  kicker: 'Private AI infrastructure · exida Middle East · 2026',
  href: 'https://github.com/DhanushKrishna4/Nexus',
  lede: 'Some places cannot send a single token to a cloud provider. Regulated data, air-gapped networks, client drawings that legally cannot leave the building. Nexus is a complete AI workbench for those places — five open-weight models on local hardware, a router that picks between them, retrieval over the organisation’s own documents, and a vision pipeline aimed at engineering diagrams.',
  facts: [
    { k: 'Models served locally', v: '5' },
    { k: 'Largest', v: '122B' },
    { k: 'Tokens sent to the cloud', v: '0' },
  ],
  detail: [
    {
      k: 'Blueprint analyzer',
      v: 'Reads instrument tags off P&ID engineering drawings and cross-references them against failure-mode data. The reason the whole thing exists: that reading was done by hand before, and exida are using it now.',
    },
    {
      k: 'Sandboxed execution',
      v: 'Model-written code runs behind three escalating tiers — static denylist, hard resource limits, then filesystem isolation via bubblewrap with an unshare fallback.',
    },
    {
      k: 'Retrieval',
      v: 'Documents ingested into ChromaDB through a dedicated embedding model, so answers are grounded in the corpus instead of the model’s memory.',
    },
    {
      k: 'Deployment',
      v: 'Separate provisioning paths for a cloud H200 and an on-prem workstation, supervised as systemd services with documented persistence.',
    },
  ],
  stack: ['Python', 'Open WebUI', 'Ollama', 'ChromaDB', 'Qwen', 'bubblewrap', 'systemd'],
};

export interface Project {
  n: string;
  title: string;
  kind: string;
  year: string;
  blurb: string;
  /* What changed because it exists. Omitted rather than padded — the repos carry
     no stars, no deployment and no traffic, so for most of these the honest
     outcome is that nothing changed and they were built to learn. */
  outcome?: string;
  stack: string[];
  href: string;
}

export const PROJECTS: Project[] = [
  {
    n: '01',
    title: 'Nexus',
    kind: 'Private AI infrastructure',
    year: '2026',
    blurb:
      'Five open-weight models on local hardware behind a router that picks between them, with retrieval over the organisation’s own documents and a vision pipeline aimed at engineering drawings.',
    outcome: 'Built at exida Middle East. They are using it.',
    stack: ['Python', 'Ollama', 'ChromaDB', 'Qwen'],
    href: 'https://github.com/DhanushKrishna4/Nexus',
  },
  {
    n: '02',
    title: 'VoiceGuide AI',
    kind: 'Multilingual voice interface',
    year: '2025',
    blurb:
      'Tell it a destination in whichever of the 15+ supported languages you speak, and it plans the days out — two languages side by side, read aloud, with a PDF at the end. We built it as Team AI-Yo.',
    outcome: 'Coursework. We took the best grade of about sixty groups.',
    stack: ['Python', 'Azure OpenAI', 'Azure Speech', 'Streamlit'],
    href: 'https://github.com/DhanushKrishna4/VoiceGuideAI',
  },
  {
    n: '03',
    title: 'URL Shortener',
    kind: 'HTTP service',
    year: '2025',
    blurb: 'Long links in, three-character keys out, and it counts the clicks as they happen.',
    stack: ['FastAPI', 'SQLite', 'Uvicorn'],
    href: 'https://github.com/DhanushKrishna4/URL-Shortener',
  },
  {
    n: '04',
    title: 'Stock Dashboard',
    kind: 'Data visualisation',
    year: '2025',
    blurb:
      'Pulls live prices through yfinance and draws them as charts you can zoom into. One click exports the series as CSV.',
    stack: ['Streamlit', 'Plotly', 'Pandas'],
    href: 'https://github.com/DhanushKrishna4/Stock-Dashboard',
  },
  {
    n: '05',
    title: 'AI Summarizer',
    kind: 'Applied LLM',
    year: '2025',
    blurb:
      'I gave it a demo mode so the interface still works without an API key. The rest of it takes a long PDF and cuts it to what matters.',
    stack: ['Python', 'OpenAI API', 'PyPDF2'],
    href: 'https://github.com/DhanushKrishna4/AI-Summarizer',
  },
  {
    n: '06',
    title: 'Price Tracker',
    kind: 'Scheduled automation',
    year: '2025',
    blurb: 'It watches listings on a schedule and tells me the moment a price crosses what I set.',
    stack: ['Python', 'BeautifulSoup', 'Requests'],
    href: 'https://github.com/DhanushKrishna4/Price-Tracker',
  },
];

export interface Role {
  title: string;
  org: string;
  period: string;
  blurb: string;
}

export const EXPERIENCE: Role[] = [
  {
    title: 'Cybersecurity Intern',
    org: 'exida Middle East',
    period: 'Jan – Jul 2026',
    blurb: 'Cybersecurity work alongside building Nexus, the locally-hosted LLM pipeline that reads P&ID drawings.',
  },
  {
    title: 'Engineering Intern',
    org: 'Zublin STRABAG UAE',
    period: 'Jul – Aug 2025',
    blurb: "Virtual machines and networks supporting the company's IT infrastructure.",
  },
  {
    title: 'Engineering Intern',
    org: 'Standard Global Quality Certificates',
    period: 'Jun – Aug 2024',
    blurb: 'Data entry, organisation and reporting in Excel supporting quality-service operations.',
  },
];

export const SKILLS = [
  { k: 'Languages', v: ['Python', 'Java', 'C', 'SQL', 'JavaScript'] },
  { k: 'AI / ML', v: ['LLMs', 'RAG', 'Ollama', 'ChromaDB', 'Azure OpenAI', 'Vision models'] },
  { k: 'Backend', v: ['FastAPI', 'Streamlit', 'SQLite', 'Pandas'] },
  { k: 'Systems', v: ['Open WebUI', 'systemd', 'bubblewrap', 'Git'] },
];

/* The logo row. the reference site runs partner brands; the honest equivalent on a portfolio
   is what the work is actually built with. Set as wordmarks, not fake logos. */
export const STACK_ROW = ['Python', 'PyTorch', 'Ollama', 'ChromaDB', 'FastAPI', 'Azure', 'AWS', 'Git'];

/* Held as data rather than a hand-written sentence so the count and the issuer list can
   never drift from the truth — FACTS.certs below is derived from this array, so adding
   one here is the whole edit. Order is newest issuer group first. */
export const CERTS = [
  { name: 'Transform your business with AI', issuer: 'Microsoft', year: 2026 },
  { name: 'Scale AI in your organization', issuer: 'Microsoft', year: 2026 },
  { name: 'Embrace responsible AI principles and practices', issuer: 'Microsoft', year: 2026 },
  { name: 'Create business value with AI', issuer: 'Microsoft', year: 2026 },
  { name: 'Leverage AI tools and resources for your business', issuer: 'Microsoft', year: 2026 },
  { name: 'Planning a Generative AI Project', issuer: 'AWS', year: 2026 },
  { name: 'Introduction to Generative AI — Art of the Possible', issuer: 'AWS', year: 2026 },
  { name: 'Introduction to Generative AI', issuer: 'Google Cloud', year: 2026 },
];

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve'];
const CERT_ISSUERS = CERTS.map((c) => c.issuer).filter((v, i, a) => a.indexOf(v) === i);
const CERT_YEAR = Math.max(...CERTS.map((c) => c.year));

export const FACTS = {
  education: 'B.E. Computer Science — BITS Pilani Dubai, 2022–2026',
  /* The aggregate, not the enumeration. The .skills grid gives every row one line and
     reads as supporting detail; eight rows of course titles would both swamp the block
     and invite the reader to weigh each one, which is the weaker case. Count plus
     issuers is the stronger single fact. Full list is in CERTS above if this ever
     wants to become its own block. */
  certs: `${COUNT_WORDS[CERTS.length] ?? CERTS.length} in AI — ${CERT_ISSUERS.join(' · ')}, ${CERT_YEAR}`,
  languages: 'English & Malayalam · Hindi · Spanish & French (A1)',
};

export const NAV = [
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'record', label: 'Track record' },
  { id: 'contact', label: 'Contact' },
];
