import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Three voices. Bodoni carries the editorial one, Mona Sans everything that has
   to be read quickly, JetBrains Mono the small technical labels.

   The Didone was dropped for one commit on the argument that a fashion-editorial
   register fights red and black. It does, in theory. In practice a page that is
   entirely grotesk lost the one soft, human thing on it and read as anonymous —
   which was the counter-argument at the time, and it was the right one. */
/* The standard cut, not the default one.
   The package ships three builds and the bare import gives the weight-only
   file: font-weight 200..900, no width axis at all. His statement sets
   'wdth' 93, and against a font with no such axis that instruction is silently
   ignored — same family, same declaration, type 12% wider than his. This build
   declares font-stretch: 75% 125% and actually carries it. */
import '@fontsource-variable/bodoni-moda';
import '@fontsource-variable/mona-sans/standard.css';
import '@fontsource-variable/jetbrains-mono';
import './styles/index.css';

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
