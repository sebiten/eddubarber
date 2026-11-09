# Eddu Barber

App mobile first para una barbería con un barbero. Next.js App Router, TypeScript, Supabase Auth y Postgres. Diseño blanco y negro, con rojo y azul clásicos de barbería.

## Ejecutar

```sh
npm install
npm run dev
```

- Reservas: http://localhost:3000
- Panel: http://localhost:3000/panel
- Demo con datos ficticios: http://localhost:3000/demo
- Panel de demostración: http://localhost:3000/demo/panel
- Turno individual: enlace privado generado al reservar.

La demo explícita funciona aunque Supabase esté configurado: utiliza un almacenamiento separado y nunca envía reservas, bloqueos ni cambios a la base real. Incluye turnos de ejemplo y el próximo lunes bloqueado. «Reiniciar demo» restaura los ejemplos. El logo recortado, sin hojas y con transparencia, está en `public/brand/eddu-logo.png`.

Sin variables de Supabase funciona una **demo local**, indicada en todas las pantallas. Guarda los datos en el navegador y permite recorrer los flujos. No sirve para recibir reservas reales entre dispositivos. No ingresar datos personales reales en la demo. Para reiniciarla, eliminar la clave `eddu-barber-demo-v1` del almacenamiento local del sitio.

## Conectar Supabase

Proyecto actual: `wvnnlchhwimhjlbaobom`. El esquema ya está aplicado en la base remota y las operaciones de reserva, superposición, cancelación y bloqueo se verificaron dentro de una transacción revertida. La URL y clave publicable están configuradas en `.env.local`.

Pendiente para activar la app: guardar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y elegir/crear el usuario del barbero. El acceso MCP no reemplaza la clave que necesita el servidor Next.js.

1. Abrir el proyecto `wvnnlchhwimhjlbaobom` en Supabase.
2. El esquema `supabase/schema.sql` ya se aplicó como `create_barber_booking_app`. No volver a ejecutarlo en este proyecto. Para otra base vacía, ejecutar el archivo una sola vez.
3. En Authentication → Users, crear el usuario del barbero con email y contraseña, confirmado. No hay registro público en esta aplicación. Copiar su UUID.
4. Completar las variables faltantes en `.env.local` sin sobrescribir las existentes:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publicable o clave `anon` heredada.
   - `SUPABASE_SERVICE_ROLE_KEY`: clave secreta de servidor. Nunca ponerle el prefijo `NEXT_PUBLIC_`.
   - `BARBER_USER_ID`: UUID del usuario autorizado.
5. Reiniciar Next.js. La demo se desactiva al configurar las dos variables públicas. Sus datos no se transfieren a Supabase.
6. Entrar a `/panel` con la cuenta creada y definir nombre, dirección, teléfono, servicios, precios y horarios.

Si se pierde la contraseña, restablecer el acceso desde el administrador de Supabase. El panel no permite crear otras cuentas ni barberos.

## Funcionamiento

### Reservar

El cliente elige un servicio, una fecha y un horario; deja nombre y WhatsApp con código de país. No necesita una cuenta. La confirmación incluye un enlace privado para consultar, descargar el evento de calendario o cancelar antes del inicio. Debe guardar ese enlace: no se envían emails ni WhatsApp automáticamente.

Los horarios se calculan en la zona de Argentina, en intervalos de 30 minutos, hasta 60 días adelante. Se respeta la duración completa del servicio, los días de atención y la hora de cierre. El cliente paga en la barbería.

### Panel del barbero

- Agenda por día, navegación semanal y búsqueda por nombre/teléfono.
- Resumen de turnos activos, ingresos estimados y completados. Los ingresos son una estimación, no cobros registrados.
- Alta manual de turnos con las mismas reglas de disponibilidad.
- Estados: confirmado, completado, cancelado y no asistió.
- Acceso a WhatsApp del cliente. Abre la conversación; el barbero decide qué enviar.
- Link público para compartir y reservas actualizadas cada 20 segundos con Supabase.
- Edición/alta de servicios, precio, duración y visibilidad. Los turnos conservan el precio, nombre y duración originales.
- Configuración de días y horario continuo de atención. No incluye pausas entre franjas horarias.

### Bloquear días

En «Días bloqueados» o desde la agenda, elegir fecha y escribir un aviso (por ejemplo: «El lunes no atendemos por enfermedad»). Ese día deja de ofrecer horarios y la página muestra el aviso.

Los turnos ya existentes se mantienen por defecto. La casilla de cancelación cancela los pendientes de ese día en la misma transacción que el bloqueo. Hay que contactar a esos clientes usando el acceso a WhatsApp de la agenda. Al habilitar un día se permiten nuevas reservas; no se restauran automáticamente los cancelados.

## Protección de datos y reservas

- Supabase Auth verifica cada petición administrativa contra `BARBER_USER_ID`.
- RLS activa y acceso directo revocado para `anon`/`authenticated` en todas las tablas. Next.js usa la clave secreta solo en servidor.
- La consulta pública devuelve únicamente ocupación, servicios, horarios y avisos; nunca nombres, teléfonos, IDs o tokens de reservas.
- Un token UUID aleatorio permite gestionar una reserva sin cuenta. Las páginas privadas de turno no se indexan y no envían el enlace como referente.
- Validación de entradas en API y restricciones SQL. El servidor calcula precio y duración; no acepta estos valores del cliente.
- Exclusión de rangos en Postgres impide superposiciones incluso ante solicitudes simultáneas.
- Bloqueos y reservas toman el mismo bloqueo transaccional por día; el orden de llegada no puede producir una nueva reserva después de bloquear.
- Máximo de tres reservas futuras confirmadas por teléfono en Supabase. Campo trampa básico contra bots. No equivale a verificación por SMS ni CAPTCHA.
- No se incluyen pagos en línea, recordatorios automáticos ni múltiples profesionales.

## Publicar

Desplegar como aplicación Node.js/Next.js (por ejemplo en Vercel), con las cuatro variables de entorno configuradas. Comandos: `npm run build` y `npm start`. No exportar como sitio estático: las rutas `/api/*` requieren servidor. Compartir la URL pública solamente después de comprobar una reserva real, ingreso al panel, bloqueo y cancelación.

## Verificación

```sh
npm run test
npm run typecheck
npm run build
```

Los 9 tests cubren cálculo de horarios, superposición, duración, cancelación, días cerrados, fechas y validación de entradas. Incluyen una prueba de integración del esquema SQL en Postgres local (PGlite), con reserva, bloqueo, cancelación y permisos. La aplicación no sustituye la verificación final con el proyecto Supabase activo. Ver `REPORTE.md` para el resumen de entrega y las verificaciones del navegador.

Referencias técnicas consultadas: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Supabase Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
