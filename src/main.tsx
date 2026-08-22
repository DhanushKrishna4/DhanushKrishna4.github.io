import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Two families. Bodoni carries the editorial voice, Mona Sans does everything
   that has to be read quickly. Both variable, so weight is an axis rather than
   a separate request per cut. */
import '@fontsource-variable/bodoni-moda';
/* The standard cut, not the default one.
   The package ships three builds and the bare import gives the weight-only
   file: font-weight 200..900, no width axis at all. His statement sets
   'wdth' 93, and against a font with no such axis that instruction is silently
   ignored — same family, same declaration, type 12% wider than his. This build
   declares font-stretch: 75% 125% and actually carries it. */
import '@fontsource-variable/mona-sans/standard.css';
import './styles/index.css';

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
