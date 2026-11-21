// Neon Coast Cover Lab — wires the editor page: photo slots, layout and
// grade pickers, caption fields, badge picker, per-panel crop controls,
// undo/redo, and PNG export. Photos are read on the user's own machine and
// never uploaded; the app makes no network request at all.
import { drawCover, exportCover, panelRects, LAYOUTS, GRADES, TITLE_STYLES, BADGES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const statusEl = document.getElementById('status');
const sizeLabel = document.getElementById('sizeLabel');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

const EXPORT_SIZES = [
  { name: 'Square', w: 1080, h: 1080 },
  { name: 'Portrait', w: 1080, h: 1350 },
  { name: 'Wide', w: 1920, h: 1080 },
];

const PHOTO_SLOTS = 3;
const PANEL_COUNT = 9;

function freshPanels() {
  const panels = [];
  for (let i = 0; i < PANEL_COUNT; i++) {
    panels.push({ photo: i % 2, zoom: 1, dx: 0, dy: 0 });
  }
  return panels;
}

const state = {
  photos: [null, null, null],
  photoNames: ['', '', ''],
  panels: freshPanels(),
  layout: 'hero',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'a Neon Coast story',
  titleStyle: 'solid',
  badge: 'none',
  exportSize: EXPORT_SIZES[0],
  selectedPanel: 0,
};

// --- undo / redo: snapshots of everything the cover is made of. --------

const past = [];
const future = [];

function snapshot() {
  return JSON.parse(JSON.stringify({
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleStyle: state.titleStyle,
    badge: state.badge,
    exportSize: state.exportSize.name,
  }));
}

function restore(snap) {
  state.panels = snap.panels;
  state.layout = snap.layout;
  state.grade = snap.grade;
  state.title = snap.title;
  state.subtitle = snap.subtitle;
  state.titleStyle = snap.titleStyle;
  state.badge = snap.badge;
  state.exportSize = EXPORT_SIZES.find((s) => s.name === snap.exportSize) || EXPORT_SIZES[0];
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  syncPickers();
}

function pushHistory() {
  past.push(snapshot());
  if (past.length > 50) past.shift();
  future.length = 0;
  syncUndoButtons();
}

function syncUndoButtons() {
  undoBtn.disabled = past.length === 0;
  redoBtn.disabled = future.length === 0;
}

undoBtn.addEventListener('click', () => {
  if (past.length === 0) return;
  future.push(snapshot());
  restore(past.pop());
  redraw();
  setStatus('Undid the last change.');
  syncUndoButtons();
});

redoBtn.addEventListener('click', () => {
  if (future.length === 0) return;
  past.push(snapshot());
  restore(future.pop());
  redraw();
  setStatus('Redid the change.');
  syncUndoButtons();
});

// --- rendering ------------------------------------------------------------

function setStatus(text) {
  statusEl.textContent = text;
}

function redraw() {
  const { w, h } = state.exportSize;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
  sizeLabel.textContent = `${w} x ${h}`;
  syncPanelControls();
}

// --- photos ---------------------------------------------------------------

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

async function loadPhotoIntoSlot(slot, fileOrUrl, name) {
  const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  const img = await loadImage(url);
  state.photos[slot] = img;
  state.photoNames[slot] = name || `Photo ${slot + 1}`;
  document.getElementById(`slotName${slot}`).textContent = state.photoNames[slot];
  redraw();
  setStatus(`${state.photoNames[slot]} loaded into slot ${slot + 1}.`);
}

// --- pickers ---------------------------------------------------------------

const pickerState = {};

function buildPicker(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  pickerState[containerId] = { entries, onPick };
  Object.entries(entries).forEach(([key, value]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick' + (key === current ? ' active' : '');
    btn.dataset.key = key;
    btn.textContent = value.name;
    btn.addEventListener('click', () => {
      pushHistory();
      onPick(key);
      syncPickers();
      redraw();
    });
    box.appendChild(btn);
  });
}

function syncPickers() {
  for (const [containerId, { entries }] of Object.entries(pickerState)) {
    const box = document.getElementById(containerId);
    const current = containerId === 'layoutPicker' ? state.layout
      : containerId === 'gradePicker' ? state.grade
      : containerId === 'stylePicker' ? state.titleStyle
      : containerId === 'badgePicker' ? state.badge
      : null;
    box.querySelectorAll('.pick').forEach((b) => {
      b.classList.toggle('active', b.dataset.key === current);
    });
    void entries;
  }
  const sizeBox = document.getElementById('sizePicker');
  sizeBox.querySelectorAll('.pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.name === state.exportSize.name);
  });
}

buildPicker('layoutPicker', LAYOUTS, state.layout, (key) => {
  state.layout = key;
  const count = LAYOUTS[key].panels;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
});
buildPicker('gradePicker', GRADES, state.grade, (key) => { state.grade = key; });
buildPicker('stylePicker', TITLE_STYLES, state.titleStyle, (key) => { state.titleStyle = key; });
buildPicker('badgePicker', BADGES, state.badge, (key) => { state.badge = key; });

const sizeBox = document.getElementById('sizePicker');
EXPORT_SIZES.forEach((size) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pick' + (size.name === state.exportSize.name ? ' active' : '');
  btn.dataset.name = size.name;
  btn.textContent = `${size.name} ${size.w}x${size.h}`;
  btn.addEventListener('click', () => {
    pushHistory();
    state.exportSize = size;
    syncPickers();
    redraw();
  });
  sizeBox.appendChild(btn);
});

// --- photo slots -----------------------------------------------------------

for (let slot = 0; slot < PHOTO_SLOTS; slot++) {
  document.getElementById(`photo${slot}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await loadPhotoIntoSlot(slot, file, file.name);
    } catch {
      setStatus('That file could not be read as an image.');
    }
  });
}
document.getElementById('sampleBoulevard').addEventListener('click', () => {
  loadPhotoIntoSlot(0, 'samples/boulevard.jpg', 'Boulevard (sample)').catch(() => setStatus('Sample photo failed to load.'));
});
document.getElementById('samplePier').addEventListener('click', () => {
  loadPhotoIntoSlot(1, 'samples/pier.jpg', 'Pier (sample)').catch(() => setStatus('Sample photo failed to load.'));
});
document.getElementById('fillAll').addEventListener('click', () => {
  pushHistory();
  const panel = state.panels[state.selectedPanel];
  state.panels.forEach((p) => { p.photo = panel.photo; });
  redraw();
  setStatus(`All panels now use slot ${panel.photo + 1}.`);
});

// --- Surprise Me: a fixed cycle, no randomness at all. --------------------

const SURPRISE_STEPS = [
  { layout: 'nine', grade: 'neon', titleStyle: 'neon' },
  { layout: 'tilt', grade: 'dusk', titleStyle: 'sunset' },
  { layout: 'trio', grade: 'gold', titleStyle: 'outline' },
  { layout: 'grid', grade: 'teal', titleStyle: 'solid' },
  { layout: 'hero', grade: 'sunset', titleStyle: 'sunset' },
  { layout: 'bleed', grade: 'noir', titleStyle: 'outline' },
];
let surpriseIndex = 0;
document.getElementById('surprise').addEventListener('click', () => {
  pushHistory();
  const step = SURPRISE_STEPS[surpriseIndex % SURPRISE_STEPS.length];
  surpriseIndex++;
  state.layout = step.layout;
  state.grade = step.grade;
  state.titleStyle = step.titleStyle;
  if (state.selectedPanel >= LAYOUTS[step.layout].panels) state.selectedPanel = 0;
  syncPickers();
  redraw();
  setStatus(`Surprise: ${LAYOUTS[step.layout].name} + ${GRADES[step.grade].name}.`);
});

// --- caption fields ---------------------------------------------------------

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('title').addEventListener('change', () => pushHistory());
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('change', () => pushHistory());

// --- per-panel crop controls for the selected panel. ------------------------

const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');
const panelPhotoSelect = document.getElementById('panelPhoto');
for (let slot = 0; slot < PHOTO_SLOTS; slot++) {
  const opt = document.createElement('option');
  opt.value = String(slot);
  opt.textContent = `Slot ${slot + 1}`;
  panelPhotoSelect.appendChild(opt);
}
function syncPanelControls() {
  const panel = state.panels[state.selectedPanel];
  zoomInput.value = String(panel.zoom);
  panXInput.value = String(panel.dx);
  panYInput.value = String(panel.dy);
  panelPhotoSelect.value = String(panel.photo);
  document.getElementById('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${LAYOUTS[state.layout].panels}`;
}
panelPhotoSelect.addEventListener('change', (e) => {
  pushHistory();
  state.panels[state.selectedPanel].photo = Number(e.target.value);
  redraw();
});
zoomInput.addEventListener('input', (e) => {
  state.panels[state.selectedPanel].zoom = Number(e.target.value);
  redraw();
});
zoomInput.addEventListener('change', () => pushHistory());
panXInput.addEventListener('input', (e) => {
  state.panels[state.selectedPanel].dx = Number(e.target.value);
  redraw();
});
panXInput.addEventListener('change', () => pushHistory());
panYInput.addEventListener('input', (e) => {
  state.panels[state.selectedPanel].dy = Number(e.target.value);
  redraw();
});
panYInput.addEventListener('change', () => pushHistory());

// --- click a panel to select it; drag to move its photo, wheel to zoom. ----

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}
let dragging = false;
let dragMoved = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selectedPanel = i;
  dragging = true;
  dragMoved = false;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[state.selectedPanel];
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const r = rects[state.selectedPanel];
  panel.dx += ((e.clientX - lastX) / rect.width) * (canvas.width / r.w);
  panel.dy += ((e.clientY - lastY) / rect.height) * (canvas.height / r.h);
  panel.dx = Math.max(-0.6, Math.min(0.6, panel.dx));
  panel.dy = Math.max(-0.6, Math.min(0.6, panel.dy));
  dragMoved = true;
  lastX = e.clientX;
  lastY = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (dragging && dragMoved) pushHistory();
  dragging = false;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selectedPanel];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  redraw();
}, { passive: false });

// --- export the current cover at the chosen size as a PNG download. --------

document.getElementById('export').addEventListener('click', () => {
  const { w, h } = state.exportSize;
  const out = exportCover(state, w, h);
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — please try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved neon-coast-cover-${w}x${h}.png`);
  }, 'image/png');
});

// --- screenshot scenes (?shot=cover or ?shot=editor) ------------------------

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    loadPhoto: loadPhotoIntoSlot,
    setState(patch) {
      Object.assign(state, patch);
      if (patch.panels) state.panels = patch.panels;
    },
    state,
    redraw,
    canvas,
  });
} else {
  // Load the samples so the first paint already shows a cover.
  Promise.all([
    loadPhotoIntoSlot(0, 'samples/boulevard.jpg', 'Boulevard (sample)'),
    loadPhotoIntoSlot(1, 'samples/pier.jpg', 'Pier (sample)'),
  ]).catch(() => setStatus('Sample photos failed to load — pick your own photos.'));
  redraw();
}

// Re-draw once the display fonts arrive so the caption uses them.
if (document.fonts) {
  document.fonts.load('400 100px Anton').then(redraw).catch(() => {});
  document.fonts.load('400 60px Pacifico').then(redraw).catch(() => {});
  document.fonts.ready.then(redraw).catch(() => {});
}
syncUndoButtons();
