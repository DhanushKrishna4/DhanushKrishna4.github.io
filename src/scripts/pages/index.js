// Picks the module for the page that was just swapped in, and gives the
// background its colours (project pages bring their own palette).
import { mountCommon } from './common.js';
import { mountHome } from './home.js';
import { mountWork } from './work.js';
import { mountProject } from './project.js';
import { mountAbout } from './about.js';
import { mountContact } from './contact.js';
import { mountNotFound } from './notfound.js';
import { themeFromPalette } from '../gl/field.js';

const modules = {
  home: mountHome,
  work: mountWork,
  project: mountProject,
  about: mountAbout,
  contact: mountContact,
  notfound: mountNotFound,
};

// ctx.instant: take the page's colours at once (the screen is covered).
// ctx.keepTheme: leave the colours as they are; the router changes them.
export function mountPage(root, ctx) {
  const theme = root.dataset.theme ? JSON.parse(root.dataset.theme) : null;
  if (!ctx.keepTheme) ctx.gl?.setTheme(theme ? themeFromPalette(theme) : null, ctx.first || ctx.instant);
  const mount = modules[root.dataset.page] ?? ((r, c) => mountCommon(r, c));
  return mount(root, ctx);
}
