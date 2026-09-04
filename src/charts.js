/** Lightweight SVG charts — no dependencies, scrub-on-touch like the Stocks app. */

const NS = 'http://www.w3.org/2000/svg';
let gid = 0;

export const PALETTE = ['#0a84ff','#30d158','#bf5af0','#ff9f0a','#64d2ff','#ff375f','#ffd60a','#5e5ce6','#ac8e68','#32ade6'];

function path(points){
  return points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
}

/**
 * Line/area chart with an optional scrubber.
 * @param {HTMLElement} host
 * @param {Array<[number,number]>} data  [timestamp, value]
 * @param {object} opt { height, color, baseline, onScrub, emptyText, fmt }
 */
export function lineChart(host, data, opt = {}){
  const H = opt.height || 190, W = 1000, PAD = 6;
  host.innerHTML = '';
  host.classList.remove('scrubbing');

  if (!data || data.length < 2){
    const d = document.createElement('div');
    d.className = 'chart-empty';
    d.textContent = opt.emptyText || '';
    host.appendChild(d);
    return { update(){} };
  }

  const ys = data.map(d => d[1]);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (opt.baseline != null){ min = Math.min(min, opt.baseline); max = Math.max(max, opt.baseline); }
  if (max - min < 1e-9){ max = max + 1; min = min - 1; }
  const padY = (max - min) * 0.12;
  min -= padY; max += padY;

  const n = data.length;
  const X = i => PAD + (W - PAD * 2) * (n === 1 ? 0.5 : i / (n - 1));
  const Y = v => H - PAD - (H - PAD * 2) * ((v - min) / (max - min));
  const pts = data.map((d, i) => [X(i), Y(d[1])]);

  const rising = data[n-1][1] >= data[0][1];
  const color = opt.color || (rising ? 'var(--up)' : 'var(--down)');
  const id = 'grad' + (++gid);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.height = H + 'px';
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity=".28"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${path(pts)} L ${X(n-1).toFixed(2)} ${H-PAD} L ${X(0).toFixed(2)} ${H-PAD} Z" fill="url(#${id})"/>
    ${opt.baseline != null ? `<line x1="${PAD}" x2="${W-PAD}" y1="${Y(opt.baseline).toFixed(2)}" y2="${Y(opt.baseline).toFixed(2)}" stroke="var(--tx3)" stroke-width="1" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/>` : ''}
    <path d="${path(pts)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <g class="scrub" opacity="0">
      <line y1="${PAD}" y2="${H-PAD}" stroke="var(--tx3)" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <circle r="4.5" fill="${color}" stroke="var(--bg)" stroke-width="2" vector-effect="non-scaling-stroke"/>
    </g>`;
  host.appendChild(svg);

  const g = svg.querySelector('.scrub');
  const line = g.querySelector('line');
  const dot = g.querySelector('circle');

  const at = clientX => {
    const r = host.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
  };
  const show = i => {
    g.setAttribute('opacity', '1');
    line.setAttribute('x1', X(i)); line.setAttribute('x2', X(i));
    dot.setAttribute('cx', X(i)); dot.setAttribute('cy', Y(data[i][1]));
    host.classList.add('scrubbing');
    opt.onScrub && opt.onScrub(data[i], i);
  };
  const hide = () => {
    g.setAttribute('opacity', '0');
    host.classList.remove('scrubbing');
    opt.onScrub && opt.onScrub(null, -1);
  };

  let active = false;
  const down = e => { active = true; show(at(e.touches ? e.touches[0].clientX : e.clientX)); };
  const move = e => {
    if (!active) return;
    if (e.touches) e.preventDefault();
    show(at(e.touches ? e.touches[0].clientX : e.clientX));
  };
  const up = () => { if (active){ active = false; hide(); } };

  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', up);
  window.addEventListener('pointerup', up);
  host.addEventListener('touchstart', down, { passive:true });
  host.addEventListener('touchmove', move, { passive:false });
  host.addEventListener('touchend', up);

  return { destroy(){ window.removeEventListener('pointerup', up); } };
}

/** Donut / ring chart. slices = [{label, value, color}] */
export function donut(host, slices, opt = {}){
  const size = opt.size || 150, r = size / 2, thick = opt.thickness || 26;
  const total = slices.reduce((a, s) => a + s.value, 0);
  host.innerHTML = '';
  if (total <= 0){ host.innerHTML = `<div class="chart-empty" style="height:${size}px"></div>`; return; }

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.style.width = size + 'px'; svg.style.height = size + 'px';

  const R = r - thick / 2;
  const C = 2 * Math.PI * R;
  let offset = 0;
  let html = `<circle cx="${r}" cy="${r}" r="${R}" fill="none" stroke="var(--bg-elev2)" stroke-width="${thick}"/>`;
  slices.forEach((s, i) => {
    const frac = s.value / total;
    const len = C * frac;
    html += `<circle cx="${r}" cy="${r}" r="${R}" fill="none"
      stroke="${s.color || PALETTE[i % PALETTE.length]}" stroke-width="${thick}"
      stroke-dasharray="${Math.max(0, len - 1.5)} ${C}"
      stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${r} ${r})" stroke-linecap="butt"/>`;
    offset += len;
  });
  if (opt.center){
    html += `<text x="${r}" y="${r - 3}" text-anchor="middle" fill="var(--tx2)" font-size="10" font-weight="700" letter-spacing=".06em">${opt.centerLabel || ''}</text>`;
    html += `<text x="${r}" y="${r + 15}" text-anchor="middle" fill="var(--tx)" font-size="15" font-weight="700">${opt.center}</text>`;
  }
  svg.innerHTML = html;
  host.appendChild(svg);
}

/** Horizontal bars, e.g. contribution vs growth or per-position P/L. */
export function bars(host, rows, opt = {}){
  const max = Math.max(1e-9, ...rows.map(r => Math.abs(r.value)));
  host.innerHTML = rows.map(r => {
    const w = Math.abs(r.value) / max * 100;
    const col = r.color || (r.value >= 0 ? 'var(--up)' : 'var(--down)');
    return `<div style="margin-bottom:10px">
      <div class="row tiny" style="margin-bottom:4px"><span class="muted">${r.label}</span><span style="font-weight:700;color:${col}">${r.text ?? ''}</span></div>
      <div style="height:7px;background:var(--bg-elev2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${w.toFixed(1)}%;background:${col};border-radius:4px"></div>
      </div>
    </div>`;
  }).join('');
  if (!rows.length) host.innerHTML = `<div class="chart-empty" style="height:60px">${opt.emptyText || ''}</div>`;
}
