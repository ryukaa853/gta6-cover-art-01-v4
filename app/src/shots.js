// Fixed scenes for the entry's screenshots. The page reads them from the
// query string, so the same app that a person uses draws its own shots:
//
//   ?shot=cover&w=1920&h=1080&layout=hero&grade=neon   one exported cover
//   ?shot=editor&w=1280&h=720                         the editor, photos in
//
// window.__shotReady is set once the scene has painted, so a headless
// browser knows when to take the screenshot. Nothing here is random: every
// scene is fixed by its query parameters.

/** Nine panels that spread the two sample photos across the cover. */
function scenePanels() {
  return [
    { photo: 0, zoom: 1.05, dx: 0, dy: 0 },
    { photo: 1, zoom: 1.1, dx: 0, dy: -0.03 },
    { photo: 0, zoom: 1.25, dx: 0.05, dy: 0 },
    { photo: 1, zoom: 1.15, dx: -0.04, dy: 0.02 },
    { photo: 0, zoom: 1.3, dx: -0.05, dy: 0.04 },
    { photo: 1, zoom: 1.2, dx: 0.03, dy: -0.02 },
    { photo: 0, zoom: 1.1, dx: 0, dy: 0.03 },
    { photo: 1, zoom: 1.05, dx: -0.02, dy: 0 },
    { photo: 0, zoom: 1.35, dx: 0.04, dy: -0.04 },
  ];
}

export async function runShot(shot, query, api) {
  const first = query.get('photo') ?? 'boulevard';
  const second = first === 'boulevard' ? 'pier' : 'boulevard';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const title = query.get('caption') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'a Neon Coast story';
  const titleStyle = query.get('style') ?? 'solid';
  const badge = query.get('badge') ?? 'none';
  const w = Number(query.get('w') ?? 1080);
  const h = Number(query.get('h') ?? 1080);

  await api.loadPhoto(0, `samples/${first}.jpg`, `${first} (sample)`);
  await api.loadPhoto(1, `samples/${second}.jpg`, `${second} (sample)`);
  api.setState({
    layout,
    grade,
    title,
    subtitle,
    titleStyle,
    badge,
    panels: scenePanels(),
    exportSize: { name: 'shot', w, h },
    selectedPanel: 0,
  });

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    api.canvas.width = w;
    api.canvas.height = h;
  }
  api.redraw();
  // Two frames: one for the photos and fonts to land, one to paint.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
