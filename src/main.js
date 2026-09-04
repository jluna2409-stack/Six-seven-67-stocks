import { load, get, update, persistNow, settings } from './store.js';
import { setLang, getLang, t } from './i18n.js';
import { connectWs, watch, refreshQuotes, quotes, onTick, onStatus, marketOpen, loadCatalog, getStatus, prefetchProfiles } from './market.js';
import { snapshot, accrueCashInterest, deposit, totalsFor } from './engine.js';
import { runDue } from './scheduler.js';
import { startFx, refreshFx } from './fx.js';
import { autoPayDue, alerts } from './obligations.js';
import { toast, sheet, field, moneyInput, selectInput } from './ui.js';
import { installHelp } from './help.js';
import { esc, usd } from './format.js';

import dashboard, { sampleIntraday } from './views/dashboard.js';
import portfolio from './views/portfolio.js';
import trade from './views/trade.js';
import cashView from './views/cash.js';
import taxes from './views/taxes.js';
import history from './views/history.js';
import settingsView from './views/settings.js';

const VIEWS = { dashboard, portfolio, trade, cash: cashView, taxes, history, settings: settingsView };
let current = null, currentTab = 'dashboard';

const ctx = { rerender, applyTheme };

/* ------------------------------ theme ----------------------------- */
function applyTheme(){
  const th = settings().theme;
  const root = document.documentElement;
  if (th === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', th);
  document.querySelector('meta[name=theme-color]')
    ?.setAttribute('content', th === 'light' ? '#f2f2f7' : '#000000');
}

/* ---------------------------- routing ----------------------------- */
function go(tab){
  if (!VIEWS[tab]) tab = 'dashboard';
  currentTab = tab;
  location.hash = '#' + tab;
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  rerender();
  window.scrollTo({ top: 0 });
}

/** Red dot on the Taxes tab while a deadline is overdue or approaching. */
function paintTaxDot(){
  const btn = document.querySelector('#tabbar button[data-tab=taxes]');
  if (!btn) return;
  const due = alerts();
  btn.querySelector('.tdot')?.remove();
  if (!due.length) return;
  const dot = document.createElement('span');
  dot.className = 'tdot';
  if (!due.some(o => o.status === 'overdue')) dot.style.background = 'var(--orange)';
  btn.appendChild(dot);
}

function rerender(){
  const host = document.getElementById('view');
  if (current?.destroy) current.destroy();
  host.innerHTML = '';
  applyTheme();
  document.querySelectorAll('#tabbar .tl').forEach(el => { el.textContent = t('nav.' + el.closest('button').dataset.tab); });
  current = VIEWS[currentTab](host, ctx);
  paintTaxDot();
}

/* --------------------------- market pill -------------------------- */
function paintStatus(st){
  const pill = document.getElementById('mkt-status');
  const label = pill.querySelector('span');
  pill.className = 'mkt-pill ' + (st.state === 'live' ? 'live'
    : st.state === 'err' ? 'err'
    : (st.state === 'closed' || st.state === 'delayed') ? 'closed' : '');
  label.textContent = st.state === 'live' ? t('mkt.live')
    : st.state === 'closed' ? t('mkt.closed')
    : st.state === 'delayed' ? t('mkt.delayed')
    : st.state === 'err' ? t('mkt.offline') : t('mkt.connecting');
}

/* --------------------------- onboarding --------------------------- */
function onboard(){
  sheet({
    title: t('onb.title'),
    sub: esc(t('onb.sub')),
    body: `${field(t('onb.lang'), selectInput('lang', [['es','Español'],['en','English']], getLang()))}
           ${field(t('onb.cash'), moneyInput('cash', '10000'))}
           <button class="btn" id="go">${esc(t('onb.start'))}</button>
           <div class="tiny muted" style="margin-top:12px;line-height:1.5">${esc(t('first.hint'))}</div>`,
    onMount(el, close){
      el.querySelector('[name=lang]').onchange = e => {
        setLang(e.target.value);
        update(st => { st.settings.lang = e.target.value; }, { silent:true });
        close(); setTimeout(onboard, 260);
      };
      el.querySelector('#go').onclick = () => {
        const amount = Number(el.querySelector('[name=cash]').value || 0);
        update(st => { st.onboarded = true; }, { silent:true });
        if (amount > 0) deposit(amount, { note: t('set.startCash') });
        persistNow();
        close(); rerender(); tickAll();
      };
    }
  });
}

/* ------------------------------ boot ------------------------------ */
async function boot(){
  const s = load();
  setLang(s.settings.lang);
  applyTheme();

  document.getElementById('boot').hidden = true;
  document.getElementById('app').hidden = false;

  document.getElementById('tabbar').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab);
  });
  document.getElementById('btn-lang').onclick = () => {
    const next = getLang() === 'es' ? 'en' : 'es';
    setLang(next);
    update(st => { st.settings.lang = next; }, { silent:true });
    document.getElementById('btn-lang').textContent = next.toUpperCase();
    paintStatus(getStatus());
    rerender();
  };
  document.getElementById('btn-lang').textContent = getLang().toUpperCase();
  document.getElementById('btn-theme').onclick = () => {
    const order = ['system','dark','light'];
    const next = order[(order.indexOf(settings().theme) + 1) % 3];
    update(st => { st.settings.theme = next; }, { silent:true });
    applyTheme(); toast(t('set.' + (next === 'system' ? 'themeSystem' : next === 'dark' ? 'themeDark' : 'themeLight')));
  };

  installHelp();
  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  onStatus(paintStatus);

  // catch up on everything that happened while the app was closed
  const applied = await runDue();
  accrueCashInterest();
  const autopaid = autoPayDue();
  if (applied.length) setTimeout(() => toast(t('cash.applied', { n: applied.length }), 'ok'), 700);
  if (autopaid.length) setTimeout(() => toast(t('ob.autoPaid', { n: autopaid.length }), 'ok'), 1400);

  go(location.hash.slice(1) || 'dashboard');
  if (!get().onboarded) setTimeout(onboard, 300);

  loadCatalog().catch(e => console.warn('catalog', e));
  startFx();

  const syms = Object.keys(get().positions);
  snapshot(quotes);                       // always leave a mark for today
  connectWs();
  watch(syms);
  if (syms.length) refreshQuotes(syms).then(() => {
    tickAll(); snapshot(quotes);
    prefetchProfiles(syms).then(() => { if (current?.refresh) current.refresh(); });
  });

  onTick(() => { if (current?.tick) current.tick(); });

  // periodic housekeeping
  setInterval(() => {
    snapshot(quotes);
    sampleIntraday(totalsFor(get(), quotes).nw);   // keeps the intraday curve moving without a WS feed
    paintTaxDot();                                  // a deadline can arrive while the tab stays open
  }, 60_000);
  setInterval(() => {
    const held = Object.keys(get().positions);
    if (!held.length) return;
    if (!marketOpen() || getStatus().state !== 'live') refreshQuotes(held).then(tickAll);
  }, 5 * 60_000);
  setInterval(() => {
    const cur = getStatus().state;
    if (cur === 'live' || cur === 'err') return paintStatus(getStatus());
    paintStatus({ state: marketOpen() ? cur : 'closed' });
  }, 30_000);

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') { persistNow(); return; }
    const a = await runDue();
    accrueCashInterest();
    const ap = autoPayDue();
    if (a.length) toast(t('cash.applied', { n: a.length }), 'ok');
    if (ap.length) toast(t('ob.autoPaid', { n: ap.length }), 'ok');
    paintTaxDot();
    connectWs();
    refreshFx();
    const held = Object.keys(get().positions);
    if (held.length) refreshQuotes(held).then(() => { snapshot(quotes); tickAll(); });
    if (current?.refresh) current.refresh();
  });
  window.addEventListener('beforeunload', persistNow);
}

function tickAll(){ if (current?.tick) current.tick(); if (current?.refresh && currentTab !== 'settings') current.refresh(); }

boot().catch(e => {
  console.error(e);
  document.getElementById('boot').hidden = false;
  document.querySelector('.boot-text').textContent = 'Error: ' + e.message;
});
