import { esc } from './format.js';
import { t } from './i18n.js';

/* ------------------------------- toast ---------------------------- */
export function toast(msg, kind = ''){
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 260); }, 2600);
}

/* ------------------------------- sheet ---------------------------- */
let openSheet = null;

/**
 * Bottom sheet / centered modal.
 * @param {object} o { title, sub, body (html), onMount(el, close), wide }
 */
export function sheet(o){
  closeSheet();
  const root = document.getElementById('sheet-root');
  const back = document.createElement('div');
  back.className = 'sheet-back';
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = `<div class="sheet-grip"></div>
    ${o.title ? `<h2>${esc(o.title)}</h2>` : ''}
    ${o.sub ? `<div class="sh-sub">${o.sub}</div>` : ''}
    <div class="sheet-body">${o.body || ''}</div>`;
  root.appendChild(back); root.appendChild(el);
  requestAnimationFrame(() => { back.classList.add('on'); el.classList.add('on'); });

  const close = () => closeSheet();
  back.addEventListener('click', close);
  openSheet = { back, el };
  document.addEventListener('keydown', escHandler);
  o.onMount && o.onMount(el, close);
  const first = el.querySelector('input:not([type=hidden]),select,textarea');
  if (first && window.matchMedia('(min-width:760px)').matches) setTimeout(() => first.focus(), 250);
  return close;
}
function escHandler(e){ if (e.key === 'Escape') closeSheet(); }

export function closeSheet(){
  document.removeEventListener('keydown', escHandler);
  if (!openSheet) return;
  const { back, el } = openSheet; openSheet = null;
  back.classList.remove('on'); el.classList.remove('on');
  setTimeout(() => { back.remove(); el.remove(); }, 280);
}

/** Yes/no confirmation sheet. */
export function confirmSheet(title, msg, onYes, { danger = true, yesLabel } = {}){
  sheet({
    title, sub: esc(msg),
    body: `<div class="stack" style="margin-top:8px">
        <button class="btn ${danger ? 'danger' : ''}" data-yes>${esc(yesLabel || t('act.confirm'))}</button>
        <button class="btn sec" data-no>${esc(t('act.cancel'))}</button>
      </div>`,
    onMount(el, close){
      el.querySelector('[data-yes]').onclick = () => { close(); onYes(); };
      el.querySelector('[data-no]').onclick = close;
    }
  });
}

/* ---------------------------- form helpers ------------------------ */
export function field(label, inputHtml, help){
  return `<label class="field"><span>${esc(label)}</span>${inputHtml}
    ${help ? `<div class="tiny muted" style="margin-top:6px;line-height:1.45">${help}</div>` : ''}</label>`;
}
export function moneyInput(name, value = '', ph = '0.00'){
  return `<input type="number" inputmode="decimal" step="0.01" min="0" name="${name}" value="${value}" placeholder="${ph}" />`;
}
export function selectInput(name, options, value){
  return `<select name="${name}">${options.map(([v, l]) =>
    `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}
export function switchRow(label, name, checked, help){
  return `<div class="switch"><div><div style="font-size:14.5px;font-weight:600">${esc(label)}</div>
    ${help ? `<div class="tiny muted" style="margin-top:3px;max-width:46ch;line-height:1.4">${esc(help)}</div>` : ''}</div>
    <input type="checkbox" name="${name}" ${checked ? 'checked' : ''} /></div>`;
}
export function kpi(k, v, d, cls = ''){
  return `<div class="kpi"><div class="k">${esc(k)}</div><div class="v num ${cls}">${v}</div>${d ? `<div class="d num">${d}</div>` : ''}</div>`;
}
export function num(el, name){ return Number(el.querySelector(`[name="${name}"]`)?.value || 0); }
export function val(el, name){ return el.querySelector(`[name="${name}"]`)?.value ?? ''; }
export function checked(el, name){ return !!el.querySelector(`[name="${name}"]`)?.checked; }
