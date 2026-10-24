/* Content ported from portfolio-opus5. Facts follow LinkedIn with Dhanush's
   confirmed corrections. Nothing invented, nothing padded.

   Regrouped for this site's sections rather than copied wholesale: the reference site
   structure wants a different shape — one statement, one story, a gallery of
   named things, one featured piece — so the same facts are cut differently. */

export const SITE = {
  name: 'Dhanush Krishna',
  first: 'DHANUSH',
  last: 'KRISHNA',
  role: 'Machine Learning & Systems',
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

/* Two independent lines; each repeats in its own moving track. */
export const MARQUEE = ['MACHINE LEARNING', 'SOFTWARE & SYSTEMS'] as const;

/* Explicit line breaks preserve the oversized serif/sans reveal on narrow screens. */
export const STATEMENT = [
  { t: 'I WORK ON', em: false },
  { t: 'MACHINE LEARNING', em: true },
  { t: 'AND SYSTEMS SOFTWARE.', em: false },
  { t: 'SOME PROJECTS SOLVE', em: false },
  { t: 'PRACTICAL PROBLEMS.', em: true },
  { t: 'OTHERS START WITH', em: false },
  { t: 'SOMETHING I WANT', em: false },
  { t: 'TO FIGURE OUT.', em: false },
];

export const ABOUT = [
  'I’m a Computer Science graduate of BITS Pilani Dubai, based in Abu Dhabi. My main focus is machine learning in Python: building the tools that train models, explore cause and effect, and estimate uncertainty.',
  'My recent work is Forge, a deep-learning framework and WebGPU compiler; Meridian, a causal inference lab; Mycelium, a neural cellular automata lab; and Posterior, a Bayesian inference engine. All four have interactive browser demos that run the Python code locally.',
  'Alongside those, I build systems in Rust, TypeScript and WGSL: Loom for language-model inference, Escapement for distributed consensus, Orrery for SQL queries, and Lucida for path tracing. Their browser demos let you inspect the computation as it happens.',
  'On the application side, I built Nexus, an AI workbench for documents and engineering drawings, during my internship at exida Middle East. My other work includes VoiceGuide AI, a multilingual travel planner, and backend services with FastAPI.',
  'The smaller projects are where I try things that don’t have to survive an audit — a link shortener that counts its own clicks, a stock dashboard, a PDF summarizer, and a watcher that tells me when a price drops.',
];

export const ASIDE = [
  'Writing the autodiff engine, sampler or query planner myself gives me a closer look at what the libraries normally handle.',
  'The demos let you explore that work too: change the inputs, inspect intermediate results, and compare what the algorithms produce.',
];

export const PULL_QUOTE = 'I like understanding the tools I use.';

export interface Project {
  n: string;
  title: string;
  kind: string;
  year: string;
  blurb: string;
  /* A checkable result: validation evidence, measured behaviour or adoption.
     Omit it when there is no supported claim to make. */
  outcome?: string;
  stack: string[];
  href: string;
  /* The card opens the running project when available; source stays a separate link. */
  live?: string;
  /* Actual computed states captured from `live`, shown on hover. 4:5 for the cards. */
  shot?: string;
}

export const PROJECTS: Project[] = [
  {
    n: '01',
    title: 'Forge',
    kind: 'Deep learning & GPU compilation',
    year: '2026',
    blurb:
      'A Python deep-learning framework with its own tensor graph, autodiff engine and WebGPU compiler. Train a network in the browser, then inspect its gradients, generated shaders and memory use.',
    outcome: 'Numerical operations checked against PyTorch; CPU and WebGPU paths validated separately.',
    stack: ['Python', 'NumPy', 'WebGPU', 'WGSL'],
    href: 'https://github.com/DhanushKrishna4/Forge',
    live: 'https://dhanushkrishna4.github.io/Forge/',
    shot: '/shots/forge.webp',
  },
  {
    n: '02',
    title: 'Meridian',
    kind: 'Causal machine learning',
    year: '2026',
    blurb:
      'Different causal models can explain the same observations. Compare those explanations, choose an intervention, and explore counterfactuals in a Python lab that makes its assumptions explicit.',
    outcome: 'PC-stable and NOTEARS checked against independent implementations.',
    stack: ['Python', 'NumPy', 'SciPy', 'Pyodide'],
    href: 'https://github.com/DhanushKrishna4/Meridian',
    live: 'https://dhanushkrishna4.github.io/Meridian/',
    shot: '/shots/meridian.webp',
  },
  {
    n: '03',
    title: 'Mycelium',
    kind: 'Neural cellular automata',
    year: '2026',
    blurb:
      'A tiny neural network learns how each cell should update from its neighbours. Grow a pattern from one cell, cut into it, and compare how different training regimes affect its recovery.',
    outcome: 'Five trained models, with growth, persistence and repair measured separately.',
    stack: ['Python', 'PyTorch', 'NumPy', 'Pyodide'],
    href: 'https://github.com/DhanushKrishna4/Mycelium',
    live: 'https://dhanushkrishna4.github.io/Mycelium/',
    shot: '/shots/mycelium.webp',
  },
  {
    n: '04',
    title: 'Posterior',
    kind: 'Bayesian inference',
    year: '2026',
    blurb:
      'A Python inference engine with HMC, slice-based NUTS and variational inference. Run multiple chains in the browser, inspect how they move, and compare their estimates with reference distributions.',
    outcome: 'Checked against exact solutions and independent references, with failed cases retained.',
    stack: ['Python', 'NumPy', 'SciPy', 'Pyodide'],
    href: 'https://github.com/DhanushKrishna4/Posterior',
    live: 'https://dhanushkrishna4.github.io/Posterior/',
    shot: '/shots/posterior.webp',
  },
  {
    n: '05',
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
    n: '06',
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
    n: '07',
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
    n: '08',
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
    n: '09',
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
    n: '10',
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
    n: '11',
    title: 'URL Shortener',
    kind: 'HTTP service',
    year: '2025',
    blurb: 'Long links in, three-character keys out, and it counts the clicks as they happen.',
    stack: ['FastAPI', 'SQLite', 'Uvicorn'],
    href: 'https://github.com/DhanushKrishna4/URL-Shortener',
  },
  {
    n: '12',
    title: 'Stock Dashboard',
    kind: 'Data visualisation',
    year: '2025',
    blurb:
      'Pulls live prices through yfinance and draws them as charts you can zoom into. One click exports the series as CSV.',
    stack: ['Streamlit', 'Plotly', 'Pandas'],
    href: 'https://github.com/DhanushKrishna4/Stock-Dashboard',
  },
  {
    n: '13',
    title: 'AI Summarizer',
    kind: 'Applied LLM',
    year: '2025',
    blurb:
      'I gave it a demo mode so the interface still works without an API key. The rest of it takes a long PDF and cuts it to what matters.',
    stack: ['Python', 'OpenAI API', 'PyPDF2'],
    href: 'https://github.com/DhanushKrishna4/AI-Summarizer',
  },
  {
    n: '14',
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
    blurb: 'Cybersecurity work and development of Nexus, a Python-based AI workbench for documents and engineering drawings.',
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
  { k: 'ML methods', v: ['Autodiff', 'Causal inference', 'Bayesian inference', 'Neural cellular automata'] },
  { k: 'Scientific Python', v: ['NumPy', 'SciPy', 'PyTorch', 'Pyodide'] },
  { k: 'AI / ML', v: ['LLMs', 'RAG', 'Ollama', 'ChromaDB', 'Azure OpenAI', 'Vision models'] },
  { k: 'Backend', v: ['FastAPI', 'Streamlit', 'SQLite', 'Pandas'] },
  { k: 'Systems', v: ['WebAssembly', 'WebGPU', 'WGSL', 'Open WebUI', 'systemd', 'bubblewrap', 'Git'] },
];

/* The logo row. the reference site runs partner brands; the honest equivalent on a portfolio
   is what the work is actually built with. Set as wordmarks, not fake logos. */
export const STACK_ROW = ['Python', 'NumPy', 'SciPy', 'PyTorch', 'Rust', 'WebAssembly', 'WebGPU', 'Ollama', 'ChromaDB', 'FastAPI', 'Azure', 'AWS', 'Git'];

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
