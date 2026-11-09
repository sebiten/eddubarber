# Entrega — Eddu Barber

## Estado

Aplicación implementada en Next.js y TypeScript, con diseño mobile first blanco y negro y acentos rojo/azul. Incluye una demo local operativa y la integración de servidor con Supabase preparada.

**Base remota preparada:** proyecto `wvnnlchhwimhjlbaobom`, esquema aplicado mediante `create_barber_booking_app`. URL y clave publicable configuradas localmente. Pendiente: clave secreta del servidor y elección/creación de la cuenta del barbero. Todavía no está habilitado el flujo completo de producción ni se publicó la aplicación.

## Cómo se usa

1. El cliente entra a `/`, elige servicio, fecha y horario, e ingresa nombre y WhatsApp. No necesita registrarse.
2. Recibe una confirmación y un enlace privado para consultar o cancelar. Puede descargar el evento para su calendario.
3. El barbero entra a `/panel`: ve la agenda por día y semana, busca clientes, crea turnos y cambia su estado.
4. Desde Servicios configura precio, duración y visibilidad. Desde Configuración define sus datos, días y horarios de trabajo.
5. Para no atender un lunes, abre Días bloqueados, elige el lunes y escribe un aviso. No se ofrecen horarios para esa fecha y el cliente ve el mensaje.
6. Puede conservar los turnos que ya estaban reservados o cancelar todos los pendientes de ese día al bloquearlo. Habilitar el día nuevamente no restaura turnos cancelados.

## Qué incluye

- Agenda diaria/semanal, búsqueda, indicadores del día e ingresos estimados.
- Estados confirmado, completado, cancelado y no asistió.
- Reservas de 30, 60, 90 o 120 minutos, según servicio.
- Horarios en Argentina y reservas hasta 60 días hacia adelante.
- Protección contra turnos superpuestos mediante restricciones de Postgres.
- Bloqueo de días y cancelación de sus reservas en una sola transacción.
- Autenticación del barbero con Supabase Auth y autorización por UUID en servidor.
- Tablas con RLS y sin lectura directa pública de datos de clientes.
- Enlace a WhatsApp para contactar al cliente y link público para compartir la agenda.
- Confirmación de cancelación, estados vacíos, avisos de errores y navegación móvil.

## Alcance

Pensada para una barbería con un solo barbero y un horario continuo por día. Se paga en el local. No incluye pagos online, envío automático de WhatsApp/email, recordatorios, registro de cobros ni múltiples profesionales.

La demo guarda datos únicamente en el navegador. No simula una base compartida ni necesita contraseña; el panel real sí requiere la cuenta autorizada de Supabase.

## Verificación realizada

- TypeScript sin errores.
- Compilación de producción exitosa.
- 9 pruebas automatizadas aprobadas, incluyendo una prueba de integración SQL con Postgres local mediante PGlite: creación del esquema, reserva, rechazo de superposición, rechazo de token incorrecto, cancelación, bloqueo, restauración y permisos.
- Flujo manual en Edge: reserva ficticia desde vista móvil de 390 px, aparición en panel, bloqueo del lunes con aviso público y cancelación desde el enlace privado.
- Inspección visual de panel en móvil y escritorio de 1440 px.
- Sin errores de consola en el flujo final de cancelación.
- Operaciones verificadas directamente en Supabase remoto: reserva, rechazo de superposición, cancelación y bloqueo. La transacción de prueba se revirtió para no conservar datos ficticios.
- Verificado que `anon` y `authenticated` no pueden leer las reservas ni ejecutar directamente sus funciones; `service_role` sí tiene el acceso que requiere el servidor.
- El asesor de seguridad solo señaló RLS sin políticas, de nivel informativo: es deliberado, ya que las tablas solo son accesibles desde el servidor. [Referencia de Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Pendiente verificar login y flujo HTTP completo con las credenciales del servidor y la cuenta elegida.

## Archivos de referencia

- `README.md`: instalación, conexión y funcionamiento detallado.
- `.env.example`: variables necesarias, sin credenciales.
- `supabase/schema.sql`: esquema y funciones transaccionales.
- `tests/`: pruebas de dominio, validación y base de datos.

Para ejecutar: `npm install` y `npm run dev`. Reservas en `http://localhost:3000`; panel en `http://localhost:3000/panel`.
