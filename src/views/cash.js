import { get, TX } from '../store.js';
import { deposit, withdraw } from '../engine.js';
import { createRecurring, previewRun, toggleRecurring, deleteRecurring, runDue, FREQS } from '../scheduler.js';
import { salaryNet } from '../tax.js';
import { t } from '../i18n.js';
import { usd, esc, dateLong, dayKey } from '../format.js';
import { sheet, toast, field, moneyInput, selectInput, confirmSheet } from '../ui.js';

const FREQ_LABEL = () => ({
  weekly: t('cash.weekly'), biweekly: t('cash.biweekly'),
  semimonthly: t('cash.semimonthly'), monthly: t('cash.monthly')
});

export default function cash(host){
  host.innerHTML = `
    <section class="hero">
      <div class="lbl">${esc(t('cash.balance'))}</div>
      <div class="val num" id="bal">—</div>
    </section>

    <div class="inline-2" style="margin:16px 0 14px">
      <button class="btn" id="dep">${esc(t('cash.deposit'))}</button>
      <button class="btn sec" id="wd">${esc(t('cash.withdraw'))}</button>
    </div>

    <div class="card">
      <div class="row" style="margin-bottom:10px">
        <h3 class="card-title" style="margin:0">${esc(t('cash.recurring'))}</h3>
        <button class="btn sm ghost" id="addrec">+ ${esc(t('act.add'))}</button>
      </div>
      <div id="reclist"></div>
      <div class="note info" style="margin-top:12px">${esc(t('cash.autoInfo'))}</div>
    </div>

    <div class="card">
      <h3 class="card-title">${esc(t('cash.simSalary'))}</h3>
      <div id="simbox"></div>
    </div>

    <div class="card">
      <h3 class="card-title">${esc(t('hist.cashflow'))}</h3>
      <div class="list" id="flows"></div>
    </div>`;

  const $ = s => host.querySelector(s);

  function draw(){
    const s = get();
    $('#bal').textContent = usd(s.cash);

    $('#reclist').innerHTML = s.recurring.length ? s.recurring.map(r => {
      const p = previewRun(r);
      return `<div class="list-item" style="cursor:default;flex-wrap:wrap">
        <div class="li-main">
          <div class="li-t">${esc(r.name || t('cash.salary'))}
            <span class="badge ${r.active?'ok':'warn'}">${esc(r.active ? t('cash.active') : t('cash.paused'))}</span></div>
          <div class="li-s">${esc(FREQ_LABEL()[r.freq])} · ${esc(t('cash.next'))}: ${dateLong(r.nextTs)}</div>
        </div>
        <div class="li-r" style="display:flex;align-items:center;gap:8px">
          <div>
            <div class="li-v num">${usd(p.net)}</div>
            ${r.gross ? `<div class="li-d num muted">${esc(t('cash.gross')).split(' ')[0]} ${usd(p.gross)}</div>` : ''}
          </div>
          <button class="icon-btn" data-tog="${r.id}" title="${esc(r.active ? t('cash.pause') : t('cash.resume'))}">${r.active ? '❚❚' : '▶'}</button>
          <button class="icon-btn" data-del="${r.id}" title="${esc(t('act.delete'))}">✕</button>
        </div>
      </div>`;
    }).join('') : `<div class="empty">${esc(t('cash.noRecurring'))}</div>`;

    const flows = s.transactions.filter(x =>
      [TX.DEPOSIT, TX.WITHDRAW, TX.SALARY, TX.INTEREST, TX.TAX].includes(x.type)).slice(-25).reverse();
    $('#flows').innerHTML = flows.length ? flows.map(x => {
      const inflow = x.type === TX.DEPOSIT || x.type === TX.SALARY || x.type === TX.INTEREST;
      return `<div class="list-item" style="cursor:default">
        <div class="li-main">
          <div class="li-t">${esc(t('tx.' + x.type))}${x.emergency ? ` <span class="badge warn">${esc(t('cash.emergency'))}</span>` : ''}</div>
          <div class="li-s">${dateLong(x.ts)}${x.note ? ' · ' + esc(x.note) : ''}${x.isr ? ` · ${esc(t('cash.isrRet'))} ${usd(x.isr)}` : ''}</div>
        </div>
        <div class="li-r"><div class="li-v num ${inflow ? 'up' : 'down'}">${inflow ? '+' : '−'}${usd(x.amount)}</div></div>
      </div>`;
    }).join('') : `<div class="empty">${esc(t('hist.empty'))}</div>`;

    drawSim();
  }

  /* ---- gross -> net salary calculator ---- */
  function drawSim(){
    const s = get();
    $('#simbox').innerHTML = `
      <div class="inline-2">
        ${field(t('tax.salaryGross'), moneyInput('sg', '', '25000'))}
        ${field(t('cash.currency'), selectInput('sc', [['MXN','MXN'],['USD','USD']], 'MXN'))}
      </div>
      ${field(t('cash.freq'), selectInput('sf', FREQS.map(f => [f, FREQ_LABEL()[f]]), 'monthly'))}
      <div class="card tight" style="background:var(--bg-elev2)">
        <div class="row small"><span class="muted">${esc(t('tax.salaryGross'))}</span><span class="num" id="r-g">${usd(0)}</span></div>
        <div class="row small" style="margin-top:7px"><span class="muted">${esc(t('cash.isrRet'))}</span><span class="num down" id="r-i">${usd(0)}</span></div>
        <div class="row small" style="margin-top:7px"><span class="muted">${esc(t('cash.imss'))}</span><span class="num down" id="r-m">${usd(0)}</span></div>
        <div class="row small" style="margin-top:7px"><span class="muted">${esc(t('cash.subsidy'))}</span><span class="num up" id="r-s">${usd(0)}</span></div>
        <div class="hair" style="margin:10px -12px"></div>
        <div class="row"><span style="font-weight:650">${esc(t('cash.netPreview'))}</span><span class="num" id="r-n" style="font-weight:700;font-size:17px">${usd(0)}</span></div>
        <div class="row tiny" style="margin-top:6px"><span class="muted">${esc(t('tax.effective'))}</span><span class="num muted" id="r-e">0%</span></div>
      </div>
      <div class="tiny muted" style="margin-top:10px">1 USD = ${s.settings.fx} MXN · ${esc(t('tax.tableYear'))}: ${s.settings.tables.year}</div>`;

    const calc = () => {
      const raw = Number($('[name=sg]').value || 0);
      const g = $('[name=sc]').value === 'MXN' ? raw / s.settings.fx : raw;
      const f = $('[name=sf]').value;
      const r = salaryNet(g, f, s.settings.fx, s.settings.tables);
      $('#r-g').textContent = usd(r.gross);
      $('#r-i').textContent = '−' + usd(r.isr);
      $('#r-m').textContent = '−' + usd(r.imss);
      $('#r-s').textContent = '+' + usd(r.subsidy);
      $('#r-n').textContent = usd(r.net);
      $('#r-e').textContent = r.effRate.toFixed(1) + '%';
    };
    $('[name=sg]').oninput = calc;
    $('[name=sf]').onchange = calc;
    $('[name=sc]').onchange = calc;
  }

  /* ---- actions ---- */
  $('#dep').onclick = () => sheet({
    title: t('cash.depositTitle'),
    body: `${field(t('cash.amount'), moneyInput('a'))}
           ${field(t('cash.note'), `<input type="text" name="n" placeholder="${esc(t('cash.oneoff'))}" />`)}
           <button class="btn" id="go">${esc(t('act.confirm'))}</button>`,
    onMount(el, close){
      el.querySelector('#go').onclick = () => {
        const a = Number(el.querySelector('[name=a]').value || 0);
        if (a <= 0) return;
        deposit(a, { note: el.querySelector('[name=n]').value });
        toast(t('cash.deposited'), 'ok'); close(); draw();
      };
    }
  });

  $('#wd').onclick = () => sheet({
    title: t('cash.withdrawTitle'),
    sub: `${esc(t('cash.balance'))}: <strong class="num">${usd(get().cash)}</strong>`,
    body: `${field(t('cash.amount'), moneyInput('a'))}
           ${field(t('cash.note'), `<input type="text" name="n" placeholder="${esc(t('cash.emergency'))}" />`)}
           <div class="switch" style="margin-bottom:10px"><div style="font-size:14.5px;font-weight:600">${esc(t('cash.emergency'))}</div>
             <input type="checkbox" name="em" /></div>
           <button class="btn danger" id="go">${esc(t('act.confirm'))}</button>`,
    onMount(el, close){
      el.querySelector('#go').onclick = () => {
        const a = Number(el.querySelector('[name=a]').value || 0);
        if (a <= 0) return;
        const r = withdraw(a, { note: el.querySelector('[name=n]').value, emergency: el.querySelector('[name=em]').checked });
        if (!r.ok){ toast(t('cash.insufficient'), 'err'); return; }
        toast(t('cash.withdrawn'), 'ok'); close(); draw();
      };
    }
  });

  $('#addrec').onclick = () => sheet({
    title: t('cash.addRecurring'),
    body: `
      ${field(t('cash.name'), `<input type="text" name="nm" placeholder="${esc(t('cash.salary'))}" />`)}
      <div class="inline-2">
        ${field(t('cash.amount'), moneyInput('a'))}
        ${field(t('cash.currency'), selectInput('cur', [['USD','USD'],['MXN','MXN']], 'USD'))}
      </div>
      ${field(t('cash.freq'), selectInput('f', FREQS.map(x => [x, FREQ_LABEL()[x]]), 'monthly'))}
      ${field(t('cash.grossNet'), selectInput('g', [['net', t('cash.net')], ['gross', t('cash.gross')]], 'net'), esc(t('cash.grossHelp')))}
      ${field(t('cash.start'), `<input type="date" name="d" value="${dayKey()}" />`)}
      <div class="card tight" style="background:var(--bg-elev2);margin-bottom:14px">
        <div class="row"><span class="muted small">${esc(t('cash.netPreview'))}</span><span class="num" id="pv" style="font-weight:700">${usd(0)}</span></div>
        <div class="row tiny" style="margin-top:6px"><span class="muted">${esc(t('cash.perYear'))}</span><span class="num muted" id="pvy">${usd(0)}</span></div>
      </div>
      <div class="tiny muted" style="margin:-6px 0 14px">${esc(t('cash.inMxn'))} 1 USD = ${get().settings.fx} MXN</div>
      <button class="btn" id="go">${esc(t('act.add'))}</button>`,
    onMount(el, close){
      const s = get();
      const amountUsd = () => {
        const raw = Number(el.querySelector('[name=a]').value || 0);
        return el.querySelector('[name=cur]').value === 'MXN' ? raw / s.settings.fx : raw;
      };
      const pv = () => {
        const a = amountUsd();
        const f = el.querySelector('[name=f]').value;
        const gross = el.querySelector('[name=g]').value === 'gross';
        const r = gross ? salaryNet(a, f, s.settings.fx, s.settings.tables) : { net: a };
        const per = { weekly:52, biweekly:26, semimonthly:24, monthly:12 }[f];
        el.querySelector('#pv').textContent = usd(r.net);
        el.querySelector('#pvy').textContent = usd(r.net * per);
      };
      el.querySelectorAll('input,select').forEach(i => { i.oninput = pv; i.onchange = pv; });
      el.querySelector('#go').onclick = () => {
        const a = amountUsd();
        if (a <= 0) return;
        const d = el.querySelector('[name=d]').value || dayKey();
        const [y, m, dd] = d.split('-').map(Number);
        createRecurring({
          name: el.querySelector('[name=nm]').value,
          amount: a,
          gross: el.querySelector('[name=g]').value === 'gross',
          freq: el.querySelector('[name=f]').value,
          startTs: new Date(y, m - 1, dd, 9, 0, 0).getTime()
        });
        // a back-dated start date should pay out its missed periods right away
        const applied = runDue();
        toast(applied.length ? t('cash.applied', { n: applied.length }) : t('act.done'), 'ok');
        close(); draw();
      };
    }
  });

  host.addEventListener('click', e => {
    const tog = e.target.closest('[data-tog]');
    if (tog){ toggleRecurring(tog.dataset.tog); runDue(); draw(); return; }
    const del = e.target.closest('[data-del]');
    if (del){
      confirmSheet(t('act.delete'), t('cash.recurring'), () => { deleteRecurring(del.dataset.del); draw(); });
    }
  });

  draw();
  return { refresh: draw };
}
