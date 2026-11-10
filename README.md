# Mis Finanzas 💛

App web pensada para el celular para controlar tus gastos y tus tarjetas de crédito, y para armar un plan para salir de deudas. Todo se guarda en tu dispositivo (localStorage); no hay servidor ni cuentas.

## Secciones

- **Inicio**: cuánto te queda libre en el mes, lo que debes pagar (pagado / falta) con fechas, alertas y un **calendario** de pagos y gastos. Incluye gráficas de a dónde va tu ingreso, gastos por categoría, regla 50/30/20 y los últimos 6 meses.
- **Gastos**: tiene dos pestañas.
  - *Del día a día*: gastos con categoría y medio de pago. Si pagas con tarjeta eliges las cuotas y se crea la compra en esa tarjeta.
  - *Fijos mensuales*: arriendo, servicios, suscripciones, con día de pago y check de pagado.
- **Tarjetas**: tarjetas y créditos con su color, tipo tarjeta real. Cada tarjeta tiene sus **compras a cuotas** (cuota 3 de 12, saldo, cuota del mes) e intereses calculados con la tasa E.A. o M.V.
  - **Pagar** reparte el dinero como el banco: primero intereses del mes, luego las cuotas del mes, y el excedente abona a capital de la compra más antigua. Antes de confirmar muestra el reparto, y el último pago se puede deshacer.
- **Plan**: eliges cuánto pagar al mes y la estrategia (avalancha o bola de nieve). Muestra la fecha en que quedas libre de deudas, los intereses que te ahorras, la gráfica, cuánto pagar a cada deuda este mes y el calendario de liberación.
- **Ajustes**: ingreso, presupuesto, moneda; **subir y descargar Excel**; respaldo JSON.

## Excel

Botón **＋ → Subir Excel** (o en Tarjetas / Ajustes). Descarga la plantilla: la hoja **Tarjetas** tiene una fila por tarjeta (interés, cupo, día de pago) y la hoja **Compras** una fila por compra, unida a su tarjeta por el nombre. Lo que debes en cada tarjeta es la suma de sus compras. También reconoce archivos propios con columnas como *Nombre/Tarjeta, Fecha, Monto/Valor, Cuotas, Cuotas pagadas, Saldo, Interés, Pago, Cupo, Día de pago*. Antes de guardar muestra una vista previa.

## Despliegue (Netlify)

`netlify.toml` ya define Node 20, `npm install && npm run build` y la carpeta `dist`. Cada push a `main` se publica solo.

## Desarrollo

```bash
npm install
npm run dev
```
