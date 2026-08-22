# Dhanush Krishna — Portfolio

My personal portfolio. Dark, motion-led and built from scratch: a fixed contour
field the whole page scrolls over, colour grounds that scrub into one another
rather than meeting on an edge, and per-line scroll reveals throughout.

Live at **[dhanushkrishna4.github.io](https://dhanushkrishna4.github.io)**.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **GSAP** with ScrollTrigger for the scroll-driven work
- **Lenis** for smooth scrolling
- **three.js** for the hero
- Hand-written CSS — no framework

## Running it

```bash
npm install
npm run dev      # dev server
npm run build    # production build to dist/
npm run lint     # oxlint
```

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`.

## Notes on the code

The CSS carries long comments explaining why particular numbers are what they
are — sizes measured rather than guessed, easing curves matched to a reference,
and a record of the things that turned out to be measurement errors rather than
layout bugs. They are there deliberately; the reasoning is the part that is easy
to lose.
