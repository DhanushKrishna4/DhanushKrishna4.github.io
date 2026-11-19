// Project data. Order here is the order on the Work page and the "next project" chain.
// colors: each project page takes on its own palette, like Lusion's project pages.
//   bg     page background
//   fg     text
//   accent links, labels and the glow around the first image
// media: screenshots in /public/media/<slug>/ (cover is used on cards).

const gh = (repo) => `https://github.com/DhanushKrishna4/${repo}`;
const demo = (repo) => `https://dhanushkrishna4.github.io/${repo}/`;

export const filters = [
  { id: 'all', label: 'All' },
  { id: 'ml', label: 'Machine learning' },
  { id: 'systems', label: 'Systems' },
  { id: 'applied', label: 'Applied AI' },
  { id: 'tools', label: 'Tools' },
];

export const projects = [
  {
    slug: 'forge',
    name: 'Forge',
    summary: 'Deep-learning framework and WebGPU compiler',
    tags: ['ml', 'systems'],
    date: 'Oct 2026',
    role: 'Solo project',
    stack: ['Python', 'NumPy', 'WebGPU', 'WGSL', 'Pyodide'],
    links: { demo: demo('Forge'), source: gh('Forge') },
    body: [
      'Forge builds tensor graphs, computes gradients with reverse-mode autodiff, and compiles the graph into WebGPU shaders.',
      'In the browser playground you can train a small network, inspect its gradients, then follow the graph through fusion and memory planning into the generated WGSL. Results are checked against PyTorch, and the CPU and WebGPU paths are validated separately.',
    ],
    colors: { bg: '#160c07', fg: '#f4e6d8', accent: '#ff7a1a' },
  },
  {
    slug: 'meridian',
    name: 'Meridian',
    summary: 'Causal inference lab',
    tags: ['ml'],
    date: 'Oct 2026',
    role: 'Solo project',
    stack: ['Python', 'NumPy', 'SciPy', 'Pyodide'],
    links: { demo: demo('Meridian'), source: gh('Meridian') },
    body: [
      "Meridian is about what observational data can and can't tell you about causes.",
      "It discovers causal graphs with PC-stable or linear NOTEARS, fits structural models, and lets you intervene on a variable or ask a counterfactual, with the model's assumptions shown alongside. Results are compared with independent implementations and exact test cases.",
    ],
    colors: { bg: '#08101f', fg: '#e3e9f4', accent: '#6fa3ff' },
  },
  {
    slug: 'mycelium',
    name: 'Mycelium',
    summary: 'Neural cellular automata that grow and repair',
    tags: ['ml'],
    date: 'Oct 2026',
    role: 'Solo project',
    stack: ['Python', 'PyTorch', 'NumPy', 'Pyodide'],
    links: { demo: demo('Mycelium'), source: gh('Mycelium') },
    body: [
      'Every cell in a grid runs the same small neural network and only sees its neighbours. Trained well, the grid grows a pattern and repairs it when damaged.',
      'Mycelium trains five of these models in PyTorch and runs them in the browser through a NumPy runtime. Grow a pattern, erase half of it, and see whether it comes back. Growth, persistence and repair are measured separately, and not every model passes.',
    ],
    colors: { bg: '#0b110a', fg: '#e6eddc', accent: '#a6d96a' },
  },
  {
    slug: 'posterior',
    name: 'Posterior',
    summary: 'Bayesian inference engine',
    tags: ['ml'],
    date: 'Oct 2026',
    role: 'Solo project',
    stack: ['Python', 'NumPy', 'SciPy', 'Pyodide'],
    links: { demo: demo('Posterior'), source: gh('Posterior') },
    body: [
      'Posterior implements Hamiltonian Monte Carlo, a slice-based No-U-Turn sampler and mean-field variational inference, on top of its own autodiff.',
      'The browser workbench runs several chains at once, shows convergence diagnostics and compares estimates with exact answers. Failed sampler runs stay in the results instead of being hidden.',
    ],
    colors: { bg: '#ece8de', fg: '#17171f', accent: '#2f45c4' },
  },
  {
    slug: 'loom',
    name: 'Loom',
    summary: 'LLM inference engine in Rust and WebAssembly',
    tags: ['systems', 'ml'],
    date: 'Sep 2026',
    role: 'Solo project',
    stack: ['Rust', 'WebAssembly', 'TypeScript', 'GGUF'],
    links: { demo: demo('Loom'), source: gh('Loom') },
    body: [
      'Loom runs Qwen2.5-0.5B entirely inside a browser tab, with no server behind it.',
      'It parses GGUF model files and does quantised matrix multiplication, attention and tokenisation itself, without ML libraries, at about 18 tokens per second. Each layer is compared with PyTorch.',
    ],
    colors: { bg: '#071413', fg: '#ddf1ec', accent: '#34d3ae' },
  },
  {
    slug: 'escapement',
    name: 'Escapement',
    summary: 'Raft consensus under deterministic simulation',
    tags: ['systems'],
    date: 'Sep 2026',
    role: 'Solo project',
    stack: ['Rust', 'WebAssembly', 'TypeScript'],
    links: { demo: demo('Escapement'), source: gh('Escapement') },
    body: [
      'Escapement implements the Raft consensus algorithm inside a simulator that controls time, the network and randomness.',
      'Every run is a pure function of its seed, so any failure replays exactly. A linearizability checker, fuzzing and failure minimisation turn bugs into small, repeatable test cases.',
    ],
    colors: { bg: '#14100a', fg: '#f0e7d3', accent: '#d4a23c' },
  },
  {
    slug: 'orrery',
    name: 'Orrery',
    summary: 'SQL query engine in Rust and WebAssembly',
    tags: ['systems'],
    date: 'Sep 2026',
    role: 'Solo project',
    stack: ['Rust', 'WebAssembly', 'SQL', 'Parquet'],
    links: { demo: demo('Orrery'), source: gh('Orrery') },
    body: [
      'Orrery is an analytical SQL engine with its own parser, binder, cost-based optimizer, vectorised operators and Parquet reader, and no engine dependencies.',
      'It runs over 7.4 million rows in a browser tab and shows every stage of a query, including each optimizer rewrite. On 13 of 15 measured queries it was faster than sql.js.',
    ],
    colors: { bg: '#e6e3ee', fg: '#16141e', accent: '#5a3fd3' },
  },
  {
    slug: 'lucida',
    name: 'Lucida',
    summary: 'Physically based path tracer in WebGPU',
    tags: ['systems'],
    date: 'Sep 2026',
    role: 'Solo project',
    stack: ['WGSL', 'WebGPU', 'Rust'],
    links: { demo: demo('Lucida'), source: gh('Lucida') },
    body: [
      'Lucida traces light through a scene in WebGPU compute shaders, with a binned-SAH bounding volume hierarchy, GGX materials and multiple importance sampling.',
      'Its images are checked against a separate CPU path tracer written in Rust, and convergence is measured across sixteen independent renders.',
    ],
    colors: { bg: '#f2eee8', fg: '#1e1915', accent: '#d2461e' },
  },
  {
    slug: 'nexus',
    name: 'Nexus',
    summary: 'Private, self-hosted AI workbench',
    tags: ['applied'],
    date: 'Jun 2026',
    role: 'Built during my internship at exida Middle East',
    stack: ['Python', 'Open WebUI', 'Ollama', 'ChromaDB'],
    links: { source: gh('Nexus') },
    body: [
      "Nexus is a ChatGPT-style assistant for places that can't send their data to cloud AI.",
      'It runs on local machines with Open WebUI, Ollama and ChromaDB, routes each request to a suitable model, answers questions over documents and reads P&ID engineering drawings.',
    ],
    colors: { bg: '#0a0c10', fg: '#e2e6eb', accent: '#4cc2e0' },
  },
  {
    slug: 'voiceguide-ai',
    name: 'VoiceGuide AI',
    summary: 'Voice-driven travel planner in 15+ languages',
    tags: ['applied'],
    date: 'Dec 2025',
    role: 'Team of five, AI engineering course',
    stack: ['Python', 'Streamlit', 'Azure OpenAI', 'Azure Speech'],
    links: { source: gh('VoiceGuideAI') },
    body: [
      'Speak a trip request in one of more than 15 languages and VoiceGuide plans an itinerary, reads it back and exports it as a PDF.',
      'Built with a team of five for an AI engineering course, using Streamlit and Azure speech and language services.',
    ],
    colors: { bg: '#170b12', fg: '#f5e7ee', accent: '#ff8a66' },
  },
  {
    slug: 'ai-summarizer',
    name: 'AI Summarizer',
    summary: 'Three-point summaries of PDFs with GPT-3.5',
    tags: ['applied'],
    date: 'Dec 2025',
    role: 'Solo project',
    stack: ['Python', 'Streamlit', 'OpenAI API', 'PyPDF2'],
    links: { source: gh('AI-Summarizer') },
    body: [
      'Upload a PDF and AI Summarizer pulls out its text with PyPDF2, then asks GPT-3.5 to condense the opening 4,000 characters into three bullet points.',
      'It is a small Streamlit app: the OpenAI key goes in the sidebar, and the extracted text can be checked before it is summarised.',
    ],
    colors: { bg: '#110d1c', fg: '#ece7f8', accent: '#a98bff' },
  },
  {
    slug: 'price-tracker',
    name: 'Price Tracker',
    summary: 'Checks a product page for price drops every minute',
    tags: ['tools'],
    date: 'Dec 2025',
    role: 'Solo project',
    stack: ['Python', 'Requests', 'Beautiful Soup', 'schedule'],
    links: { source: gh('Price-Tracker') },
    body: [
      'Every minute, Price Tracker fetches a product page, reads the title and price with Beautiful Soup, and prints an alert once the price falls below a target.',
      'It runs against books.toscrape.com, a sandbox shop built for scraping practice.',
    ],
    colors: { bg: '#0d1208', fg: '#eef3e2', accent: '#c5e84b' },
  },
  {
    slug: 'stock-dashboard',
    name: 'Stock Dashboard',
    summary: 'Price history and charts for any stock ticker',
    tags: ['tools'],
    date: 'Dec 2025',
    role: 'Solo project',
    stack: ['Python', 'Streamlit', 'yfinance', 'pandas', 'Plotly'],
    links: { source: gh('Stock-Dashboard') },
    body: [
      'Enter a ticker and a date range, and Stock Dashboard pulls the price history from Yahoo Finance and draws the closing price as an interactive Plotly chart.',
      'Below the chart sit the latest close and volume, the last ten trading days, and a CSV download of the whole range.',
    ],
    colors: { bg: '#0d0e13', fg: '#eceef4', accent: '#ff5aa0' },
  },
  {
    slug: 'url-shortener',
    name: 'URL Shortener',
    summary: 'Short links with click counts, as a FastAPI service',
    tags: ['tools'],
    date: 'Dec 2025',
    role: 'Solo project',
    stack: ['Python', 'FastAPI', 'SQLite'],
    links: { source: gh('URL-Shortener') },
    body: [
      'URL Shortener is a FastAPI service that turns a long URL into a short random key, redirects anyone who opens it, and counts every click in SQLite.',
      'A stats endpoint reports each link and its click count, and FastAPI documents the whole API at /docs.',
    ],
    colors: { bg: '#140f07', fg: '#f6eedf', accent: '#ffb547' },
  },
];

// The home page's "Selected work", in this order.
export const selectedWork = ['forge', 'meridian', 'mycelium', 'posterior', 'loom', 'escapement', 'orrery', 'lucida'].map(
  (slug) => projects.find((p) => p.slug === slug),
);

export const tagLabel = (id) => filters.find((f) => f.id === id)?.label ?? id;

export const nextProject = (slug) => {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
};

export const countFor = (id) => (id === 'all' ? projects.length : projects.filter((p) => p.tags.includes(id)).length);
