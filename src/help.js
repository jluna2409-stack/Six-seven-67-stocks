/**
 * Contextual help. Any element with data-help="topic" opens an explanation
 * sheet — the handler is installed once, globally, in main.js.
 */
import { getLang, t } from './i18n.js';
import { sheet } from './ui.js';
import { esc } from './format.js';

export const TOPICS = {
  networth: {
    es: ['¿Qué es el patrimonio total?',
      `Es <b>todo lo que tienes</b> dentro de la simulación: el efectivo sin invertir más el valor de mercado de tus acciones y ETFs al precio de este momento.
       <p>La cifra sube o baja sola conforme se mueven los precios, aunque no hagas nada.</p>
       <p><b>Patrimonio = Efectivo + Invertido</b></p>
       <p>Arrastra el dedo sobre la gráfica para ver cuánto tenías en cualquier fecha.</p>`],
    en: ['What is net worth?',
      `Everything you hold inside the simulation: uninvested cash plus the market value of your stocks and ETFs at the current price.
       <p>It moves on its own as prices move, even if you do nothing.</p>
       <p><b>Net worth = Cash + Invested</b></p>
       <p>Drag across the chart to see what you had on any date.</p>`]
  },
  gain: {
    es: ['¿Cómo se calcula la ganancia total?',
      `Se compara tu patrimonio de hoy contra <b>todo el dinero que metiste menos el que sacaste</b> (depósitos y sueldo, menos retiros). Esa diferencia es lo que realmente ganaste o perdiste.
       <p><b>Ganancia = Patrimonio − Aportado neto</b></p>
       <p>Meter más dinero <b>no</b> aumenta esta cifra: aumenta tu patrimonio y también tu aportado, así que la ganancia no se infla artificialmente.</p>
       <p>Ya trae descontadas las comisiones y los impuestos que hayas pagado.</p>`],
    en: ['How is total gain computed?',
      `It compares today's net worth against <b>every peso you put in minus what you took out</b> (deposits and salary, less withdrawals). The difference is what you actually made or lost.
       <p><b>Gain = Net worth − Net contributed</b></p>
       <p>Adding money does <b>not</b> inflate this number: it raises both your net worth and your contributions.</p>
       <p>Commissions and taxes you have paid are already deducted.</p>`]
  },
  twr: {
    es: ['¿Qué es el rendimiento TWR?',
      `TWR (rendimiento ponderado por tiempo) mide <b>qué tan bien eligieron tus inversiones</b>, sin que lo distorsione el momento en que metiste o sacaste dinero.
       <p>Ejemplo: si metes $10,000 justo antes de una subida, tu ganancia en pesos se ve enorme, pero el TWR te dice cuánto rindió realmente la cartera. Es la medida que usan los fondos para compararse entre sí.</p>`],
    en: ['What is TWR?',
      `Time-weighted return measures <b>how well your investments did</b>, stripped of the effect of when you added or removed money.
       <p>If you deposit $10,000 right before a rally, your dollar gain looks huge — TWR tells you what the portfolio itself actually returned. It is the measure funds use to compare against each other.</p>`]
  },
  cash: {
    es: ['Efectivo',
      `Dinero disponible que <b>todavía no está invertido</b>. Es de donde sale el dinero cuando compras y a donde llega cuando vendes, cobras dividendos o te depositan el sueldo.
       <p>Puedes dejarle un rendimiento anual en Ajustes para simular una cuenta que paga intereses.</p>`],
    en: ['Cash',
      `Money that is <b>not invested yet</b>. Buys come out of it; sales, dividends and salary go into it.
       <p>You can give it an annual yield in Settings to simulate an interest-bearing account.</p>`]
  },
  invested: {
    es: ['Invertido',
      `El valor de mercado <b>hoy</b> de todas tus posiciones. No es lo que pagaste: es lo que valdrían si las vendieras ahora mismo.
       <p>Lo que pagaste se llama <b>costo</b>, y la diferencia entre ambos es tu plusvalía no realizada.</p>`],
    en: ['Invested',
      `The market value <b>today</b> of all your positions — not what you paid, but what they would fetch if sold right now.
       <p>What you paid is the <b>cost basis</b>; the difference is your unrealized gain.</p>`]
  },
  realized: {
    es: ['Ganancia realizada vs. no realizada',
      `<b>No realizada (plusvalía):</b> lo que has ganado en papel con lo que aún tienes. No paga impuesto porque no has vendido.
       <p><b>Realizada:</b> lo que ganaste al <b>vender</b>. Ésta sí entra al cálculo del ISR del ejercicio.</p>
       <p>Por eso una cartera puede ir ganando mucho y no deber nada de impuesto todavía.</p>`],
    en: ['Realized vs. unrealized gain',
      `<b>Unrealized:</b> paper gains on what you still hold. Not taxed, because you have not sold.
       <p><b>Realized:</b> what you made when you <b>sold</b>. This is what feeds the year's tax calculation.</p>
       <p>So a portfolio can be up a lot and still owe no tax yet.</p>`]
  },
  dividends: {
    es: ['Dividendos',
      `Un dividendo es el <b>reparto de utilidades</b> que algunas empresas y ETFs pagan a sus accionistas, normalmente cada trimestre. Llega como efectivo, sin que vendas nada.
       <p><b>Cómo se registran aquí:</b> el feed de dividendos de Finnhub es de plan de pago, así que se capturan a mano. Abre una posición → <i>Registrar dividendo</i> y pon el monto <b>bruto</b>. La app descuenta la retención de EE. UU. y abona el neto a tu efectivo.</p>
       <p>Esta sección te muestra cuánto has ganado <b>solo por dividendos</b>, separado de la ganancia por precio.</p>
       <p><b>Rendimiento sobre costo</b> = dividendos del año ÷ lo que pagaste por esas acciones. Es el "sueldo" anual que te paga tu cartera.</p>`],
    en: ['Dividends',
      `A dividend is a share of profits that some companies and ETFs pay their shareholders, usually quarterly. It arrives as cash without selling anything.
       <p><b>How they are recorded here:</b> Finnhub's dividend feed is a paid endpoint, so you enter them manually. Open a position → <i>Record dividend</i> and enter the <b>gross</b> amount. The app deducts the U.S. withholding and credits the net to your cash.</p>
       <p>This section shows what you earned <b>from dividends alone</b>, separate from price gains.</p>
       <p><b>Yield on cost</b> = dividends this year ÷ what you paid for those shares — the annual "salary" your portfolio pays you.</p>`]
  },
  holdings: {
    es: ['Resumen de tenencias',
      `Cuántos títulos tienes, de qué empresas o índices, y cuánto valen en total al precio de ahora.
       <p><b>Acción:</b> una parte de una empresa (Apple, Microsoft…). <b>ETF / fondo indexado:</b> una canasta que compra cientos de empresas de golpe — por ejemplo VOO replica el S&P 500, así que con un título tienes un pedacito de las 500 empresas más grandes de EE. UU.</p>
       <p>Los ETFs suelen ser la opción de largo plazo porque diversifican sin que tengas que elegir empresa por empresa.</p>`],
    en: ['Holdings summary',
      `How many shares you hold, of which companies or indexes, and what they are worth in total at the current price.
       <p><b>Stock:</b> a slice of one company (Apple, Microsoft…). <b>ETF / index fund:</b> a basket that buys hundreds of companies at once — VOO tracks the S&P 500, so one share gives you a sliver of the 500 largest U.S. companies.</p>
       <p>ETFs are the usual long-term choice because they diversify without you picking company by company.</p>`]
  },
  alloc: {
    es: ['Distribución',
      `Qué porcentaje de tu patrimonio está en cada instrumento y cuánto sigue en efectivo.
       <p>Sirve para detectar <b>concentración</b>: si una sola posición vale el 60% de tu cartera, tu resultado depende casi por completo de esa empresa. Diversificar es repartir ese peso.</p>`],
    en: ['Allocation',
      `What share of your net worth sits in each instrument, and how much is still cash.
       <p>Useful for spotting <b>concentration</b>: if one position is 60% of the portfolio, your outcome depends almost entirely on that company. Diversifying spreads that weight.</p>`]
  },
  realtime: {
    es: ['¿Qué tan "en vivo" son los precios?',
      `Mientras el mercado de EE. UU. está abierto (lunes a viernes, 9:30–16:00 hora de Nueva York), la app se conecta por WebSocket a Finnhub y los precios se actualizan <b>operación por operación</b>.
       <p>Fuera de horario, o si la conexión falla, se usa el último precio de cierre vía REST y el indicador de arriba cambia a <i>Mercado cerrado</i> o <i>Últ. precio</i>.</p>
       <p>El indicador nunca dice "En vivo" si no hay feed real.</p>`],
    en: ['How live are the prices?',
      `While the U.S. market is open (Mon–Fri, 9:30–16:00 New York time) the app connects to Finnhub over WebSocket and prices update <b>trade by trade</b>.
       <p>Outside hours, or if the connection fails, the last close is used via REST and the badge switches to <i>Market closed</i> or <i>Last price</i>.</p>
       <p>The badge never claims "Live" without a real feed.</p>`]
  },
  history: {
    es: ['¿Por qué la gráfica empieza vacía?',
      `El endpoint de precios históricos de Finnhub es de plan de pago, así que la app <b>construye su propio historial</b>: guarda una foto de tu patrimonio cada día que abres la app, más una curva intradía en vivo.
       <p>Eso significa que los primeros días la curva es corta y va creciendo con el tiempo. En unas semanas ya tienes una gráfica completa.</p>
       <p>Si quieres histórico de precios pasado, pon una API key gratuita de Alpha Vantage en Ajustes.</p>`],
    en: ['Why does the chart start empty?',
      `Finnhub's historical price endpoint is a paid plan, so the app <b>builds its own history</b>: it saves a snapshot of your net worth every day you open it, plus a live intraday curve.
       <p>The curve is short at first and grows over time — after a few weeks you have a full chart.</p>
       <p>For past price history, add a free Alpha Vantage API key in Settings.</p>`]
  },
  capgains: {
    es: ['ISR por ganancia de capital (bolsa)',
      `En México, la ganancia por vender acciones en <b>bolsas reconocidas</b> (la BMV, el SIC y los mercados de EE. UU.) paga una tasa <b>fija del 10%</b>, definitiva. No entra a la tarifa progresiva de tu sueldo.
       <p>Se calcula sobre la ganancia <b>anual neta</b>: las pérdidas del año se restan de las ganancias, y si al final quedas en pérdida, ésa se guarda y se amortiza contra las ganancias de los <b>10 años siguientes</b>.</p>
       <p>Se paga en la declaración anual, en abril del año siguiente.</p>
       <p><i>Fundamento: art. 129 de la Ley del ISR.</i></p>`],
    en: ['Capital gains tax (listed shares)',
      `In Mexico, gains from selling shares on <b>recognized exchanges</b> (BMV, SIC and U.S. markets) pay a <b>flat 10%</b>, as a final tax. It does not enter the progressive wage tariff.
       <p>It is computed on the <b>annual net</b> gain: the year's losses offset its gains, and a net loss carries forward against gains for the <b>next 10 years</b>.</p>
       <p>Paid in the annual return, in April of the following year.</p>
       <p><i>Basis: art. 129, Mexican Income Tax Law.</i></p>`]
  },
  divtax: {
    es: ['Impuesto sobre dividendos del extranjero',
      `Los dividendos de empresas de EE. UU. pagan impuesto <b>dos veces</b>, y la app modela ambas:
       <p><b>1. En EE. UU.:</b> te retienen 10% en la fuente, gracias al tratado con México (necesitas tener firmado el W-8BEN con tu broker; sin él la retención sube a 30%).</p>
       <p><b>2. En México:</b> el dividendo bruto se acumula a tus demás ingresos y paga la tarifa progresiva anual, <b>más un 10% adicional definitivo</b>. El impuesto que ya pagaste en EE. UU. se acredita, pero solo hasta el límite del ISR mexicano que corresponde a ese ingreso.</p>
       <p><i>Fundamento: arts. 142 fr. V y 152 de la Ley del ISR.</i></p>`],
    en: ['Tax on foreign dividends',
      `U.S. dividends are taxed <b>twice</b>, and the app models both:
       <p><b>1. In the U.S.:</b> 10% withheld at source under the treaty with Mexico (you need a signed W-8BEN with your broker; without it the rate is 30%).</p>
       <p><b>2. In Mexico:</b> the gross dividend is added to your other income under the annual progressive tariff, <b>plus an extra definitive 10%</b>. The U.S. tax is credited, but only up to the Mexican tax attributable to that income.</p>
       <p><i>Basis: arts. 142 fr. V and 152, Mexican Income Tax Law.</i></p>`]
  },
  annual: {
    es: ['Declaración anual',
      `Junta tus ingresos <b>acumulables</b> del ejercicio (sueldo bruto y dividendos brutos), les aplica la tarifa anual del art. 152 en pesos, y de ahí resta lo que ya te retuvieron.
       <p><b>A cargo:</b> te falta pagar. <b>A favor:</b> te retuvieron de más y puedes pedir devolución.</p>
       <p>El 10% de la bolsa y el 10% adicional de dividendos van aparte, porque son impuestos <b>definitivos</b>: no se mezclan con la tarifa progresiva.</p>
       <p>Como la app trabaja en dólares y las tarifas del SAT están en pesos, se convierte con el tipo de cambio de Ajustes.</p>`],
    en: ['Annual return',
      `It adds up your <b>accumulable</b> income for the year (gross wages and gross dividends), applies the art. 152 annual tariff in pesos, and subtracts what was already withheld.
       <p><b>Payable:</b> you still owe. <b>Refundable:</b> too much was withheld and you can claim it back.</p>
       <p>The 10% on shares and the extra 10% on dividends sit apart, because they are <b>final</b> taxes and do not mix with the progressive tariff.</p>
       <p>The app works in dollars and SAT tariffs are in pesos, so it converts with the rate in Settings.</p>`]
  },
  latent: {
    es: ['Impuesto latente',
      `Cuánto ISR pagarías <b>si vendieras todo hoy</b>, al 10% sobre tu plusvalía no realizada.
       <p>No lo debes: es un recordatorio de que una parte de tu ganancia en pantalla todavía tiene un impuesto pendiente del otro lado. Si nunca vendes, nunca lo pagas.</p>`],
    en: ['Latent tax',
      `The tax you would owe <b>if you sold everything today</b> — 10% of your unrealized gain.
       <p>You do not owe it: it is a reminder that part of the gain on screen still has a tax attached. If you never sell, you never pay it.</p>`]
  },
  salary: {
    es: ['Sueldo bruto vs. neto',
      `Si eliges <b>neto</b>, la app deposita exactamente lo que capturas: es lo que ya te cae a la cuenta.
       <p>Si eliges <b>bruto</b>, calcula lo que te descontarían en México y solo deposita el neto:</p>
       <p>• <b>ISR</b> con la tarifa mensual del art. 96, menos el subsidio al empleo si tu sueldo está por debajo del tope.<br>
          • <b>IMSS trabajador</b>: prestaciones en dinero, gastos médicos de pensionados, invalidez y vida, cesantía y vejez, y el excedente de 3 UMA.</p>
       <p>Solo el sueldo capturado en bruto entra a la declaración anual, porque es del que la app conoce la retención.</p>
       <p>Puedes capturar el monto en <b>pesos o dólares</b>: se convierte con el tipo de cambio de Ajustes.</p>`],
    en: ['Gross vs. net salary',
      `Choose <b>net</b> and the app deposits exactly what you type — what already lands in your account.
       <p>Choose <b>gross</b> and it computes Mexican payroll deductions, depositing only the net:</p>
       <p>• <b>Income tax</b> under the art. 96 monthly tariff, less the employment subsidy if you are below the cap.<br>
          • <b>Worker social security</b>: cash benefits, retiree medical, disability and life, severance and old age, and the excess over 3 UMA.</p>
       <p>Only gross-entered salary feeds the annual return, since that is where the app knows the withholding.</p>
       <p>You can enter the amount in <b>pesos or dollars</b>; it converts with the rate in Settings.</p>`]
  },
  recurring: {
    es: ['Ingresos recurrentes',
      `Programa tu sueldo (o cualquier aportación periódica) y la app lo deposita sola.
       <p><b>Lo importante:</b> no necesitas tener la app abierta. Si la cierras dos meses, al volver a abrirla se aplican <b>todos los depósitos atrasados</b> de golpe, con su fecha correcta, y el historial queda como si nunca te hubieras ido.</p>
       <p>Puedes poner una fecha de inicio en el pasado para rellenar meses anteriores.</p>
       <p>Para meter dinero de golpe una sola vez, usa <b>Depositar</b> en lugar de un recurrente.</p>`],
    en: ['Recurring income',
      `Schedule your salary (or any periodic contribution) and the app deposits it for you.
       <p><b>The point:</b> you do not need the app open. Close it for two months and every <b>missed deposit</b> is applied on reopen, dated correctly, as if you had never left.</p>
       <p>You can set a start date in the past to backfill earlier months.</p>
       <p>For a one-time lump sum, use <b>Deposit</b> instead of a recurring entry.</p>`]
  },
  commission: {
    es: ['Comisiones y método de costo',
      `<b>Comisión:</b> lo que cobra un broker por operar. Se suma al costo cuando compras y se resta de lo que recibes cuando vendes, así que también reduce tu ganancia gravable. Ponla en 0 si tu broker no cobra.
       <p><b>PEPS (primeras entradas, primeras salidas):</b> al vender, se consideran vendidos primero los títulos más antiguos. Es el método que se usa normalmente.</p>
       <p><b>Costo promedio:</b> se promedia el precio de todas tus compras. Cambia cuánta ganancia realizas en cada venta, y con eso cuánto impuesto pagas ese año.</p>`],
    en: ['Commissions and cost basis',
      `<b>Commission:</b> what a broker charges per trade. It is added to your cost on a buy and subtracted from proceeds on a sell, so it also lowers taxable gain. Set it to 0 if your broker charges nothing.
       <p><b>FIFO:</b> the oldest shares are treated as sold first. This is the usual method.</p>
       <p><b>Average cost:</b> averages the price of all your purchases. It changes how much gain each sale realizes, and therefore the tax you owe that year.</p>`]
  },
  fx: {
    es: ['Tipo de cambio USD/MXN',
      `La app opera en <b>dólares</b>, pero las tarifas del SAT están en <b>pesos</b>. El tipo de cambio se usa para convertir tu ingreso al aplicar el ISR y para capturar sueldos en pesos.
       <p>Se actualiza solo al abrir la app y cada 6 horas, desde un proveedor público gratuito. La cotización de referencia es <b>diaria</b> — igual que el tipo de cambio FIX de Banxico, que es el que aplica para efectos fiscales.</p>
       <p>Puedes apagar la actualización automática y fijar el valor a mano.</p>`],
    en: ['USD/MXN exchange rate',
      `The app trades in <b>dollars</b>, but SAT tariffs are in <b>pesos</b>. The rate converts your income when applying the tax, and lets you enter salaries in pesos.
       <p>It refreshes on open and every 6 hours from a free public provider. The quote is <b>daily</b> — the same cadence as Banxico's FIX rate, which is the one that applies for tax purposes.</p>
       <p>You can turn auto-refresh off and pin the value by hand.</p>`]
  },
  backup: {
    es: ['¿Dónde se guardan mis datos?',
      `Todo vive en el <b>almacenamiento de este navegador</b> (localStorage). No hay servidor ni cuenta: nadie más ve tu simulación.
       <p><b>Cuidado:</b> si borras los datos del sitio, usas modo incógnito o cambias de navegador o de dispositivo, la simulación se pierde.</p>
       <p>Por eso hay <b>Exportar respaldo</b>: te baja un archivo .json que puedes importar en cualquier otro navegador para continuar donde ibas. Hazlo de vez en cuando.</p>`],
    en: ['Where is my data stored?',
      `Everything lives in <b>this browser's storage</b> (localStorage). No server, no account: nobody else sees your simulation.
       <p><b>Careful:</b> clearing site data, using private mode, or switching browsers or devices loses it.</p>
       <p>That is what <b>Export backup</b> is for: it downloads a .json you can import into any other browser to pick up where you left off. Do it now and then.</p>`]
  },
  trade: {
    es: ['Cómo comprar y vender',
      `Busca por símbolo (VOO, AAPL) o por nombre. El filtro te deja ver solo <b>ETFs / indexados</b> o solo acciones.
       <p>Puedes comprar <b>por títulos</b> ("quiero 10 acciones") o <b>por monto</b> ("quiero meter $500 y que salgan las que salgan"). Con títulos fraccionarios activados puedes comprar 0.7 de una acción, como en muchos brokers modernos.</p>
       <p>Se opera al último precio conocido; no se simulan órdenes limitadas ni el spread de compra-venta.</p>`],
    en: ['How to buy and sell',
      `Search by symbol (VOO, AAPL) or by name. The filter narrows to <b>ETFs / index funds</b> or stocks only.
       <p>You can buy <b>by shares</b> ("I want 10") or <b>by amount</b> ("put in $500, whatever that buys"). With fractional shares on you can buy 0.7 of a share, like many modern brokers.</p>
       <p>Trades fill at the last known price; limit orders and the bid-ask spread are not simulated.</p>`]
  }
};

export function helpBtn(topic, style = ''){
  return `<button class="help-btn" data-help="${topic}" aria-label="?" title="?" style="${style}">?</button>`;
}

export function openHelp(topic){
  const e = TOPICS[topic];
  if (!e) return;
  const [title, body] = e[getLang()] || e.es;
  sheet({
    title,
    body: `<div class="help-body">${body}</div>
           <button class="btn sec" data-close style="margin-top:18px">${esc(t('act.close'))}</button>`,
    onMount(el, close){ el.querySelector('[data-close]').onclick = close; }
  });
}

/** One delegated listener for every data-help button in the app. */
export function installHelp(){
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-help]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    openHelp(b.dataset.help);
  }, true);
}

/** Every topic, for the help index in Settings. */
export function helpIndex(){
  const lang = getLang();
  return Object.keys(TOPICS).map(k => ({ key: k, title: (TOPICS[k][lang] || TOPICS[k].es)[0] }));
}
