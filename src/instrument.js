/**
 * Instrument identity: the mark (logo or monogram), the best name available,
 * and the issuer header shown at the top of a trade or position sheet.
 *
 * Finnhub serves issuer profiles for individual stocks only; ETFs come back
 * empty, so they keep the catalog's abbreviated name and get a monogram.
 */
import { profileOf, lookup, isFund } from './market.js';
import { get } from './store.js';
import { esc } from './format.js';
import { t } from './i18n.js';
import { PALETTE } from './charts.js';

/** Stable colour per symbol, so a monogram always looks the same. */
function markColor(symbol){
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Logo when there is one, otherwise a coloured monogram. */
export function mark(symbol, size = 34){
  const p = profileOf(symbol);
  const letters = symbol.replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase() || '\u2022';
  const style = `width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.26)}px`;
  const mono = `<span class="mark mono" style="${style};background:${markColor(symbol)}">${esc(letters)}</span>`;
  if (!p?.logo) return mono;
  // The logo sits on top of the monogram; if it fails to load it removes itself
  // and the monogram shows through, so there is never an empty box.
  return `<span class="mark-wrap" style="${style}">${mono}` +
    `<img class="mark mark-over" src="${esc(p.logo)}" alt="" loading="lazy" style="${style}" onerror="this.remove()" /></span>`;
}

/** Best name we have: issuer profile first, then the position, then the catalog. */
export function bestName(symbol){
  const p = profileOf(symbol);
  const fallback = get().positions[symbol]?.name || lookup(symbol)?.name || symbol;
  // Finnhub answers a class-B ticker with the class-A profile, whose name drops
  // the share class. When the profile describes a different ticker, the catalog
  // name is the accurate one ("BERKSHIRE HATHAWAY INC-CL B").
  if (p?.name && (!p.ticker || p.ticker === symbol)) return p.name;
  return fallback;
}

export function typeOf(symbol){
  return get().positions[symbol]?.type || lookup(symbol)?.type || '';
}

/** Header block for a sheet: mark, symbol, full name, exchange and industry. */
export function issuerHeader(symbol){
  const p = profileOf(symbol);
  const type = typeOf(symbol);
  const fund = isFund(type);
  const sub = p
    ? [p.exchange, p.industry].filter(Boolean).join(' · ')
    : (fund ? t('inst.fundNote') : '');
  return `<div class="inst-head" data-inst="${esc(symbol)}">
    ${mark(symbol, 42)}
    <div class="inst-txt">
      <div class="inst-name">${esc(bestName(symbol))}</div>
      <div class="inst-sub">${esc(symbol)}
        <span class="badge ${fund ? 'etf' : 'stock'}">${fund ? 'ETF' : 'STOCK'}</span>
        ${sub ? `<span class="inst-exch">${esc(sub)}</span>` : ''}</div>
    </div>
  </div>`;
}

/** Re-render a header in place once its profile arrives. */
export function refreshHeaders(root, symbol){
  root.querySelectorAll(`[data-inst="${CSS.escape(symbol)}"]`).forEach(el => {
    el.outerHTML = issuerHeader(symbol);
  });
}
