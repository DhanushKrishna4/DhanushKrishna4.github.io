// Every piece of site-wide copy lives here so it can be edited in one place.
// Written new for this site: the facts come from his CV, LinkedIn and project
// write-ups, but none of their wording is reused.

export const site = {
  name: 'Dhanush Krishna',
  first: 'Dhanush',
  last: 'Krishna',
  description:
    'Dhanush Krishna builds machine learning tools and systems software from scratch. Eight of his projects run live in the browser.',
  url: 'https://dhanushkrishna4.github.io',

  email: 'dhanushk0611@gmail.com',
  github: 'https://github.com/DhanushKrishna4',
  linkedin: 'https://www.linkedin.com/in/dhanushkrishna0611/',

  // pill: the three lines in the opening screen's pill, like Dennis's "Located / in the / Netherlands"
  location: { pill: ['Based', 'in', 'Abu Dhabi'], place: 'Abu Dhabi', country: 'United Arab Emirates' },
  timeZone: 'Asia/Dubai',
  timeZoneLabel: 'GST',

  role: ['Machine learning', '& systems engineer'],
  availability: 'Open to software, machine learning and data roles',
  edition: '2026 edition',

  home: {
    intro: {
      lines: ['Machine learning', 'and systems, from scratch'],
      body: [
        "I'm a Computer Science graduate from BITS Pilani Dubai. I like rebuilding the parts most projects import: an autodiff engine, a SQL optimizer, a path tracer.",
        'Each of my main projects runs in your browser, so you can try it instead of reading about it.',
      ],
      button: 'About me',
    },
    work: {
      title: 'Selected work',
      note: 'Machine learning and systems projects built from scratch, most of them running live in your browser.',
      button: 'All work',
    },
  },

  footer: {
    title: ["Let's work", 'together'],
    button: 'Get in touch',
  },

  about: {
    title: ['Machine learning and systems,', 'one layer down'],
    body: [
      "I'm Dhanush, a Computer Science graduate from BITS Pilani Dubai, based in Abu Dhabi.",
      'Most of my projects take something that is usually a library call and build it myself, then check it against an independent reference. They run in the browser, so every step is on screen.',
    ],
    button: 'Contact',
    // Giant words behind "What I work on" that light up under the cursor.
    backdrop: ['Built', 'from', 'scratch'],
    areas: [
      {
        title: 'Machine learning',
        items: ['Automatic differentiation', 'Causal inference', 'Bayesian inference', 'Neural cellular automata', 'Retrieval-augmented generation'],
      },
      {
        title: 'Systems',
        items: ['Rust and WebAssembly', 'WebGPU and WGSL', 'Query engines', 'Consensus and simulation testing', 'Path tracing'],
      },
      {
        title: 'Applied AI',
        items: ['Local LLMs with Ollama', 'ChromaDB and Open WebUI', 'Azure OpenAI and speech', 'Streamlit and FastAPI apps'],
      },
    ],
    experience: [
      {
        role: 'Cybersecurity Intern',
        company: 'exida Middle East',
        dates: 'Jan 2026 – Jul 2026',
        note: 'Security work, and a locally hosted pipeline that reads P&ID engineering drawings. Nexus came out of this internship.',
      },
      {
        role: 'Tech Intern',
        company: 'Zublin Strabag UAE',
        dates: 'Jul 2025 – Aug 2025',
        note: "Virtual machines and networks for the company's IT infrastructure.",
      },
      {
        role: 'Intern',
        company: 'Standard Global Quality Certificates',
        dates: 'Jun 2024 – Aug 2024',
        note: 'Data entry, organisation and reporting in Excel.',
      },
    ],
    education: [{ title: 'BE Computer Science', place: 'BITS Pilani, Dubai Campus', dates: '2022 – 2026' }],
    // Each links to its credential (the AWS ones to the certification on
    // his LinkedIn, which is where those live).
    certifications: [
      {
        issuer: 'Google Cloud',
        items: [{ title: 'Introduction to Generative AI', href: 'https://www.skills.google/public_profiles/3a4ed796-58fe-4d1a-8f86-8e1a7e254f77/badges/23848521' }],
      },
      {
        issuer: 'AWS',
        items: [
          { title: 'Introduction to Generative AI: Art of the Possible', href: 'https://www.linkedin.com/in/dhanushkrishna0611/overlay/Certifications/1495922388/treasury/?profileId=ACoAAF_0qzQBUalo7qaT9ZaT_Ibh7F_VxBnxtC0' },
          { title: 'Planning a Generative AI Project', href: 'https://www.linkedin.com/in/dhanushkrishna0611/overlay/Certifications/1226319404/treasury/?profileId=ACoAAF_0qzQBUalo7qaT9ZaT_Ibh7F_VxBnxtC0' },
        ],
      },
      {
        issuer: 'Microsoft',
        items: [
          { title: 'Leverage AI tools and resources for your business', href: 'https://learn.microsoft.com/en-us/users/dhanushkrishna-6490/achievements/u7pmetn3?ref=https%3A%2F%2Fwww.linkedin.com%2F' },
          { title: 'Create business value with AI', href: 'https://learn.microsoft.com/en-us/users/dhanushkrishna-6490/achievements/jhawrkdt?ref=https%3A%2F%2Fwww.linkedin.com%2F' },
          { title: 'Embrace responsible AI principles and practices', href: 'https://learn.microsoft.com/en-us/users/dhanushkrishna-6490/achievements/7dug72cz?ref=https%3A%2F%2Fwww.linkedin.com%2F' },
          { title: 'Scale AI in your organization', href: 'https://learn.microsoft.com/en-us/users/dhanushkrishna-6490/achievements/u7b4uv23?ref=https%3A%2F%2Fwww.linkedin.com%2F' },
          { title: 'Transform your business with AI', href: 'https://learn.microsoft.com/en-us/users/dhanushkrishna-6490/achievements/3zdk3m2h?ref=https%3A%2F%2Fwww.linkedin.com%2F' },
        ],
      },
    ],
    languages: ['English', 'Malayalam', 'Hindi'],
  },

  contact: {
    title: ['Send me', 'a message'],
    questions: [
      { id: 'name', label: "What's your name?", placeholder: 'Your name', type: 'text', autocomplete: 'name' },
      { id: 'email', label: "What's your email?", placeholder: 'you@example.com', type: 'email', autocomplete: 'email' },
      { id: 'topic', label: "What's it about?", placeholder: 'A role, a project, a question', type: 'text', autocomplete: 'off' },
      { id: 'message', label: 'Your message', placeholder: 'Hi Dhanush, …', type: 'textarea', autocomplete: 'off' },
    ],
    button: 'Send',
    note: 'Opens your email app with the message filled in.',
  },

  menu: {
    links: [
      { label: 'Home', href: '/' },
      { label: 'Work', href: '/work/' },
      { label: 'About', href: '/about/' },
      { label: 'Contact', href: '/contact/' },
    ],
    contact: 'Get in touch',
  },
};
