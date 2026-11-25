// Media for each project lives in /public/media/<slug>/ and is listed in
// media.json: screenshots (scripts/capture-media.mjs) and, for the live demos,
// a clip of the demo in use first (scripts/record-clips.mjs).
// Each entry: { src, w, h, alt, cover?, video?, poster? }.
import manifest from './media.json';
import cardArt from './card-art.json';

export const mediaFor = (slug) => manifest[slug] ?? [];

export const coverFor = (slug) => {
  const list = (manifest[slug] ?? []).filter((m) => !m.video);
  return list.find((m) => m.cover) ?? list[0] ?? null;
};

// Gallery images on the project page, in order (the first is the cover).
export const galleryFor = (slug) => manifest[slug] ?? [];

// The picture on a project's card: drawn for the card (scripts/covers), with a
// depth map for the cards' hover; the cover screenshot where there is none.
// Each: { src, w, h, depth? }.
export const cardFor = (slug) => cardArt[slug] ?? coverFor(slug);
