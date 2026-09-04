import { getLang } from './i18n.js';

const loc = () => (getLang() === 'en' ? 'en-US' : 'es-MX');

export function usd(n, dp = 2){
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat(loc(), { style:'currency', currency:'USD', minimumFractionDigits:dp, maximumFractionDigits:dp }).format(n);
}
export function usdCompact(n){
  if (!isFinite(n)) n = 0;
  const a = Math.abs(n);
  if (a >= 1e6) return (n < 0 ? '-' : '') + '$' + (a/1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e4) return (n < 0 ? '-' : '') + '$' + (a/1e3).toFixed(1) + 'k';
  return usd(n);
}
export function signedUsd(n, dp = 2){ return (n > 0 ? '+' : n < 0 ? '−' : '') + usd(Math.abs(n), dp); }
export function pct(n, dp = 2){
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat(loc(), { minimumFractionDigits:dp, maximumFractionDigits:dp }).format(n) + '%';
}
export function signedPct(n, dp = 2){ return (n > 0 ? '+' : n < 0 ? '−' : '') + pct(Math.abs(n), dp); }
export function num(n, dp = 4){
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat(loc(), { minimumFractionDigits:0, maximumFractionDigits:dp }).format(n);
}
export function mxn(n){
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat('es-MX', {
    style:'currency', currency:'MXN', currencyDisplay:'code', maximumFractionDigits:2
  }).format(n);
}
export function dateShort(ts){
  return new Date(ts).toLocaleDateString(loc(), { day:'numeric', month:'short' });
}
export function dateLong(ts){
  return new Date(ts).toLocaleDateString(loc(), { day:'numeric', month:'short', year:'numeric' });
}
export function dateTime(ts){
  return new Date(ts).toLocaleString(loc(), { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
export function timeShort(ts){
  return new Date(ts).toLocaleTimeString(loc(), { hour:'2-digit', minute:'2-digit' });
}
/** Local-calendar day key, e.g. 2026-09-04 */
export function dayKey(d = new Date()){
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}
export function dayKeyToTs(k){
  const [y,m,d] = k.split('-').map(Number);
  return new Date(y, m-1, d, 16, 0, 0).getTime();
}
export function cls(n){ return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'; }
export function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
export function uid(){ return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
