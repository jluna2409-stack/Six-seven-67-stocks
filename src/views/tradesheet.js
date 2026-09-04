import { get } from '../store.js';
import { buy, sell, commissionFor, positions, dividend } from '../engine.js';
import { quotes, fetchQuote, lookup, isFund, watch, fetchProfile } from '../market.js';
import { issuerHeader, refreshHeaders, bestName } from '../instrument.js';
import { t } from '../i18n.js';
import { usd, num, esc, signedUsd, cls, signedPct, dateLong } from '../format.js';
import { sheet, toast, field, moneyInput } from '../ui.js';

/** Buy / sell sheet for one instrument. side = 'buy' | 'sell' */
export function openTrade(symbol, side = 'buy', afterFn){
  const meta = lookup(symbol) || { symbol, name: symbol, type:'' };
  const st = get();
  const held = positions(st, quotes).find(p => p.symbol === symbol);

  sheet({
    title: symbol,
    body: `
      ${issuerHeader(symbol)}
      <div class="pillrow" style="margin-bottom:14px">
        <button class="chip ${side === 'buy' ? 'active' : ''}" data-side="buy" style="flex:1">${esc(t('tr.buy'))}</button>
        <button class="chip ${side === 'sell' ? 'active' : ''}" data-side="sell" style="flex:1">${esc(t('tr.sell'))}</button>
      </div>

      <div class="row" style="margin-bottom:14px">
        <div><div class="tiny muted">${esc(t('tr.lastPrice'))}</div><div class="num" id="px" style="font-size:26px;font-weight:700">…</div></div>
        <div style="text-align:right"><div class="tiny muted" id="ctx-l">${esc(t('tr.available'))}</div><div class="num" id="ctx-v" style="font-size:17px;font-weight:650">${usd(st.cash)}</div></div>
      </div>

      <div class="pillrow" style="margin-bottom:12px">
        <button class="chip active" data-mode="qty">${esc(t('tr.byQty'))}</button>
        <button class="chip" data-mode="amt">${esc(t('tr.byAmount'))}</button>
      </div>

      <div id="inp-qty">${field(t('tr.qty'), `<input type="number" inputmode="decimal" step="0.0001" min="0" name="qty" placeholder="0" />`)}</div>
      <div id="inp-amt" hidden>${field(t('tr.amount'), moneyInput('amt'))}</div>

      <div class="pillrow" style="margin:-4px 0 14px" id="quick"></div>

      <div class="card tight" style="background:var(--bg-elev2);margin-bottom:14px">
        <div class="row small"><span class="muted">${esc(t('tr.qty'))}</span><span class="num" id="s-qty">0</span></div>
        <div class="row small" style="margin-top:7px"><span class="muted">${esc(t('tr.est'))}</span><span class="num" id="s-gross">${usd(0)}</span></div>
        <div class="row small" style="margin-top:7px"><span class="muted">${esc(t('tr.fee'))}</span><span class="num" id="s-fee">${usd(0)}</span></div>
        <div class="hair" style="margin:10px -12px"></div>
        <div class="row"><span style="font-weight:650" id="s-tl">${esc(t('tr.total'))}</span><span class="num" id="s-total" style="font-weight:700;font-size:17px">${usd(0)}</span></div>
        <div class="row small" id="s-gain" hidden style="margin-top:7px"><span class="muted">${esc(t('tr.realizedGain'))}</span><span class="num" id="s-gainv"></span></div>
      </div>

      <button class="btn buy" id="go">${esc(t('tr.confirmBuy'))}</button>
      <div class="tiny muted" style="margin-top:10px;text-align:center" id="hint"></div>`,

    onMount(el, close){
      let mode = 'qty', S = side, price = quotes[symbol]?.c || 0;
      const $ = s => el.querySelector(s);

      const setSide = s => {
        S = s;
        el.querySelectorAll('[data-side]').forEach(b => b.classList.toggle('active', b.dataset.side === s));
        $('#go').className = 'btn ' + (s === 'buy' ? 'buy' : 'sell');
        $('#go').textContent = s === 'buy' ? t('tr.confirmBuy') : t('tr.confirmSell');
        $('#s-tl').textContent = s === 'buy' ? t('tr.total') : t('tr.proceeds');
        $('#ctx-l').textContent = s === 'buy' ? t('tr.available') : t('tr.holding');
        $('#ctx-v').textContent = s === 'buy' ? usd(get().cash) : (held ? num(held.qty, 4) : '0');
        $('#s-gain').hidden = s !== 'sell' || !held;
        renderQuick();
        recalc();
      };

      const renderQuick = () => {
        const cash = get().cash;
        const opts = S === 'buy'
          ? [[25,'25%'],[50,'50%'],[100,'100%']].map(([p,l]) => ({ l, act:() => setAmt(cash * p / 100) }))
          : [[25,'25%'],[50,'50%'],[100,'100%']].map(([p,l]) => ({ l, act:() => setQty((held?.qty || 0) * p / 100) }));
        $('#quick').innerHTML = opts.map((o,i) => `<button class="chip" data-q="${i}">${o.l}</button>`).join('');
        $('#quick').onclick = e => {
          const b = e.target.closest('[data-q]'); if (!b) return;
          opts[Number(b.dataset.q)].act();
        };
      };

      const setQty = q => { mode = 'qty'; switchMode('qty'); $('[name=qty]').value = trim(q); recalc(); };
      const setAmt = a => { mode = 'amt'; switchMode('amt'); $('[name=amt]').value = a.toFixed(2); recalc(); };
      const trim = q => get().settings.fractional ? String(Math.max(0, Number(q.toFixed(6)))) : String(Math.floor(q));

      const switchMode = m => {
        mode = m;
        el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
        $('#inp-qty').hidden = m !== 'qty';
        $('#inp-amt').hidden = m !== 'amt';
      };

      function currentQty(){
        if (!price) return 0;
        let q = mode === 'qty'
          ? Number($('[name=qty]').value || 0)
          : Number($('[name=amt]').value || 0) / price;
        if (!get().settings.fractional) q = Math.floor(q);
        return Math.max(0, q);
      }

      function recalc(){
        const q = currentQty();
        const gross = q * price;
        const fee = commissionFor(gross);
        const total = S === 'buy' ? gross + fee : gross - fee;
        $('#s-qty').textContent = num(q, 6);
        $('#s-gross').textContent = usd(gross);
        $('#s-fee').textContent = usd(fee);
        $('#s-total').textContent = usd(Math.max(0, total));

        if (S === 'sell' && held && q > 0){
          const unit = held.cost / held.qty;
          const gain = total - unit * q;
          $('#s-gain').hidden = false;
          const gv = $('#s-gainv');
          gv.textContent = signedUsd(gain);
          gv.className = 'num ' + cls(gain);
        } else $('#s-gain').hidden = true;

        let err = '';
        if (!price) err = t('tr.stale');
        else if (q <= 0) err = '';
        else if (S === 'buy' && total > get().cash + 1e-9) err = t('tr.noCash');
        else if (S === 'sell' && (!held || q > held.qty + 1e-9)) err = t('tr.noShares');
        $('#hint').textContent = err || (get().settings.fractional ? t('tr.fractional') : '');
        $('#hint').className = 'tiny ' + (err ? 'down' : 'muted');
        $('#go').disabled = !!err || q <= 0 || !price;
      }

      el.querySelectorAll('[data-side]').forEach(b => b.onclick = () => setSide(b.dataset.side));
      el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { switchMode(b.dataset.mode); recalc(); });
      $('[name=qty]').oninput = recalc;
      $('[name=amt]').oninput = recalc;

      const paint = () => {
        price = quotes[symbol]?.c || 0;
        $('#px').textContent = price ? usd(price) : '—';
        recalc();
      };
      paint();
      fetchQuote(symbol).then(paint).catch(() => paint());
      // the issuer profile arrives after the sheet is already usable
      fetchProfile(symbol).then(pr => { if (pr) refreshHeaders(el, symbol); }).catch(() => {});

      $('#go').onclick = () => {
        const q = currentQty();
        if (q <= 0) return;
        const r = S === 'buy'
          ? buy({ symbol, name: bestName(symbol) || meta.name, type: meta.type, qty: q, price })
          : sell({ symbol, qty: q, price });
        if (!r.ok){ toast(t('tr.' + (r.error === 'noCash' ? 'noCash' : 'noShares')), 'err'); return; }
        toast(S === 'buy' ? t('tr.bought') : t('tr.sold'), 'ok');
        watch(Object.keys(get().positions));
        close();
        afterFn && afterFn();
      };

      setSide(S);
    }
  });
}

/** Position detail: lots, P/L, quick actions. */
export function openPosition(symbol, afterFn){
  const st = get();
  const p = positions(st, quotes).find(x => x.symbol === symbol);
  if (!p) return;
  sheet({
    title: symbol,
    body: `
      ${issuerHeader(symbol)}
      <div class="grid g2" style="margin-bottom:14px">
        <div class="kpi"><div class="k">${esc(t('pf.marketValue'))}</div><div class="v num">${usd(p.value)}</div><div class="d num">${num(p.qty,4)} × ${usd(p.last)}</div></div>
        <div class="kpi"><div class="k">${esc(t('pf.totalReturn'))}</div><div class="v num ${cls(p.pl)}">${signedUsd(p.pl)}</div><div class="d num ${cls(p.pl)}">${signedPct(p.plPct)}</div></div>
        <div class="kpi"><div class="k">${esc(t('pf.cost'))}</div><div class="v num">${usd(p.cost)}</div><div class="d num">${esc(t('pf.avg'))} ${usd(p.avg)}</div></div>
        <div class="kpi"><div class="k">${esc(t('pf.day'))}</div><div class="v num ${cls(p.dayChg)}">${signedUsd(p.dayChg)}</div><div class="d num ${cls(p.dayPct)}">${signedPct(p.dayPct)}</div></div>
      </div>

      <h3 class="card-title">${esc(t('pf.lots'))}</h3>
      <div class="scrollx" style="margin:0"><table class="tbl">
        <thead><tr><th>${esc(t('pf.lotDate'))}</th><th>${esc(t('pf.qty'))}</th><th>${esc(t('tr.price'))}</th><th>${esc(t('pf.pl'))}</th></tr></thead>
        <tbody>${p.lots.map(l => {
          const pl = l.qty * (p.last - l.price) - (l.fee || 0);
          return `<tr><td>${dateLong(l.ts)}</td><td class="num">${num(l.qty,4)}</td><td class="num">${usd(l.price)}</td><td class="num ${cls(pl)}">${signedUsd(pl)}</td></tr>`;
        }).join('')}</tbody>
      </table></div>

      <div class="stack" style="margin-top:16px">
        <div class="inline-2">
          <button class="btn buy" data-act="buy">${esc(t('pf.buyMore'))}</button>
          <button class="btn sell" data-act="sell">${esc(t('pf.sellPos'))}</button>
        </div>
        <button class="btn ghost" data-act="div">${esc(t('pf.dividend'))}</button>
      </div>`,
    onMount(el, close){
      fetchProfile(symbol).then(pr => { if (pr) refreshHeaders(el, symbol); }).catch(() => {});
      el.querySelector('[data-act=buy]').onclick = () => { close(); setTimeout(() => openTrade(symbol, 'buy', afterFn), 260); };
      el.querySelector('[data-act=sell]').onclick = () => { close(); setTimeout(() => openTrade(symbol, 'sell', afterFn), 260); };
      el.querySelector('[data-act=div]').onclick = () => { close(); setTimeout(() => openDividend(symbol, afterFn), 260); };
    }
  });
}

/** Manual dividend entry (Finnhub's dividend feed is a paid endpoint). */
export function openDividend(symbol, afterFn){
  sheet({
    title: t('pf.dividend'),
    sub: `${esc(symbol)} · ${esc(bestName(symbol))}`,
    body: `${field(t('tax.divGross'), moneyInput('gross'))}
      <div class="note" style="margin-bottom:14px">${esc(t('tax.divHelp'))}</div>
      <div class="card tight" style="background:var(--bg-elev2);margin-bottom:14px">
        <div class="row small"><span class="muted">${esc(t('tax.divUS'))}</span><span class="num" id="wh">${usd(0)}</span></div>
        <div class="row small" style="margin-top:7px"><span class="muted">${esc(t('tax.divNet'))}</span><span class="num" id="net" style="font-weight:700">${usd(0)}</span></div>
      </div>
      <button class="btn" id="go">${esc(t('act.confirm'))}</button>`,
    onMount(el, close){
      const rate = get().settings.divUsRate / 100;
      const inp = el.querySelector('[name=gross]');
      const upd = () => {
        const g = Number(inp.value || 0);
        el.querySelector('#wh').textContent = usd(g * rate);
        el.querySelector('#net').textContent = usd(g * (1 - rate));
      };
      inp.oninput = upd;
      el.querySelector('#go').onclick = () => {
        const g = Number(inp.value || 0);
        if (g <= 0) return;
        dividend({ symbol, gross: g });
        toast(t('act.done'), 'ok');
        close();
        afterFn && afterFn();
      };
    }
  });
}
