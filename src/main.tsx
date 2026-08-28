import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Two families. Bodoni carries the editorial voice, Mona Sans everything that
   has to be read quickly. Both are what they were before the re-theme.

   The type was reworked alongside the palette and both halves are now reverted.
   The Didone was dropped on the argument that a fashion-editorial register
   fights red and black — true in theory, and in practice an all-grotesk page
   lost the one soft thing on it and read as anonymous. A monospace was added
   for the small labels on the argument that it was content-appropriate rather
   than decorative — also true, and Mona Sans simply reads better there. */
/* The standard cut, not the default one.
   The package ships three builds and the bare import gives the weight-only
   file: font-weight 200..900, no width axis at all. His statement sets
   'wdth' 93, and against a font with no such axis that instruction is silently
   ignored — same family, same declaration, type 12% wider than his. This build
   declares font-stretch: 75% 125% and actually carries it. */
import '@fontsource-variable/bodoni-moda';
import '@fontsource-variable/mona-sans/standard.css';
import './styles/index.css';

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
