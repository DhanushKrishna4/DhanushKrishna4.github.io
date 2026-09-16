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
  'I’m a Computer Science graduate of BITS Pilani Dubai, based in Abu Dhabi. The work I take on has hard constraints attached: regulated data, air-gapped networks, and whatever hardware is already in the building.',
  'Nexus is the clearest example. Built during my cybersecurity internship at exida, it puts five open-weight models on local hardware behind a router that chooses between them, adds retrieval over the organisation’s own documents, and reads P&ID engineering drawings through a vision pipeline. Nothing it processes leaves the premises.',
  'The rest is systems work: four engines written from scratch in Rust and compiled to WebAssembly, each one running in a browser tab with no server behind it — a language model’s forward pass, a Raft cluster under deterministic simulation, a SQL query engine, a path tracer. Every one of them is checked against an independent implementation rather than against my own expectations.',
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
  /* The one claim on the card a reader could go and check. For the early
     projects that is who used it and what it was for; for the Rust engines it
     is what the thing was validated against, which is the strongest honest
     statement available about a repository with no users. Omitted rather than
     padded — several of these carry no stars, no deployment and no traffic, and
     "used by teams across the region" under one of those is the single kind of
     lie on a portfolio that gets checked, and checked easily. */
  outcome?: string;
  stack: string[];
  href: string;
  /* A build of the project itself, running in the reader's own tab. Only four
     of these have one and it is the whole point of those four — a path tracer
     you can watch converge argues better than any sentence about it — so the
     card itself leads here, and the repository moves to a second link. */
  live?: string;
  /* A screenshot of `live`, taken from the running thing rather than mocked:
     Loom's attention heatmap, Escapement mid-election with a leader, Orrery's
     plan for a query it just ran, Lucida's Cornell box at 1,830 samples. Shown
     on hover. 4:5 to match the card. */
  shot?: string;
}

export const PROJECTS: Project[] = [
  {
    n: '01',
    title: 'Loom',
    kind: 'LLM inference engine',
    year: '2026',
    blurb:
      'A language model running in a browser tab — no backend, no ML libraries, the forward pass written out by hand. Eighteen tokens a second, and a revisit loads from cache in under a second.',
    outcome: 'Byte-identical to the native build, and agrees with PyTorch layer by layer.',
    stack: ['Rust', 'WebAssembly', 'GGUF', 'TypeScript'],
    href: 'https://github.com/DhanushKrishna4/Loom',
    live: 'https://dhanushkrishna4.github.io/Loom/',
    shot: '/shots/loom.webp',
  },
  {
    n: '02',
    title: 'Escapement',
    kind: 'Distributed consensus',
    year: '2026',
    blurb:
      'A Raft implementation that never touches a clock, a socket or a random number — the simulator owns all three. So a run is a pure function of its seed, and any failure replays exactly.',
    outcome: 'Every bug the fuzzer found is written up with the seed that reproduces it.',
    stack: ['Rust', 'WebAssembly', 'TypeScript'],
    href: 'https://github.com/DhanushKrishna4/Escapement',
    live: 'https://dhanushkrishna4.github.io/Escapement/',
    shot: '/shots/escapement.webp',
  },
  {
    n: '03',
    title: 'Orrery',
    kind: 'SQL query engine',
    year: '2026',
    blurb:
      'Lexer, parser, optimizer and every operator run in the page, with no backend and no dependencies at all. Type a query and watch each rewrite, and what the plan predicted beside what it cost.',
    outcome: 'Faster than sql.js on 13 of the 15 queries measured, by as much as 128×.',
    stack: ['Rust', 'WebAssembly', 'TypeScript'],
    href: 'https://github.com/DhanushKrishna4/Orrery',
    live: 'https://dhanushkrishna4.github.io/Orrery/',
    shot: '/shots/orrery.webp',
  },
  {
    n: '04',
    title: 'Lucida',
    kind: 'Physically-based rendering',
    year: '2026',
    blurb:
      'A Monte Carlo path tracer living entirely in WebGPU compute shaders — intersection, acceleration structure and light transport all written here, then diffed against an independent CPU tracer.',
    outcome: 'Convergence measured against sixteen independent renders rather than assumed.',
    stack: ['Rust', 'WGSL', 'WebGPU', 'TypeScript'],
    href: 'https://github.com/DhanushKrishna4/Lucida',
    live: 'https://dhanushkrishna4.github.io/Lucida/',
    shot: '/shots/lucida.webp',
  },
  {
    n: '05',
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
    n: '06',
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
    n: '07',
    title: 'URL Shortener',
    kind: 'HTTP service',
    year: '2025',
    blurb: 'Long links in, three-character keys out, and it counts the clicks as they happen.',
    stack: ['FastAPI', 'SQLite', 'Uvicorn'],
    href: 'https://github.com/DhanushKrishna4/URL-Shortener',
  },
  {
    n: '08',
    title: 'Stock Dashboard',
    kind: 'Data visualisation',
    year: '2025',
    blurb:
      'Pulls live prices through yfinance and draws them as charts you can zoom into. One click exports the series as CSV.',
    stack: ['Streamlit', 'Plotly', 'Pandas'],
    href: 'https://github.com/DhanushKrishna4/Stock-Dashboard',
  },
  {
    n: '09',
    title: 'AI Summarizer',
    kind: 'Applied LLM',
    year: '2025',
    blurb:
      'I gave it a demo mode so the interface still works without an API key. The rest of it takes a long PDF and cuts it to what matters.',
    stack: ['Python', 'OpenAI API', 'PyPDF2'],
    href: 'https://github.com/DhanushKrishna4/AI-Summarizer',
  },
  {
    n: '10',
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
  { k: 'Languages', v: ['Python', 'Rust', 'TypeScript', 'Java', 'C', 'SQL', 'JavaScript'] },
  { k: 'AI / ML', v: ['LLMs', 'RAG', 'Ollama', 'ChromaDB', 'Azure OpenAI', 'Vision models'] },
  { k: 'Backend', v: ['FastAPI', 'Streamlit', 'SQLite', 'Pandas'] },
  { k: 'Systems', v: ['WebAssembly', 'WebGPU', 'Open WebUI', 'systemd', 'bubblewrap', 'Git'] },
];

/* The logo row. the reference site runs partner brands; the honest equivalent on a portfolio
   is what the work is actually built with. Set as wordmarks, not fake logos. */
export const STACK_ROW = ['Python', 'Rust', 'WebAssembly', 'PyTorch', 'Ollama', 'ChromaDB', 'FastAPI', 'Azure', 'AWS', 'Git'];

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
