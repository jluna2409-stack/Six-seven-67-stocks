import { get } from '../store.js';
import { search, loadCatalog, catalogInfo, catalogReady, quotes, isFund, refreshQuotes } from '../market.js';
import { positions } from '../engine.js';
import { t } from '../i18n.js';
import { usd, esc, num, signedPct, cls } from '../format.js';
import { openTrade } from './tradesheet.js';

let filter = 'all';
let query = '';

export default function trade(host){
  host.innerHTML = `
    <div class="card">
      <input type="text" id="q" placeholder="${esc(t('tr.search'))}" value="${esc(query)}"
             autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
      <div class="pillrow" style="margin-top:12px">
        <button class="chip ${filter==='all'?'active':''}" data-f="all">${esc(t('tr.filterAll'))}</button>
        <button class="chip ${filter==='stock'?'active':''}" data-f="stock">${esc(t('tr.filterStock'))}</button>
        <button class="chip ${filter==='etf'?'active':''}" data-f="etf">${esc(t('tr.filterEtf'))}</button>
      </div>
      <div class="tiny muted" id="cat-info" style="margin-top:10px"></div>
    </div>

    <div class="card" id="holdcard" hidden>
      <h3 class="card-title">${esc(t('pf.title'))}</h3>
      <div class="list" id="holds"></div>
    </div>

    <div class="card">
      <h3 class="card-title" id="res-title">${esc(t('tr.popular'))}</h3>
      <div id="results"></div>
    </div>`;

  const $ = s => host.querySelector(s);
  const info = () => {
    const c = catalogInfo();
    $('#cat-info').textContent = c.count
      ? `${c.count.toLocaleString()} ${t('tr.catalog')} · ${c.etfs.toLocaleString()} ETF · ${t('set.updated')} ${c.generated}`
      : '…';
  };

  function renderHolds(){
    const rows = positions(get(), quotes);
    $('#holdcard').hidden = rows.length === 0;
    $('#holds').innerHTML = rows.map(r => `
      <button class="list-item" data-sym="${esc(r.symbol)}">
        <div class="li-main">
          <div class="li-t">${esc(r.symbol)}</div>
          <div class="li-s">${num(r.qty,4)} ${esc(t('pf.qty').toLowerCase())} · ${usd(r.value)}</div>
        </div>
        <div class="li-r"><span class="pctbox ${cls(r.plPct)}">${signedPct(r.plPct)}</span></div>
      </button>`).join('');
  }

  function renderResults(){
    if (!catalogReady()){ $('#results').innerHTML = `<div class="empty">…</div>`; return; }
    const rows = search(query, { filter, limit: 80 });
    $('#res-title').textContent = query ? `${rows.length}${rows.length >= 80 ? '+' : ''} ${t('tr.catalog')}` : t('tr.popular');
    $('#results').innerHTML = rows.length ? rows.map(r => {
      const q = quotes[r.symbol];
      return `<div class="res-item" data-sym="${esc(r.symbol)}">
        <span class="res-sym">${esc(r.symbol)}</span>
        <span class="badge ${isFund(r.type)?'etf':'stock'}">${isFund(r.type)?'ETF':'STK'}</span>
        <span class="res-name">${esc(r.name)}</span>
        <span class="num small" style="min-width:78px;text-align:right">${q?.c ? usd(q.c) : ''}</span>
      </div>`;
    }).join('') : `<div class="empty">${esc(t('tr.noresults'))}</div>`;

    // opportunistically price the first handful of visible results
    const need = rows.slice(0, 6).map(r => r.symbol).filter(s => !quotes[s]);
    if (need.length) refreshQuotes(need, { spacing: 220 }).then(() => {
      need.forEach(s => {
        const el = $(`.res-item[data-sym="${CSS.escape(s)}"] .num`);
        if (el && quotes[s]?.c) el.textContent = usd(quotes[s].c);
      });
    });
  }

  let deb;
  $('#q').addEventListener('input', e => {
    query = e.target.value;
    clearTimeout(deb);
    deb = setTimeout(renderResults, 130);
  });
  host.querySelector('.pillrow').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filter = b.dataset.f;
    host.querySelectorAll('[data-f]').forEach(c => c.classList.toggle('active', c.dataset.f === filter));
    renderResults();
  });
  host.addEventListener('click', e => {
    const el = e.target.closest('[data-sym]'); if (!el) return;
    openTrade(el.dataset.sym, 'buy', () => { renderHolds(); });
  });

  renderHolds();
  info();
  if (!catalogReady()) loadCatalog().then(() => { info(); renderResults(); }).catch(() => {
    $('#results').innerHTML = `<div class="empty">catalog.json ✗</div>`;
  });
  else renderResults();

  return { tick(){ renderHolds(); }, refresh(){ renderHolds(); renderResults(); } };
}
