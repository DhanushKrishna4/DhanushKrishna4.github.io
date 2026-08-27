import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* One family and one monospace, where there used to be a grotesk and a Didone.
   Bodoni carried the editorial voice; a Didone is a fashion-editorial register
   — hairline thins, vertical stress, 18th century — and it fought the dark red
   and black it now sits in. Mona Sans takes both roles: narrow for reading,
   expanded caps for display, which is one family doing what two used to.
   JetBrains Mono carries the small technical labels — the eyebrows and the
   telemetry line — where a monospace says what the content is. */
/* The standard cut, not the default one.
   The package ships three builds and the bare import gives the weight-only
   file: font-weight 200..900, no width axis at all. His statement sets
   'wdth' 93, and against a font with no such axis that instruction is silently
   ignored — same family, same declaration, type 12% wider than his. This build
   declares font-stretch: 75% 125% and actually carries it. */
import '@fontsource-variable/mona-sans/standard.css';
import '@fontsource-variable/jetbrains-mono';
import './styles/index.css';

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
