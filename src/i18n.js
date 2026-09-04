// Bilingual dictionary (es / en). Keys are dot-namespaced.
export const DICT = {
  es: {
    'nav.dashboard':'Resumen','nav.portfolio':'Cartera','nav.trade':'Operar','nav.cash':'Efectivo',
    'nav.taxes':'Impuestos','nav.history':'Historial','nav.settings':'Ajustes',

    'mkt.live':'En vivo','mkt.closed':'Mercado cerrado','mkt.connecting':'Conectando…','mkt.offline':'Sin conexión',
    'mkt.delayed':'Últ. precio',

    'dash.networth':'Patrimonio total','dash.today':'hoy','dash.cash':'Efectivo','dash.invested':'Invertido',
    'dash.gain':'Ganancia total','dash.contrib':'Aportado neto','dash.unrealized':'Plusvalía no realizada',
    'dash.realized':'Ganancia realizada','dash.taxdue':'Impuesto estimado','dash.positions':'Posiciones',
    'dash.alloc':'Distribución','dash.since':'desde el inicio','dash.watch':'Precios en vivo',
    'dash.nodata':'Aún no hay historial. El patrimonio se registra automáticamente cada día que abras la app.',
    'dash.emptyPos':'No tienes posiciones. Ve a Operar para comprar tu primera acción o ETF.',
    'dash.twr':'Rendimiento (TWR)','dash.money':'Dinero',

    'range.1D':'HOY','range.1W':'1S','range.1M':'1M','range.3M':'3M','range.6M':'6M','range.1Y':'1A','range.ALL':'TODO',

    'pf.title':'Cartera','pf.value':'Valor','pf.cost':'Costo','pf.qty':'Títulos','pf.avg':'Precio prom.',
    'pf.pl':'P/G','pf.day':'Día','pf.weight':'Peso','pf.sortValue':'Valor','pf.sortPL':'P/G','pf.sortName':'Nombre',
    'pf.buyMore':'Comprar más','pf.sellPos':'Vender','pf.detail':'Detalle de posición','pf.lots':'Lotes','pf.lotDate':'Fecha de compra',
    'pf.dividend':'Registrar dividendo','pf.marketValue':'Valor de mercado','pf.totalReturn':'Rendimiento total',

    'tr.title':'Operar','tr.search':'Busca acción o ETF (símbolo o nombre)','tr.buy':'Comprar','tr.sell':'Vender',
    'tr.qty':'Cantidad de títulos','tr.amount':'Monto en USD','tr.byQty':'Por títulos','tr.byAmount':'Por monto',
    'tr.price':'Precio','tr.est':'Estimado','tr.fee':'Comisión','tr.total':'Total','tr.proceeds':'Recibes',
    'tr.available':'Efectivo disponible','tr.holding':'Tienes','tr.confirmBuy':'Confirmar compra',
    'tr.confirmSell':'Confirmar venta','tr.noCash':'Efectivo insuficiente','tr.noShares':'No tienes suficientes títulos',
    'tr.bought':'Compra ejecutada','tr.sold':'Venta ejecutada','tr.pickSymbol':'Elige un instrumento',
    'tr.catalog':'instrumentos disponibles','tr.filterAll':'Todos','tr.filterStock':'Acciones','tr.filterEtf':'ETFs / Indexados',
    'tr.popular':'Populares','tr.noresults':'Sin resultados','tr.realizedGain':'Ganancia realizada en esta venta',
    'tr.fractional':'Se permiten fracciones','tr.lastPrice':'Último precio','tr.stale':'Precio no disponible; actualiza.',

    'cash.title':'Efectivo','cash.balance':'Saldo en efectivo','cash.deposit':'Depositar','cash.withdraw':'Retirar',
    'cash.depositTitle':'Depositar dinero','cash.withdrawTitle':'Retirar dinero','cash.amount':'Monto (USD)',
    'cash.note':'Nota (opcional)','cash.emergency':'Retiro de emergencia','cash.recurring':'Ingresos recurrentes',
    'cash.addRecurring':'Agregar ingreso recurrente','cash.salary':'Salario','cash.oneoff':'Aportación única',
    'cash.freq':'Frecuencia','cash.weekly':'Semanal','cash.biweekly':'Catorcenal (cada 14 días)',
    'cash.semimonthly':'Quincenal (día 15 y último)','cash.monthly':'Mensual','cash.start':'Empieza el',
    'cash.grossNet':'El monto que capturo es…','cash.net':'Neto (lo que recibo)','cash.gross':'Bruto (antes de ISR e IMSS)',
    'cash.grossHelp':'Si eliges bruto, se calcula el ISR mensual e IMSS de México y solo se deposita el neto.',
    'cash.next':'Siguiente depósito','cash.active':'Activo','cash.paused':'Pausado','cash.pause':'Pausar',
    'cash.resume':'Reanudar','cash.delete':'Eliminar','cash.noRecurring':'Sin ingresos recurrentes configurados.',
    'cash.applied':'Se aplicaron {n} depósitos programados','cash.autoInfo':'Los depósitos programados se aplican solos cada vez que abres la app (incluye los atrasados).',
    'cash.deposited':'Depósito registrado','cash.withdrawn':'Retiro registrado','cash.insufficient':'Saldo insuficiente',
    'cash.simSalary':'Simular salario','cash.netPreview':'Neto estimado','cash.isrRet':'ISR retenido',
    'cash.imss':'IMSS trabajador','cash.subsidy':'Subsidio al empleo','cash.perYear':'al año',
    'cash.currency':'Moneda del monto','cash.pegged':'anclado a pesos','cash.pegHelp':'El monto queda fijo en pesos: cada depósito se convierte con el tipo de cambio de ese día, así que si el peso se mueve sigues cobrando lo mismo en pesos. Los depósitos atrasados usan el tipo de cambio que aplicaba en su fecha.','cash.pegUsdHelp':'El monto queda fijo en dólares, sin importar cómo se mueva el peso.','cash.yield':'Rendimiento anual del efectivo','cash.interest':'Interés','cash.name':'Nombre',

    'tax.title':'Impuestos (México)','tax.year':'Ejercicio','tax.capgains':'Ganancia de capital (bolsa)',
    'tax.capgainsHelp':'Art. 129 LISR: 10% definitivo sobre la ganancia anual neta por enajenación de acciones en bolsas reconocidas (incluye el SIC). Las pérdidas se amortizan 10 años.',
    'tax.gains':'Ganancias del año','tax.losses':'Pérdidas del año','tax.netGain':'Ganancia neta',
    'tax.carry':'Pérdidas de años anteriores','tax.carryUsed':'Pérdidas aplicadas','tax.carryLeft':'Pérdidas por amortizar',
    'tax.taxable':'Base gravable','tax.rate':'Tasa','tax.due':'ISR a pagar','tax.dividends':'Dividendos del extranjero',
    'tax.divHelp':'Retención de EE. UU. 10% (tratado, W-8BEN) + en México: acumulables a la tarifa anual (Art. 152) y 10% adicional (Art. 142 fr. V). El impuesto pagado en EE. UU. se acredita hasta el límite del ISR mexicano sobre ese ingreso.',
    'tax.divGross':'Dividendos brutos','tax.divUS':'Retención EE.UU. (10%)','tax.divNet':'Neto recibido',
    'tax.divExtra':'ISR adicional 10%','tax.salary':'Sueldos','tax.salaryGross':'Ingreso bruto',
    'tax.salaryRet':'ISR retenido','tax.annual':'Declaración anual estimada','tax.base':'Ingreso acumulable',
    'tax.isrAnnual':'ISR según tarifa anual','tax.credits':'Acreditamientos','tax.balance':'Saldo',
    'tax.toPay':'A cargo','tax.toRefund':'A favor','tax.pay':'Pagar impuesto ahora','tax.paid':'Pagado',
    'tax.payHelp':'Registrar el pago descuenta el monto de tu efectivo y lo marca como liquidado.',
    'tax.unrealizedNote':'La plusvalía no realizada no paga impuesto hasta que vendes.',
    'tax.estUnrealized':'Impuesto latente si vendieras todo hoy','tax.effective':'Tasa efectiva',
    'tax.noData':'Sin movimientos gravables este año.','tax.disclaimer':'Cálculo educativo y aproximado. No es asesoría fiscal. Verifica las tarifas vigentes del ejercicio en el Anexo 8 de la RMF.',
    'tax.tables':'Tarifas y parámetros','tax.tableYear':'Tarifas cargadas',

    'hist.title':'Historial','hist.all':'Todo','hist.trades':'Operaciones','hist.cashflow':'Efectivo',
    'hist.taxes':'Impuestos','hist.empty':'Sin movimientos todavía.','hist.export':'Exportar CSV',
    'hist.undo':'Deshacer último movimiento','hist.undone':'Movimiento revertido',

    'set.title':'Ajustes','set.language':'Idioma','set.theme':'Tema','set.themeSystem':'Sistema',
    'set.themeDark':'Oscuro','set.themeLight':'Claro','set.market':'Datos de mercado','set.apikey':'API key de Finnhub',
    'set.avkey':'API key de Alpha Vantage (opcional)','set.avHelp':'Sirve para descargar historial de precios pasado. Sin ella, la app construye el historial desde hoy con los precios que va observando.',
    'set.refreshCatalog':'Actualizar catálogo de instrumentos','set.catalogInfo':'{n} instrumentos ({e} ETFs) — actualizado {d}',
    'set.trading':'Reglas de simulación','set.commission':'Comisión por operación (%)','set.commissionMin':'Comisión mínima (USD)',
    'set.fractional':'Permitir títulos fraccionarios','set.costMethod':'Método de costo','set.fifo':'PEPS (FIFO)',
    'set.avg':'Costo promedio','set.fx':'Tipo de cambio USD/MXN','set.fxHelp':'Se usa para convertir a pesos al aplicar las tarifas del ISR mexicano.',
    'set.taxcfg':'Impuestos','set.capRate':'Tasa ganancia de capital (%)','set.divUSRate':'Retención EE.UU. dividendos (%)',
    'set.divMXRate':'ISR adicional dividendos (%)','set.autoPayTax':'Descontar el ISR anual del efectivo automáticamente en abril',
    'set.data':'Datos','set.export':'Exportar respaldo (.json)','set.import':'Importar respaldo',
    'set.reset':'Borrar todo y empezar de cero','set.resetConfirm':'Esto borra toda tu simulación. ¿Seguro?',
    'set.saved':'Guardado','set.imported':'Respaldo importado','set.importErr':'Archivo inválido',
    'set.storage':'Tus datos se guardan solo en este navegador (localStorage). Exporta un respaldo para no perderlos.',
    'set.startCash':'Efectivo inicial','set.about':'Acerca de','set.updated':'actualizado',

    'act.cancel':'Cancelar','act.save':'Guardar','act.confirm':'Confirmar','act.close':'Cerrar','act.add':'Agregar',
    'act.done':'Listo','act.delete':'Eliminar','act.edit':'Editar','act.refresh':'Actualizar',

    'tx.DEPOSIT':'Depósito','tx.WITHDRAW':'Retiro','tx.SALARY':'Salario','tx.BUY':'Compra','tx.SELL':'Venta',
    'tx.DIVIDEND':'Dividendo','tx.TAX':'Pago de ISR','tx.INTEREST':'Interés','tx.FEE':'Comisión',

    'inst.fundNote':'Fondo indexado / ETF','div.title':'Dividendos','div.total':'Total cobrado','div.netPocket':'Neto en tu bolsillo',
    'div.gross':'Bruto','div.withheld':'Retención EE.UU.','div.yieldCost':'Rendimiento sobre costo',
    'div.monthly':'Promedio mensual','div.annualised':'Ritmo anual','div.payments':'pagos',
    'div.none':'Aún no registras dividendos. Abre una posición y usa "Registrar dividendo" cuando tu broker te pague uno.',
    'div.byPosition':'Por posición','div.thisYear':'Este año','div.allTime':'Histórico',
    'div.lastPay':'Último pago','div.sold':'ya vendida',

    'hold.title':'Mis acciones y fondos','hold.shares':'títulos','hold.instruments':'instrumentos',
    'hold.stocks':'Acciones de empresas','hold.funds':'ETFs / índices','hold.what':'Empresa / índice',
    'hold.value':'Valor','hold.none':'Todavía no tienes títulos.','hold.total':'Total invertido',

    'help.title':'Ayuda e información','help.sub':'Toca un tema para ver cómo funciona.',
    'help.open':'Ver ayuda',
    'set.fxAuto':'Actualizar el tipo de cambio automáticamente','set.fxSource':'Fuente',
    'set.fxNever':'sin actualizar','set.fxNow':'Actualizar ahora','set.fxDaily':'Cotización diaria',

    'ob.title':'Calendario de obligaciones','ob.annual':'Declaración anual {y}','ob.dividend':'10% adicional dividendos · {p}','ob.due':'Vence','ob.pay':'Pagar','ob.paid':'Pagado','ob.overdue':'Vencido','ob.soon':'Ya casi','ob.upcoming':'Programado','ob.accruing':'En curso','ob.daysLeft':'faltan {n} días','ob.daysOver':'{n} días de retraso','ob.dueToday':'vence hoy','ob.dueTomorrow':'vence mañana','ob.none':'No tienes pagos de impuestos pendientes.','ob.accruingHelp':'El ejercicio todavía no cierra: el monto puede cambiar con lo que hagas el resto del año. La fecha de pago corre a partir del 1 de enero.','ob.annualNote':'Se presenta y se paga a más tardar el 30 de abril del año siguiente (Art. 150 LISR). Incluye el 10% de la ganancia de bolsa y el saldo de la tarifa anual.','ob.monthlyNote':'El 10% adicional sobre dividendos del extranjero se entera el día 17 del mes siguiente al que los cobraste (Art. 142 fr. V LISR). No espera a la declaración anual.','ob.alertOverdue':'Tienes {n} pago de impuestos vencido','ob.alertOverdueN':'Tienes {n} pagos de impuestos vencidos','ob.alertSoon':'Se acerca una fecha de pago','ob.goPay':'Ver y pagar','ob.autoPaid':'Se pagaron {n} impuestos automáticamente','ob.owed':'Total por pagar','ob.next':'Siguiente vencimiento','ob.nothingDue':'Nada por pagar','set.autoPayHelp':'Cuando llegue la fecha, la app descuenta el impuesto de tu efectivo sin preguntar. Si no alcanza, lo deja pendiente.',

    'onb.title':'Bienvenido a Bolsa Sim','onb.sub':'Simulador de inversión a largo plazo con precios reales y régimen fiscal mexicano.',
    'onb.cash':'¿Con cuánto efectivo empiezas? (USD)','onb.start':'Empezar','onb.lang':'Idioma',
    'first.hint':'Todo se guarda en tu navegador. Puedes cerrar y volver en semanas: la simulación continúa.'
  },

  en: {
    'nav.dashboard':'Overview','nav.portfolio':'Portfolio','nav.trade':'Trade','nav.cash':'Cash',
    'nav.taxes':'Taxes','nav.history':'History','nav.settings':'Settings',

    'mkt.live':'Live','mkt.closed':'Market closed','mkt.connecting':'Connecting…','mkt.offline':'Offline',
    'mkt.delayed':'Last price',

    'dash.networth':'Net worth','dash.today':'today','dash.cash':'Cash','dash.invested':'Invested',
    'dash.gain':'Total gain','dash.contrib':'Net contributed','dash.unrealized':'Unrealized gain',
    'dash.realized':'Realized gain','dash.taxdue':'Estimated tax','dash.positions':'Positions',
    'dash.alloc':'Allocation','dash.since':'since inception','dash.watch':'Live prices',
    'dash.nodata':'No history yet. Net worth is recorded automatically each day you open the app.',
    'dash.emptyPos':'No positions yet. Go to Trade to buy your first stock or ETF.',
    'dash.twr':'Return (TWR)','dash.money':'Money',

    'range.1D':'1D','range.1W':'1W','range.1M':'1M','range.3M':'3M','range.6M':'6M','range.1Y':'1Y','range.ALL':'ALL',

    'pf.title':'Portfolio','pf.value':'Value','pf.cost':'Cost','pf.qty':'Shares','pf.avg':'Avg price',
    'pf.pl':'P/L','pf.day':'Day','pf.weight':'Weight','pf.sortValue':'Value','pf.sortPL':'P/L','pf.sortName':'Name',
    'pf.buyMore':'Buy more','pf.sellPos':'Sell','pf.detail':'Position detail','pf.lots':'Lots','pf.lotDate':'Purchase date',
    'pf.dividend':'Record dividend','pf.marketValue':'Market value','pf.totalReturn':'Total return',

    'tr.title':'Trade','tr.search':'Search stock or ETF (symbol or name)','tr.buy':'Buy','tr.sell':'Sell',
    'tr.qty':'Number of shares','tr.amount':'Amount in USD','tr.byQty':'By shares','tr.byAmount':'By amount',
    'tr.price':'Price','tr.est':'Estimated','tr.fee':'Commission','tr.total':'Total','tr.proceeds':'You receive',
    'tr.available':'Cash available','tr.holding':'You hold','tr.confirmBuy':'Confirm buy',
    'tr.confirmSell':'Confirm sell','tr.noCash':'Not enough cash','tr.noShares':'Not enough shares',
    'tr.bought':'Buy executed','tr.sold':'Sell executed','tr.pickSymbol':'Pick an instrument',
    'tr.catalog':'instruments available','tr.filterAll':'All','tr.filterStock':'Stocks','tr.filterEtf':'ETFs / Index funds',
    'tr.popular':'Popular','tr.noresults':'No results','tr.realizedGain':'Realized gain on this sale',
    'tr.fractional':'Fractional shares allowed','tr.lastPrice':'Last price','tr.stale':'Price unavailable; refresh.',

    'cash.title':'Cash','cash.balance':'Cash balance','cash.deposit':'Deposit','cash.withdraw':'Withdraw',
    'cash.depositTitle':'Deposit money','cash.withdrawTitle':'Withdraw money','cash.amount':'Amount (USD)',
    'cash.note':'Note (optional)','cash.emergency':'Emergency withdrawal','cash.recurring':'Recurring income',
    'cash.addRecurring':'Add recurring income','cash.salary':'Salary','cash.oneoff':'One-off contribution',
    'cash.freq':'Frequency','cash.weekly':'Weekly','cash.biweekly':'Every 14 days',
    'cash.semimonthly':'Semi-monthly (15th & month end)','cash.monthly':'Monthly','cash.start':'Starts on',
    'cash.grossNet':'The amount I enter is…','cash.net':'Net (what I receive)','cash.gross':'Gross (before ISR & IMSS)',
    'cash.grossHelp':'If gross, Mexican monthly income tax and social security are computed and only the net is deposited.',
    'cash.next':'Next deposit','cash.active':'Active','cash.paused':'Paused','cash.pause':'Pause',
    'cash.resume':'Resume','cash.delete':'Delete','cash.noRecurring':'No recurring income configured.',
    'cash.applied':'{n} scheduled deposits applied','cash.autoInfo':'Scheduled deposits are applied automatically every time you open the app (missed ones included).',
    'cash.deposited':'Deposit recorded','cash.withdrawn':'Withdrawal recorded','cash.insufficient':'Insufficient balance',
    'cash.simSalary':'Simulate salary','cash.netPreview':'Estimated net','cash.isrRet':'Income tax withheld',
    'cash.imss':'Social security (worker)','cash.subsidy':'Employment subsidy','cash.perYear':'per year',
    'cash.currency':'Amount currency','cash.pegged':'pegged to pesos','cash.pegHelp':'The amount stays fixed in pesos: each deposit converts at that day\u2019s rate, so you keep earning the same in pesos as the peso moves. Missed deposits use the rate that applied on their own date.','cash.pegUsdHelp':'The amount stays fixed in dollars, whatever the peso does.','cash.yield':'Annual yield on cash','cash.interest':'Interest','cash.name':'Name',

    'tax.title':'Taxes (Mexico)','tax.year':'Tax year','tax.capgains':'Capital gains (listed shares)',
    'tax.capgainsHelp':'Art. 129 LISR: flat 10% on the annual net gain from selling shares on recognized exchanges (incl. Mexico’s SIC). Losses carry forward 10 years.',
    'tax.gains':'Gains this year','tax.losses':'Losses this year','tax.netGain':'Net gain',
    'tax.carry':'Loss carryforward','tax.carryUsed':'Losses applied','tax.carryLeft':'Losses remaining',
    'tax.taxable':'Taxable base','tax.rate':'Rate','tax.due':'Tax due','tax.dividends':'Foreign dividends',
    'tax.divHelp':'10% U.S. withholding (treaty, W-8BEN) + in Mexico: added to the annual progressive tariff (Art. 152) plus an extra 10% (Art. 142 fr. V). U.S. tax paid is credited up to the Mexican tax on that income.',
    'tax.divGross':'Gross dividends','tax.divUS':'U.S. withholding (10%)','tax.divNet':'Net received',
    'tax.divExtra':'Extra 10% income tax','tax.salary':'Wages','tax.salaryGross':'Gross income',
    'tax.salaryRet':'Tax withheld','tax.annual':'Estimated annual return','tax.base':'Taxable income',
    'tax.isrAnnual':'Tax per annual tariff','tax.credits':'Credits','tax.balance':'Balance',
    'tax.toPay':'Payable','tax.toRefund':'Refundable','tax.pay':'Pay tax now','tax.paid':'Paid',
    'tax.payHelp':'Recording the payment deducts it from your cash and marks it settled.',
    'tax.unrealizedNote':'Unrealized gains are not taxed until you sell.',
    'tax.estUnrealized':'Latent tax if you sold everything today','tax.effective':'Effective rate',
    'tax.noData':'No taxable activity this year.','tax.disclaimer':'Educational approximation. Not tax advice. Verify the current-year tariffs in Annex 8 of the RMF.',
    'tax.tables':'Tariffs & parameters','tax.tableYear':'Loaded tariffs',

    'hist.title':'History','hist.all':'All','hist.trades':'Trades','hist.cashflow':'Cash',
    'hist.taxes':'Taxes','hist.empty':'No activity yet.','hist.export':'Export CSV',
    'hist.undo':'Undo last entry','hist.undone':'Entry reverted',

    'set.title':'Settings','set.language':'Language','set.theme':'Theme','set.themeSystem':'System',
    'set.themeDark':'Dark','set.themeLight':'Light','set.market':'Market data','set.apikey':'Finnhub API key',
    'set.avkey':'Alpha Vantage API key (optional)','set.avHelp':'Used to backfill past price history. Without it, the app builds history from today using the prices it observes.',
    'set.refreshCatalog':'Refresh instrument catalog','set.catalogInfo':'{n} instruments ({e} ETFs) — updated {d}',
    'set.trading':'Simulation rules','set.commission':'Commission per trade (%)','set.commissionMin':'Minimum commission (USD)',
    'set.fractional':'Allow fractional shares','set.costMethod':'Cost basis method','set.fifo':'FIFO',
    'set.avg':'Average cost','set.fx':'USD/MXN exchange rate','set.fxHelp':'Used to convert to pesos when applying Mexican tax tariffs.',
    'set.taxcfg':'Taxes','set.capRate':'Capital gains rate (%)','set.divUSRate':'U.S. dividend withholding (%)',
    'set.divMXRate':'Extra dividend tax (%)','set.autoPayTax':'Automatically deduct the annual tax from cash in April',
    'set.data':'Data','set.export':'Export backup (.json)','set.import':'Import backup',
    'set.reset':'Erase everything and start over','set.resetConfirm':'This deletes your whole simulation. Are you sure?',
    'set.saved':'Saved','set.imported':'Backup imported','set.importErr':'Invalid file',
    'set.storage':'Your data lives only in this browser (localStorage). Export a backup so you don’t lose it.',
    'set.startCash':'Starting cash','set.about':'About','set.updated':'updated',

    'act.cancel':'Cancel','act.save':'Save','act.confirm':'Confirm','act.close':'Close','act.add':'Add',
    'act.done':'Done','act.delete':'Delete','act.edit':'Edit','act.refresh':'Refresh',

    'tx.DEPOSIT':'Deposit','tx.WITHDRAW':'Withdrawal','tx.SALARY':'Salary','tx.BUY':'Buy','tx.SELL':'Sell',
    'tx.DIVIDEND':'Dividend','tx.TAX':'Tax payment','tx.INTEREST':'Interest','tx.FEE':'Commission',

    'inst.fundNote':'Index fund / ETF','div.title':'Dividends','div.total':'Total received','div.netPocket':'Net in your pocket',
    'div.gross':'Gross','div.withheld':'U.S. withholding','div.yieldCost':'Yield on cost',
    'div.monthly':'Monthly average','div.annualised':'Annual pace','div.payments':'payments',
    'div.none':'No dividends recorded yet. Open a position and use "Record dividend" when your broker pays one.',
    'div.byPosition':'By position','div.thisYear':'This year','div.allTime':'All time',
    'div.lastPay':'Last payment','div.sold':'sold',

    'hold.title':'My shares and funds','hold.shares':'shares','hold.instruments':'instruments',
    'hold.stocks':'Company stocks','hold.funds':'ETFs / indexes','hold.what':'Company / index',
    'hold.value':'Value','hold.none':'You do not hold any shares yet.','hold.total':'Total invested',

    'help.title':'Help & information','help.sub':'Tap a topic to see how it works.',
    'help.open':'Open help',
    'set.fxAuto':'Refresh the exchange rate automatically','set.fxSource':'Source',
    'set.fxNever':'never refreshed','set.fxNow':'Refresh now','set.fxDaily':'Daily quote',

    'ob.title':'Tax calendar','ob.annual':'Annual return {y}','ob.dividend':'Extra 10% on dividends · {p}','ob.due':'Due','ob.pay':'Pay','ob.paid':'Paid','ob.overdue':'Overdue','ob.soon':'Due soon','ob.upcoming':'Scheduled','ob.accruing':'In progress','ob.daysLeft':'{n} days left','ob.daysOver':'{n} days overdue','ob.dueToday':'due today','ob.dueTomorrow':'due tomorrow','ob.none':'No tax payments pending.','ob.accruingHelp':'The tax year is still open: the amount can change with what you do for the rest of it. The clock starts on 1 January.','ob.annualNote':'Filed and paid by 30 April of the following year (art. 150 LISR). It carries the 10% on capital gains and the balance of the annual tariff.','ob.monthlyNote':'The extra 10% on foreign dividends is paid by the 17th of the month after you received them (art. 142 fr. V LISR). It does not wait for the annual return.','ob.alertOverdue':'You have {n} overdue tax payment','ob.alertOverdueN':'You have {n} overdue tax payments','ob.alertSoon':'A tax deadline is coming up','ob.goPay':'Review and pay','ob.autoPaid':'{n} taxes paid automatically','ob.owed':'Total to pay','ob.next':'Next deadline','ob.nothingDue':'Nothing due','set.autoPayHelp':'When the date arrives, the app deducts the tax from your cash without asking. If cash is short, it stays pending.',

    'onb.title':'Welcome to Bolsa Sim','onb.sub':'Long-term investing simulator with real prices and the Mexican tax regime.',
    'onb.cash':'How much cash do you start with? (USD)','onb.start':'Start','onb.lang':'Language',
    'first.hint':'Everything is saved in your browser. Close it and come back weeks later: the simulation keeps going.'
  }
};

let lang = 'es';
const listeners = new Set();

export function setLang(l){ lang = (l === 'en') ? 'en' : 'es'; document.documentElement.lang = lang; listeners.forEach(f => f(lang)); }
export function getLang(){ return lang; }
export function onLang(fn){ listeners.add(fn); return () => listeners.delete(fn); }

/** t('key', {n: 3}) — falls back to Spanish, then to the key itself. */
export function t(key, vars){
  let s = DICT[lang][key] ?? DICT.es[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k]);
  return s;
}
