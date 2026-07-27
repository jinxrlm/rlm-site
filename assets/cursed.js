// cursed.js — layout-safe glitch animation for text phrases
// ── knobs ────────────────────────────────────────────────
const CURSED_SCALE_RANGE = 0.18;  // deviation from 1 (0.18 → scale between 0.82–1.18)
const CURSED_POS_RANGE   = 2;     // max px for jitter and ghost offset
const CURSED_SPEED       = 1.0;   // multiplier — lower = faster (0.5 = twice as frequent)
const CURSED_JITTER_BASE = 1.4;   // base jitter cycle in seconds (before speed)
const CURSED_SIZE_BASE   = 2.1;   // base size glitch cycle in seconds (before speed)
const CURSED_GHOST_BASE  = 1.8;   // base ghost cycle in seconds (before speed)
// ─────────────────────────────────────────────────────────

const _jitterSets = [
  { tx1:-1.5, ty1: 1,   tx2: 1,   ty2:-2,   tx3:-0.5, ty3: 1.5 },
  { tx1: 1,   ty1:-1,   tx2:-2,   ty2: 0.5, tx3: 1.5, ty3:-1   },
  { tx1:-2,   ty1: 0.5, tx2: 0.5, ty2: 2,   tx3:-1,   ty3:-0.5 },
  { tx1: 0.5, ty1: 2,   tx2:-1.5, ty2:-1,   tx3: 1,   ty3: 1   },
  { tx1: 2,   ty1:-0.5, tx2:-1,   ty2: 1.5, tx3:-2,   ty3: 0.5 },
  { tx1:-1,   ty1:-2,   tx2: 2,   ty2: 1,   tx3: 0.5, ty3:-1.5 },
];

const _ghostSets = [
  { gx: 2,   gy:-1,   gx2:-1   },
  { gx:-2,   gy: 1,   gx2: 2   },
  { gx: 1.5, gy: 2,   gx2:-2   },
  { gx:-1,   gy:-2,   gx2: 1.5 },
  { gx: 2,   gy: 0.5, gx2:-1.5 },
  { gx:-1.5, gy: 1.5, gx2: 2   },
];

function _px(v) {
  return (v / 2 * CURSED_POS_RANGE).toFixed(2) + 'px';
}

// Takes a string, returns a DOM node ready to drop in.
// Structure per character:
//   .cursed-cell      — fixed grid cell, overflow hidden, no animation
//   .cursed-outer     — jitter translate only
//   .cursed-inner     — scale only + ghost ::before
// Separate elements = separate transform properties = no fighting.
function makeCursed(text) {
  const grid = document.createElement('span');
  grid.className = 'cursed-word';

  ;[...text].forEach((ch, i) => {
    if (ch === ' ') {
      const sp = document.createElement('span');
      sp.style.cssText = 'display:inline-block;width:0.35em';
      grid.appendChild(sp);
      return;
    }

    const j   = _jitterSets[i % _jitterSets.length];
    const g   = _ghostSets[i % _ghostSets.length];
    const jd  = ((CURSED_JITTER_BASE + (i * 0.17) % 0.9) * CURSED_SPEED).toFixed(2) + 's';
    const jp  = (Math.max(0.05, (i * 0.23) % 0.8)        * CURSED_SPEED).toFixed(2) + 's';
    const sd  = ((CURSED_SIZE_BASE  + (i * 0.31) % 1.3)  * CURSED_SPEED).toFixed(2) + 's';
    const sp  = (Math.max(0.05, (i * 0.41) % 1.2)        * CURSED_SPEED).toFixed(2) + 's';
    const gd  = ((CURSED_GHOST_BASE + (i * 0.29) % 1.1)  * CURSED_SPEED).toFixed(2) + 's';
    const gp  = (Math.max(0.05, (i * 0.37) % 0.9)        * CURSED_SPEED).toFixed(2) + 's';
    const gs1 = (1 - CURSED_SCALE_RANGE + (i % 3) * (CURSED_SCALE_RANGE * 0.4)).toFixed(3);
    const gs2 = (1 + CURSED_SCALE_RANGE - (i % 4) * (CURSED_SCALE_RANGE * 0.3)).toFixed(3);

    const outerVars = [
      `--tx1:${_px(j.tx1)}`, `--ty1:${_px(j.ty1)}`,
      `--tx2:${_px(j.tx2)}`, `--ty2:${_px(j.ty2)}`,
      `--tx3:${_px(j.tx3)}`, `--ty3:${_px(j.ty3)}`,
      `--jd:${jd}`, `--jp:${jp}`,
    ].join(';');

    const innerVars = [
      `--sd:${sd}`,  `--sp:${sp}`,
      `--gd:${gd}`,  `--gp:${gp}`,
      `--gx:${_px(g.gx)}`, `--gy:${_px(g.gy)}`, `--gx2:${_px(g.gx2)}`,
      `--gs1:${gs1}`, `--gs2:${gs2}`,
    ].join(';');

    const cell = document.createElement('span');
    cell.className = 'cursed-cell';

    const outer = document.createElement('span');
    outer.className = 'cursed-outer';
    outer.style.cssText = outerVars;

    const inner = document.createElement('span');
    inner.className = 'cursed-inner';
    inner.setAttribute('data-c', ch);
    inner.textContent = ch;
    inner.style.cssText = innerVars;

    outer.appendChild(inner);
    cell.appendChild(outer);
    grid.appendChild(cell);
  });

  return grid;
}

// Finds targetText inside a container's text nodes and wraps it in a span.
// Safe — walks text nodes only, never touches attribute values or tag names.
function replaceTextInDiv(containerId, targetText, className = 'cursed') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const hits = [];

  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.includes(targetText)) hits.push(node);
  }

  hits.forEach(node => {
    const parts = node.textContent.split(targetText);
    const frag  = document.createDocumentFragment();
    parts.forEach((part, i) => {
      if (part) frag.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = targetText;
        frag.appendChild(span);
      }
    });
    node.parentNode.replaceChild(frag, node);
  });
}

// Run both steps: replace text, then animate all matched spans.
function cursedInit(containerId, targetText) {
  replaceTextInDiv(containerId, targetText);
  document.querySelectorAll('.cursed').forEach(el => {
    el.replaceWith(makeCursed(el.textContent));
  });
}
