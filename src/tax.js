/**
 * Mexican tax engine (educational approximation).
 *
 *  - Capital gains on shares traded on recognised exchanges (BMV / SIC / US markets):
 *    flat 10% definitive tax on the ANNUAL NET gain — LISR art. 129.
 *    Net losses carry forward up to 10 years against future gains of the same kind.
 *  - Foreign (US) dividends: 10% US withholding under the treaty (W-8BEN);
 *    in Mexico they are added to the annual progressive tariff (art. 152) and are
 *    additionally subject to a definitive 10% (art. 142 fr. V). The US tax is credited
 *    up to the Mexican tax attributable to that income.
 *  - Wages: monthly withholding tariff (art. 96) + employment subsidy, and worker
 *    IMSS contributions. Annual reconciliation with the art. 152 tariff.
 *
 * All statutory tariffs are expressed in MXN and are USER-EDITABLE in Settings,
 * because they are updated by SAT (Annex 8 of the RMF) every year.
 */

export const DEFAULT_TABLES = {
  year: 2025,
  uma: { daily: 113.14, monthly: 3439.46 },

  // Art. 96 — monthly withholding tariff (MXN)
  isrMonthly: [
    [0.01,       746.04,     0.00,      1.92],
    [746.05,     6332.05,    14.32,     6.40],
    [6332.06,    11128.01,   371.83,   10.88],
    [11128.02,   12935.82,   893.63,   16.00],
    [12935.83,   15487.71,  1182.88,   17.92],
    [15487.72,   31236.49,  1640.18,   21.36],
    [31236.50,   49233.00,  5004.12,   23.52],
    [49233.01,   93993.90,  9236.89,   30.00],
    [93993.91,  125325.20, 22665.17,   32.00],
    [125325.21, 375975.61, 32691.18,   34.00],
    [375975.62,   1e18,     117912.32,  35.00]
  ],

  // Art. 152 — annual tariff (MXN)
  isrAnnual: [
    [0.01,          8952.49,       0.00,     1.92],
    [8952.50,      75984.55,     171.88,     6.40],
    [75984.56,    133536.07,    4461.94,    10.88],
    [133536.08,   155229.80,   10723.55,    16.00],
    [155229.81,   185852.57,   14194.54,    17.92],
    [185852.58,   374837.88,   19682.13,    21.36],
    [374837.89,   590795.99,   60049.40,    23.52],
    [590796.00,  1127926.84,  110842.74,    30.00],
    [1127926.85, 1503902.46,  271981.99,    32.00],
    [1503902.47, 4511707.37,  392294.17,    34.00],
    [4511707.38,    1e18,     1414947.85,   35.00]
  ],

  // Employment subsidy (Decree 01-May-2024): 13.9% of the monthly UMA
  // for workers earning up to the cap. Both values editable.
  subsidy: { pctOfUma: 13.9, incomeCapMonthly: 10171.00 },

  // Worker IMSS quotas, as % of the daily contribution base salary (SBC)
  imss: {
    excedente3Uma: 0.40,   // sickness & maternity, in-kind, on the part above 3 UMA
    dinero: 0.25,
    pensionados: 0.375,
    invalidezVida: 0.625,
    cesantiaVejez: 1.125,
    sbcCapUma: 25          // SBC capped at 25 UMA
  }
};

export const PERIODS_PER_YEAR = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

/** Apply an [lowerLimit, upperLimit, fixedFee, %overExcess] tariff to a MXN base. */
export function applyTariff(base, table){
  if (!(base > 0)) return 0;
  for (const [lo, hi, fee, rate] of table){
    if (base >= lo && base <= hi) return fee + (base - lo) * (rate / 100);
  }
  const last = table[table.length - 1];
  return last[2] + (base - last[0]) * (last[3] / 100);
}

/** Marginal rate (%) that applies to a MXN base under a tariff. */
export function marginalRate(base, table){
  for (const [lo, hi, , rate] of table) if (base >= lo && base <= hi) return rate;
  return table[table.length - 1][3];
}

/**
 * Gross -> net for one pay period, Mexican rules.
 * The statutory tariff is monthly, so a non-monthly period is annualised to a
 * monthly equivalent, taxed, and prorated back (standard practical approximation).
 * @param {number} grossUsd  gross pay for ONE period, in USD
 * @param {string} freq      weekly | biweekly | semimonthly | monthly
 * @param {number} fx        USD/MXN
 * @param {object} T         tables
 */
export function salaryNet(grossUsd, freq, fx, T = DEFAULT_TABLES){
  const per = PERIODS_PER_YEAR[freq] ?? 12;
  const grossMxn = grossUsd * fx;
  const monthlyMxn = grossMxn * per / 12;

  const isrMonthly = applyTariff(monthlyMxn, T.isrMonthly);
  const subsidyMonthly = monthlyMxn <= T.subsidy.incomeCapMonthly
    ? T.uma.monthly * (T.subsidy.pctOfUma / 100) : 0;
  const isrNetMonthly = Math.max(0, isrMonthly - subsidyMonthly);
  const subsidyPaid = Math.max(0, Math.min(subsidyMonthly, isrMonthly)); // capped: no cash refund modelled

  // IMSS: daily contribution base salary (SBC), capped at 25 UMA
  const sbcDaily = Math.min(monthlyMxn / 30.4, T.imss.sbcCapUma * T.uma.daily);
  const q = T.imss;
  const excedente = Math.max(0, sbcDaily - 3 * T.uma.daily) * (q.excedente3Uma / 100);
  const imssDaily = excedente
    + sbcDaily * (q.dinero + q.pensionados + q.invalidezVida + q.cesantiaVejez) / 100;
  const imssMonthly = imssDaily * 30.4;

  const toPeriodUsd = m => (m * 12 / per) / fx;
  const isr = toPeriodUsd(isrNetMonthly);
  const imss = toPeriodUsd(imssMonthly);
  const subsidy = toPeriodUsd(subsidyPaid);
  const net = Math.max(0, grossUsd - isr - imss);

  return { gross: grossUsd, net, isr, imss, subsidy, monthlyMxn, effRate: grossUsd > 0 ? (isr + imss) / grossUsd * 100 : 0 };
}

/**
 * Full annual reconciliation for one calendar year.
 * @param {object} y  { salaryGross, salaryIsrWithheld, divGross, divUsWithheld,
 *                      capGain, capLoss, carryIn, interest }  — all in USD
 * @param {object} cfg { fx, capRate, divExtraRate, tables }
 */
export function annualSummary(y, cfg){
  const T = cfg.tables || DEFAULT_TABLES;
  const fx = cfg.fx || 18;

  // --- 1. Capital gains: separate, definitive 10% (art. 129) ---
  const netGainBefore = y.capGain - y.capLoss;
  const carryUsed = netGainBefore > 0 ? Math.min(y.carryIn, netGainBefore) : 0;
  const capTaxable = Math.max(0, netGainBefore - carryUsed);
  const capTax = capTaxable * (cfg.capRate / 100);
  const carryOut = Math.max(0, y.carryIn - carryUsed) + Math.max(0, -netGainBefore);

  // --- 2. Accumulable income: wages + gross foreign dividends + interest ---
  const accumUsd = y.salaryGross + y.divGross + (y.interest || 0);
  const accumMxn = accumUsd * fx;
  const isrAnnualMxn = applyTariff(accumMxn, T.isrAnnual);
  const isrAnnual = isrAnnualMxn / fx;

  // Foreign tax credit, limited to the Mexican tax attributable to the dividends
  const divShare = accumUsd > 0 ? y.divGross / accumUsd : 0;
  const creditLimit = isrAnnual * divShare;
  const foreignCredit = Math.min(y.divUsWithheld, creditLimit);

  // --- 3. Extra definitive 10% on foreign dividends (art. 142 fr. V) ---
  const divExtraTax = y.divGross * (cfg.divExtraRate / 100);

  const credits = y.salaryIsrWithheld + foreignCredit;
  const annualBalance = isrAnnual - credits;              // >0 payable, <0 refundable
  const totalDue = Math.max(0, annualBalance) + divExtraTax + capTax;
  const totalTaxBorne = isrAnnual + divExtraTax + capTax + y.divUsWithheld - foreignCredit;
  const totalIncome = accumUsd + Math.max(0, netGainBefore);

  return {
    capGain: y.capGain, capLoss: y.capLoss, netGainBefore, carryIn: y.carryIn, carryUsed,
    capTaxable, capTax, carryOut,
    accumUsd, accumMxn, isrAnnual, marginal: marginalRate(accumMxn, T.isrAnnual),
    divGross: y.divGross, divUsWithheld: y.divUsWithheld, foreignCredit, creditLimit, divExtraTax,
    salaryGross: y.salaryGross, salaryIsrWithheld: y.salaryIsrWithheld,
    credits, annualBalance, totalDue,
    effectiveRate: totalIncome > 0 ? totalTaxBorne / totalIncome * 100 : 0
  };
}
