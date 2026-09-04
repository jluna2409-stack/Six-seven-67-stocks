# Bolsa Sim — Simulador de inversión en bolsa (MX) · Stock investing simulator

Simulador de inversión **a largo plazo** con precios reales de EE. UU. en tiempo real,
régimen fiscal mexicano, sueldo recurrente, retiros de emergencia y seguimiento que
sobrevive semanas o meses. Bilingüe (ES/EN), opera en dólares, sin servidor y sin
proceso de build.

*Long-term investing simulator with real-time US prices, the Mexican tax regime,
recurring salary, emergency withdrawals and history that survives weeks or months.
Bilingual (ES/EN), USD, no server, no build step.*

---

## Cómo ejecutarla / How to run

Es una app estática de módulos ES: necesita servirse por HTTP (no `file://`).

```bash
python3 -m http.server 8080     # o: npx serve .
# abre http://localhost:8080
```

También funciona tal cual en GitHub Pages, Netlify, Vercel o cualquier hosting estático.

## Qué hace

| | |
|---|---|
| **Tiempo real** | WebSocket de Finnhub (`wss://ws.finnhub.io`) para trades en vivo; REST `/quote` como respaldo y fuera de horario. |
| **Catálogo** | 28,224 instrumentos de EE. UU. — 18,410 acciones y **6,471 ETFs / fondos indexados** (VOO, SPY, QQQ, VTI, SCHD…). Búsqueda por símbolo o nombre, con filtro Acciones / ETFs. |
| **Patrimonio** | Net worth, efectivo, invertido, ganancia total (vs. aportado neto), plusvalía no realizada, ganancia realizada, rendimiento TWR. |
| **Gráficas** | Curva de patrimonio con área degradada, línea base y *scrubber* táctil (HOY / 1S / 1M / 3M / 6M / 1A / TODO), dona de distribución y barras de P/G por posición. |
| **Efectivo** | Depósitos y retiros manuales, retiro marcado como "de emergencia", y **ingresos recurrentes** (semanal, catorcenal, quincenal, mensual). Si capturas el sueldo **bruto** se calcula ISR mensual + IMSS y solo se deposita el neto. Puedes capturar el monto en **MXN o USD**. |
| **Dividendos** | Sección propia que aísla **cuánto has ganado solo con dividendos**: neto en tu bolsillo, retención de EE. UU., rendimiento sobre costo, promedio mensual, ritmo anual y desglose por posición (este año o histórico). |
| **Resumen de tenencias** | Cuántos títulos tienes, de qué empresas o índices son, y cuánto valen en total — con el desglose entre acciones y ETFs. |
| **Ayuda contextual** | Un botón **?** junto a cada concepto abre una explicación en lenguaje llano (qué es el TWR, por qué la plusvalía no paga impuesto, bruto vs. neto, PEPS vs. costo promedio…). Ajustes trae el índice completo con los 21 temas. |
| **Impuestos (México)** | Ganancia de capital, dividendos del extranjero y declaración anual — detalle abajo. |
| **Persistencia** | Todo vive en `localStorage`. Cierras, vuelves en tres meses y la simulación continúa: los depósitos programados atrasados se aplican solos al abrir. Respaldo exportable/importable en `.json` y exportación del historial a CSV. |

## Modelo fiscal implementado

| Concepto | Tratamiento | Fundamento |
|---|---|---|
| Ganancia por venta de acciones en bolsas reconocidas (incluye el SIC / mercados de EE. UU.) | **10% definitivo** sobre la ganancia **anual neta**. Las pérdidas netas se amortizan contra ganancias de los 10 años siguientes (encadenado año por año). | LISR art. 129 |
| Dividendos de sociedades del extranjero | Retención de EE. UU. del **10%** (tratado, W-8BEN) + en México: acumulables a la tarifa anual **y 10% adicional definitivo**. El impuesto pagado en EE. UU. se acredita hasta el límite del ISR mexicano atribuible a ese ingreso. | LISR art. 142 fr. V y 152 |
| Sueldos | Retención con la **tarifa mensual** + subsidio al empleo (13.9% de la UMA mensual hasta el tope), y cuotas obrero IMSS (prestaciones en dinero, gastos médicos de pensionados, invalidez y vida, cesantía y vejez, y el excedente de 3 UMA). Reconciliación anual con la tarifa del art. 152. | LISR art. 96 y 152; LSS |
| Plusvalía no realizada | No paga impuesto hasta la venta. La app muestra el **impuesto latente** si vendieras todo hoy. | — |

El tipo de cambio se actualiza solo; las tarifas cargadas por omisión son las de **2025** y son **editables** desde
Ajustes → Impuestos → *Tarifas y parámetros (JSON)*, junto con la UMA, el tipo de
cambio USD/MXN y las tasas. **Verifica el Anexo 8 de la RMF del ejercicio en curso
antes de tomar decisiones**: el SAT las actualiza y las de este repositorio pueden
quedar desfasadas.

> Cálculo educativo y aproximado. **No es asesoría fiscal.** Las tarifas por periodo
> semanal/catorcenal/quincenal se aproximan anualizando a un equivalente mensual;
> no se modelan aguinaldo, PTU, deducciones personales ni el régimen de intereses
> reales.

## Límites de la API y cómo se resolvieron

La API key de Finnhub incluida es de **plan gratuito**. Al probar los endpoints:

| Endpoint | Estado | Solución aplicada |
|---|---|---|
| `/quote` | ✅ 200 | Precios en vivo y de cierre. |
| `wss://ws.finnhub.io` | ✅ trades en vivo | Feed en tiempo real de las posiciones. |
| `/stock/symbol?exchange=US` | ✅ 200 | Catálogo completo, incluido en `data/catalog.json` y actualizable desde Ajustes. |
| `/stock/profile2` | ✅ 200 | Metadatos del emisor. |
| `/stock/candle` (histórico) | ❌ **403 — de pago** | La app **construye su propio historial**: guarda una foto del patrimonio cada día que la abres, más una curva intradía en vivo. Opcionalmente puedes pegar una API key **gratuita de Alpha Vantage** en Ajustes para descargar el histórico de precios pasado. |
| `/stock/dividend` | ❌ **403 — de pago** | Los dividendos se **capturan a mano** (desde el detalle de la posición o desde la sección Dividendos); la app aplica la retención de EE. UU., los abona al efectivo y los suma a la declaración anual. |
| `/forex/rates` | ❌ **403 — de pago** | El tipo de cambio USD/MXN se toma de proveedores públicos gratuitos con CORS abierto (`open.er-api.com`, con `currency-api` de respaldo). Se actualiza al abrir la app y cada 6 horas. La cotización es **diaria**, igual que el tipo de cambio FIX de Banxico —que es el que aplica para efectos fiscales—, así que no existe un "tick a tick" que tenga sentido fiscal aquí. Se puede apagar y fijar a mano. |

> La key vive en el cliente, así que cualquiera que abra la página puede leerla:
> es inevitable en una app sin servidor. Si la publicas, usa una key desechable o
> pon un pequeño proxy delante.

## Estructura

```
index.html
data/catalog.json      28,224 instrumentos de EE. UU. (acciones + ETFs)
styles/app.css         tokens de diseño, tema claro/oscuro
src/
  main.js              arranque, ruteo, tareas periódicas
  store.js             estado + persistencia + export/import
  engine.js            posiciones, lotes, compra/venta (PEPS o promedio), TWR
  tax.js               motor fiscal mexicano (tarifas, IMSS, declaración anual)
  taxreport.js         agregación por ejercicio y amortización de pérdidas
  scheduler.js         ingresos recurrentes y recuperación de periodos atrasados
  market.js            Finnhub REST + WebSocket, catálogo, historial
  fx.js                tipo de cambio USD/MXN en vivo (proveedores gratuitos)
  help.js              ayuda contextual bilingüe (21 temas)
  charts.js            SVG: línea con scrubber, dona, barras
  i18n.js  format.js  ui.js
  views/               dashboard, portfolio, trade, cash, taxes, history, settings
```

## Ideas pendientes

- Backfill automático del histórico de precios (requiere plan de pago o key de Alpha Vantage).
- Aportaciones automáticas programadas a un ETF (DCA), no solo al efectivo.
- Régimen de intereses reales para el rendimiento del efectivo.
- Dividendos automáticos por calendario en vez de captura manual (endpoint de pago).
