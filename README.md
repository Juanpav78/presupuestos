# Mis Finanzas 💸

App web (pensada para el celular) para controlar tus gastos, tus tarjetas de crédito y armar un plan para salir de deudas. Todo se guarda en tu dispositivo (localStorage); no hay servidor ni cuentas.

## Qué hace

- **Inicio**: cuánto te queda libre en el mes, lo que tienes que pagar (y lo que falta), alertas, a dónde va tu ingreso, gastos por categoría, regla 50/30/20 y tendencia de 6 meses.
- **Gastos**: gastos del día a día por mes, por categoría y medio de pago (efectivo o tarjeta — si es tarjeta se suma a su saldo), presupuesto variable e ingresos extra.
- **Fijos**: gastos que se repiten cada mes (arriendo, servicios, suscripciones) con día de pago y check de "pagado".
- **Deudas**: tarjetas y préstamos con saldo, cupo, tasa (E.A. o M.V.), interés del mes, pago mínimo, cuánto tardas pagando solo el mínimo y cuánto pagarías en intereses. Registro de abonos.
- **Plan**: eliges cuánto pagar a deudas al mes y la estrategia (avalancha o bola de nieve). Te dice la fecha en que quedas libre, intereses totales, ahorro frente a pagar solo mínimos, gráfica del saldo, cuánto pagar a cada deuda este mes y el calendario de liberación.
- **Ajustes**: ingreso, presupuesto, moneda (COP, USD, MXN, EUR), respaldo/restauración en JSON.

Los datos de la versión anterior (gastos y presupuesto) se migran automáticamente.

## Usarla en el celular

Se publica en **Netlify** con cada push a `main`. Toda la configuración está en `netlify.toml` (Node 20, `npm run build`, carpeta `dist`), así que no hace falta tocar nada en el panel de Netlify. Abre la URL de Netlify en el celular y usa "Agregar a pantalla de inicio".

## Desarrollo

```bash
npm install
npm run dev
```
