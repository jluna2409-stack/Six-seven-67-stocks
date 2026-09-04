import { get, update, settings as S, exportBlob, importFromText, resetAll, persistNow } from '../store.js';
import { catalogInfo, refreshCatalog, connectWs } from '../market.js';
import { DEFAULT_TABLES } from '../tax.js';
import { t, setLang, getLang } from '../i18n.js';
import { esc, usd, dateTime } from '../format.js';
import { toast, confirmSheet, field, switchRow, selectInput } from '../ui.js';
import { refreshFx, fxInfo } from '../fx.js';
import { helpIndex, helpBtn } from '../help.js';

export default function settingsView(host, ctx){
  function draw(){
    const s = S();
    const c = catalogInfo();
    host.innerHTML = `
      <div class="card">
        <h3 class="card-title">${esc(t('set.title'))}</h3>
        ${field(t('set.language'), selectInput('lang', [['es','Español'],['en','English']], s.lang))}
        ${field(t('set.theme'), selectInput('theme', [['system',t('set.themeSystem')],['dark',t('set.themeDark')],['light',t('set.themeLight')]], s.theme))}
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('set.market'))}${helpBtn('history')}</h3>
        ${field(t('set.apikey'), `<input type="text" name="apiKey" value="${esc(s.apiKey)}" spellcheck="false" />`)}
        ${field(t('set.avkey'), `<input type="text" name="avKey" value="${esc(s.avKey)}" spellcheck="false" placeholder="—" />`, esc(t('set.avHelp')))}
        <div class="row small" style="margin:6px 0 12px">
          <span class="muted">${esc(t('set.catalogInfo', { n: c.count.toLocaleString(), e: c.etfs.toLocaleString(), d: c.generated }))}</span>
        </div>
        <button class="btn sec" id="refcat">${esc(t('set.refreshCatalog'))}</button>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('set.trading'))}${helpBtn('commission')}</h3>
        <div class="inline-2">
          ${field(t('set.commission'), `<input type="number" step="0.01" min="0" name="commissionPct" value="${s.commissionPct}" />`)}
          ${field(t('set.commissionMin'), `<input type="number" step="0.01" min="0" name="commissionMin" value="${s.commissionMin}" />`)}
        </div>
        ${field(t('set.costMethod'), selectInput('costMethod', [['fifo',t('set.fifo')],['avg',t('set.avg')]], s.costMethod))}
        ${field(t('cash.yield'), `<input type="number" step="0.01" min="0" name="cashApy" value="${s.cashApy}" />`)}
        ${switchRow(t('set.fractional'), 'fractional', s.fractional)}
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('set.taxcfg'))}${helpBtn('fx')}</h3>
        ${switchRow(t('set.fxAuto'), 'fxAuto', s.fxAuto !== false)}
        ${field(t('set.fx'), `<input type="number" step="0.0001" min="1" name="fx" value="${s.fx}" ${s.fxAuto !== false ? 'readonly' : ''} />`, esc(t('set.fxHelp')))}
        <div class="row tiny muted" style="margin:-4px 0 12px">
          <span>${esc(t('set.fxSource'))}: ${esc(s.fxSource || '—')} · ${esc(t('set.fxDaily'))}</span>
          <span>${s.fxAt ? dateTime(s.fxAt) : esc(t('set.fxNever'))}</span>
        </div>
        <button class="btn sec" id="fxnow" style="margin-bottom:14px">${esc(t('set.fxNow'))}</button>
        <div class="inline-2">
          ${field(t('set.capRate'), `<input type="number" step="0.1" min="0" name="capRate" value="${s.capRate}" />`)}
          ${field(t('set.divUSRate'), `<input type="number" step="0.1" min="0" name="divUsRate" value="${s.divUsRate}" />`)}
        </div>
        ${field(t('set.divMXRate'), `<input type="number" step="0.1" min="0" name="divExtraRate" value="${s.divExtraRate}" />`)}
        ${field(t('tax.tableYear'), `<input type="number" step="1" name="tblYear" value="${s.tables.year}" />`)}
        <details style="margin-top:6px">
          <summary class="small muted" style="cursor:pointer">${esc(t('tax.tables'))} (JSON)</summary>
          <textarea name="tables" rows="10" spellcheck="false" style="margin-top:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px">${esc(JSON.stringify(s.tables, (k,v) => v === Infinity ? 'Infinity' : v, 1))}</textarea>
          <div class="tiny muted" style="margin-top:8px">${esc(t('tax.disclaimer'))}</div>
          <button class="btn sec sm" id="resettbl" style="margin-top:10px">${esc(t('act.refresh'))} ${DEFAULT_TABLES.year}</button>
        </details>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('set.data'))}${helpBtn('backup')}</h3>
        <div class="note info" style="margin-bottom:14px">${esc(t('set.storage'))}</div>
        <div class="stack">
          <button class="btn sec" id="exp">${esc(t('set.export'))}</button>
          <button class="btn sec" id="imp">${esc(t('set.import'))}</button>
          <input type="file" id="file" accept="application/json" hidden />
          <button class="btn danger" id="rst">${esc(t('set.reset'))}</button>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('help.title'))}</h3>
        <div class="tiny muted" style="margin:-6px 0 10px">${esc(t('help.sub'))}</div>
        <div class="help-index">
          ${helpIndex().map(h => `<button data-help="${h.key}">${esc(h.title)}</button>`).join('')}
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('set.about'))}</h3>
        <div class="small muted" style="line-height:1.6">
          Bolsa Sim · ${esc(t('onb.sub'))}<br>
          ${esc(t('first.hint'))}
        </div>
      </div>`;

    const $ = q => host.querySelector(q);
    const g = n => host.querySelector(`[name="${n}"]`);

    const commit = () => {
      update(st => {
        const o = st.settings;
        o.apiKey = g('apiKey').value.trim();
        o.avKey = g('avKey').value.trim();
        o.commissionPct = Number(g('commissionPct').value || 0);
        o.commissionMin = Number(g('commissionMin').value || 0);
        o.costMethod = g('costMethod').value;
        o.cashApy = Number(g('cashApy').value || 0);
        o.fractional = g('fractional').checked;
        o.fxAuto = g('fxAuto').checked;
        if (!o.fxAuto) o.fx = Number(g('fx').value || o.fx);
        o.capRate = Number(g('capRate').value || 0);
        o.divUsRate = Number(g('divUsRate').value || 0);
        o.divExtraRate = Number(g('divExtraRate').value || 0);
        o.tables.year = Number(g('tblYear').value || o.tables.year);
        o.theme = g('theme').value;
        o.lang = g('lang').value;
      }, { reason:'settings' });
      persistNow();
    };

    host.querySelectorAll('input,select').forEach(i => {
      if (i.type === 'file') return;
      i.addEventListener('change', () => {
        commit();
        if (i.name === 'lang'){ setLang(g('lang').value); ctx.rerender(); return; }
        if (i.name === 'fxAuto'){ if (g('fxAuto').checked) refreshFx({ force:true }).then(draw); else draw(); return; }
        if (i.name === 'theme'){ ctx.applyTheme(); return; }
        if (i.name === 'apiKey') connectWs();
        toast(t('set.saved'), 'ok');
      });
    });

    const ta = g('tables');
    if (ta) ta.addEventListener('change', () => {
      try {
        const parsed = JSON.parse(ta.value.replace(/"Infinity"/g, '1e18'));
        update(st => { st.settings.tables = parsed; }, { reason:'settings' });
        persistNow();
        toast(t('set.saved'), 'ok');
      } catch { toast(t('set.importErr'), 'err'); }
    });

    $('#resettbl').onclick = () => {
      update(st => { st.settings.tables = JSON.parse(JSON.stringify(DEFAULT_TABLES)); }, { reason:'settings' });
      toast(t('set.saved'), 'ok'); draw();
    };

    $('#fxnow').onclick = async () => {
      $('#fxnow').disabled = true;
      const r = await refreshFx({ force:true });
      toast(r ? `1 USD = ${r.rate} MXN` : t('set.importErr'), r ? 'ok' : 'err');
      $('#fxnow').disabled = false;
      if (r) draw();
    };

    $('#refcat').onclick = async () => {
      $('#refcat').disabled = true;
      try { await refreshCatalog(); toast(t('set.saved'), 'ok'); }
      catch { toast(t('set.importErr'), 'err'); }
      $('#refcat').disabled = false; draw();
    };

    $('#exp').onclick = () => {
      const url = URL.createObjectURL(exportBlob());
      const a = document.createElement('a');
      a.href = url; a.download = `bolsa-sim-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    };
    $('#imp').onclick = () => $('#file').click();
    $('#file').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { importFromText(await f.text()); toast(t('set.imported'), 'ok'); ctx.rerender(); }
      catch { toast(t('set.importErr'), 'err'); }
    };
    $('#rst').onclick = () => confirmSheet(t('set.reset'), t('set.resetConfirm'), () => { resetAll(); ctx.rerender(); });
  }

  draw();
  return { refresh: draw };
}
