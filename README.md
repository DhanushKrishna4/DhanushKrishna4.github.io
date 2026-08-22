# Dhanush Krishna — Portfolio

Single-page portfolio for a final-year Computer Science student in Abu Dhabi,
working in machine learning and cybersecurity.

**[dhanushkrishna4.github.io](https://dhanushkrishna4.github.io)**

## What's on it

Seven sections, read top to bottom:

| | |
|---|---|
| **Hero** | Name, a status card, and a faceted orb rendered in three.js |
| **Marquee** | A band of running type under the opening |
| **Statement** | The thesis, set as the largest type on the page |
| **Work** | Six projects — Nexus, VoiceGuide AI, URL Shortener, Stock Dashboard, AI Summarizer, Price Tracker |
| **About** | The longer version, with a pull quote |
| **Track record** | Internships, skills and the stack behind them |
| **Contact** | Links, availability, and a mail button |

## How it's built

No CSS framework and no component library — every element is written by hand.

- **Vite 8**, **React 19**, **TypeScript**
- **GSAP** + ScrollTrigger for everything scroll-driven
- **Lenis** for smooth scrolling
- **three.js** for the hero object
- Mona Sans, Bodoni Moda and Archivo, self-hosted via Fontsource

A few things worth knowing if you read the source:

- **One canvas, not seven.** The contour field behind the page is a single fixed
  layer the whole document scrolls over, so there is no seam where two sections
  meet.
- **The grounds change by scrubbing, not switching.** Colour is animated across
  the join between sections rather than flipping at the boundary, so you cannot
  point at where one ground became the next.
- **Text arrives a line at a time.** Each line is clipped and sits under a solid
  block; what you watch is the block leaving. Links roll character by character
  on hover, each letter on its own clock.
- **Shapes are measured, not declared.** The work-card outlines and the footer
  card's silhouette are drawn from measured boxes at runtime, so they hold their
  proportions at any width.

## Running it

```bash
npm install
npm run dev      # dev server
npm run build    # production build to dist/
npm run lint     # oxlint
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages.
