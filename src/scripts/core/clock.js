// Local time in Abu Dhabi, shown in the footer and on the contact page.
const format = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });

export function updateClocks(root = document) {
  const now = format.format(new Date());
  root.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = now));
}

export function startClock() {
  updateClocks();
  setInterval(updateClocks, 20_000);
}
