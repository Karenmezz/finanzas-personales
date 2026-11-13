# Finanzas personales

Aplicación financiera para administrar campañas, pagos, cuentas, gastos y fechas de contenido. Está construida con Next.js, TypeScript, Tailwind CSS, Drizzle ORM y Turso/libSQL.

## Preparar el entorno local

1. Instala las dependencias:

```bash
npm install
```

2. Crea `.env.local` en la raíz del proyecto:

```env
TURSO_DATABASE_URL=libsql://tu-base-de-datos.turso.io
TURSO_AUTH_TOKEN=tu-token-privado
```

3. Aplica las migraciones:

```bash
npm run db:migrate
```

4. Inicia la aplicación:

```bash
npm run dev
```

5. Abre [http://localhost:3000](http://localhost:3000).

La aplicación sincroniza Turso automáticamente y conserva una copia temporal en `localStorage` como respaldo.

## Configurar el administrador

Genera un secreto de sesión:

```bash
npm run auth:secret
```

Agrega a `.env.local` el resultado y una contraseña larga que solamente conozcas tú:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu-contraseña-larga-y-única
SESSION_SECRET=el-resultado-del-comando
```

No compartas estos valores ni los configures con el prefijo `NEXT_PUBLIC_`.

## Comandos de base de datos

```bash
npm run db:generate    # Genera una migración después de cambiar el esquema
npm run db:migrate     # Aplica las migraciones pendientes
npm run db:studio      # Abre el explorador visual de Drizzle
npm run db:import-json # Importa el JSON privado local sin duplicar registros
```

`src/lib/imported-data.json`, `.env.local` y los archivos SQLite locales están ignorados por Git.

## Publicación

En producción configura las mismas variables privadas. Todas las páginas y la ruta financiera requieren una sesión administrativa válida.

## Organización mensual

- El aviso de cobros de otros meses incluye únicamente meses anteriores al seleccionado.
- Las campañas, cuentas y gastos pagados se ocultan al entrar; usa **Mostrar pagados** para consultarlos. En Finanzas vuelven a ocultarse al cambiar de mes o año.
- **Marcas que más pagan** muestra el ranking del año en Dashboard, ordenado por pagos recibidos, con valor acordado y promedio por campaña. Agrupa variantes de mayúsculas, tildes y espacios y excluye los ingresos personales.

Para comprobar la lógica de recurrencias, ranking y cobros anteriores (Node.js 24):

```bash
node tests/finance-insights.test.mjs
npm run lint
npx next typegen && npx tsc --noEmit
```

## Secciones

- **Contenidos** (`/contenidos`): campañas, pagos de marcas, cobros de meses anteriores, calendario, canjes y pendientes personales. Las marcas se consultan en la sección existente de Dashboard, con selector e historial del año elegido y finalizadas ocultas por defecto.
- **Dashboard**: indicadores compactos, con fondos de color sutiles e iconos, con una barra de categorías deslizable: General, Finanzas, Contenidos, Canjes, Marcas y Movimientos. General reúne salario, marcas, cuentas y gastos extras; las otras categorías muestran sus propios indicadores y detalles, manteniendo el año seleccionado. El balance usa dinero recibido menos gastos pagados.
- **Movimientos**: selector de sección para consultar el historial de cada área por separado.

## Campañas en dólares

Al crear o editar una campaña, selecciona COP o USD y escribe el importe en esa moneda. Las campañas en COP conservan sus importes y pagos existentes.

- La conversión usa la TRM oficial publicada por la Superintendencia Financiera de Colombia en [Datos Abiertos](https://www.datos.gov.co/resource/32sa-8pi3.json), con su fecha y período de vigencia. La TRM es una referencia oficial diaria; la tasa aplicada por un banco o plataforma puede ser diferente.
- Los dólares pendientes se valoran con la TRM vigente. La actualización automática ocurre una vez al día desde las **4:00 a. m. de Colombia**. Si la aplicación está cerrada o suspendida a esa hora, se consulta al abrirla o volver a ella después de las 4:00. Antes de esa hora se conserva la valoración anterior. Abrir o cambiar de pestaña no repite la actualización del mismo día; si la fuente falla, se conserva la última valoración y se muestra el estado, sin botones para actualizar o consultar la TRM. El servidor comparte una caché por fecha para evitar consultas repetidas a la fuente oficial. Las consultas históricas necesarias para registrar pagos mantienen su fecha exacta. Los totales de campañas, marcas y Dashboard incluyen los pagos fijos en COP más el saldo en USD valorado a esa TRM.
- Al registrar un pago USD, indica el importe recibido (admite abonos) y la fecha real. Se guarda el importe original en centavos de USD, la TRM histórica de esa fecha y el valor en COP redondeado al peso. Los pagos guardados no cambian al actualizar la TRM. Una campaña totalmente pagada conserva la suma de sus pagos.
- Para corregir una campaña antigua en COP que ya tenía pagos, selecciona USD al editar e indica el importe original en USD de cada pago y su fecha. Se recalculan explícitamente con la TRM histórica; no se infieren dólares a partir de pesos. Después de registrar pagos USD, la moneda de la campaña queda protegida para conservar el historial.
- Si la TRM no está disponible, se conserva y se identifica la última valoración de los pendientes. La TRM se consulta automáticamente al seleccionar USD y al indicar la fecha de un pago, sin controles manuales de actualización. No se permite registrar un nuevo pago USD sin la TRM correspondiente a su fecha. No se inventan tasas ni se admiten fechas futuras de pago.

Esta funcionalidad requiere ejecutar `npm run db:migrate` antes de desplegar. La migración agrega columnas a campañas y pagos, conserva los registros existentes y los identifica como COP.

Pruebas de conversión e historial (Node.js 24):

```bash
node tests/usd.test.mjs
```

### Canjes y campañas mixtas

En Contenidos hay pestañas **Campañas pagas**, **Calendario**, **Canjes** y **Pendientes**. Al crear o editar una colaboración se puede elegir Paga, Canje o Mixta (pago y canje). Las mixtas permanecen en Campañas pagas y muestran el beneficio separado del pago.

- **Productos:** descripción, cantidad y recepción. No se registra precio ni valoración monetaria.
- **Bono o saldo:** finalidad, valor en COP, recepción, vencimiento opcional y uso parcial del saldo. Registrar uso no crea un gasto ni un ingreso en efectivo.
- La recepción del beneficio y el estado del contenido son independientes. La fecha para subir el video es opcional; sin ella se muestra “Sin fecha definida”. Al asignarla, aparece en el calendario compartido junto con las campañas pagas.
- Los canjes completados se ocultan inicialmente y pueden consultarse con Mostrar completados. Los bonos siguen pendientes mientras conservan saldo por utilizar.
- Dashboard muestra los beneficios aparte. Los canjes no incrementan ingresos, cuentas por cobrar, movimientos monetarios ni el ranking de marcas que más pagan. Las mixtas solo suman el pago acordado.

La migración `0002_shocking_korvac.sql` agrega la columna opcional `campaigns.benefit` sin modificar pagos anteriores. Antes de desplegar esta versión, ejecutar `npm run db:migrate` sobre la base configurada (incluye las migraciones de USD y canjes). Verificaciones: `node tests/barter.test.mjs`, `node tests/finance-insights.test.mjs` y `node tests/usd.test.mjs`.

### Configuración mensual

En `/configuracion` se administran **Gastos fijos** e **Ingresos fijos** con nombre, categoría/origen, valor, día del mes, fecha de inicio y fecha final opcional. Una cuenta nueva empieza hoy o en una fecha posterior; no genera meses anteriores. Los días 29–31 se ajustan al fin de meses cortos. Se pueden pausar o reactivar.

Desde Finanzas, **Ajustar valor** permite elegir **Solo este mes** (ej. una factura variable) o **Este mes y los siguientes**. Los ajustes individuales se conservan al cambiar el valor habitual. Los meses anteriores y registros con pagos quedan intactos al cambiar la configuración. Eliminar una obligación mensual omite ese mes sin volver a crearlo; finalizar o pausar la regla detiene las pendientes del mes actual y futuros.

La migración `0003_naive_ezekiel_stane` añade configuraciones y referencias de recurrencia y clasifica ingresos históricos. La primera consulta convierte las recurrencias existentes desde los registros de la base, sin incorporar importes ni datos personales del código. Las reglas quedan editables. No se modifican los importes de meses pasados ni pagos registrados. Ejecutar `npm run db:migrate` antes del despliegue.

Se eliminó el archivo de datos personales precargados. Una instalación nueva empieza vacía. El importador opcional recibe un archivo privado explícito: `npm run db:import-json -- /ruta/privada/datos.json`. El servidor es la fuente al sincronizar y ya no se reinsertan datos personales iniciales desde el navegador.

### Navegación en teléfonos

En pantallas menores de 768 px se muestra una barra inferior flotante con iconos y etiquetas: Dashboard, Finanzas, Agregar, Contenidos y Más. Agregar abre accesos a gasto, campaña, canje e ingreso mensual; cada acceso abre el formulario correspondiente y lleva a él, incluso al repetirlo en la misma página. Más reúne Movimientos, Configuración y cerrar sesión.

Los paneles usan un diálogo nativo con foco contenido, cierre con Escape y devolución del foco al botón de origen; se cierran al cambiar a escritorio. La barra respeta el área segura del dispositivo y el contenido deja espacio inferior para seguir accesible al desplazarse. En escritorio se mantiene el menú lateral, ahora con iconos. La pantalla de acceso no muestra navegación.

### Perfil y saludo

En **Configuración → Perfil** se guardan el nombre para el saludo y una foto opcional. El saludo aparece en todas las secciones privadas; al tocar el avatar se abre Perfil. Primero se configura el nombre en la cuenta, sin precargarlo en el código. Sin foto se muestran la inicial del nombre o un icono.

Se aceptan JPG, PNG y WebP de hasta 10 MB. El navegador centra y reduce la foto a un JPEG cuadrado de 256 px, sin enviar el archivo original. Se puede cambiar o quitar y confirmar con Guardar perfil. Nombre y foto se guardan mediante una API autenticada en `user_profile`, separados de los datos financieros, sin archivos personales en el repositorio ni almacenamiento público externo. Las respuestas del perfil son privadas y no se almacenan en caché.

La fecha se muestra en español según Colombia y cambia al llegar la medianoche o volver a la aplicación. La migración `0004_rich_lila_cheney` crea la tabla de perfil sin modificar finanzas ni recurrencias. Ejecutar `npm run db:migrate` antes de desplegar.

El endpoint autenticado del perfil prepara automáticamente su tabla si todavía no existe, sin tocar las tablas financieras. La inicialización es idempotente, comparte una operación por proceso y vuelve a intentarse si falla. La migración 0004 también usa `IF NOT EXISTS`, por lo que puede aplicarse después de esa preparación sin perder perfiles. Si falla la conexión al cargar el perfil, la vista permite **Volver a intentar** sin recargar toda la aplicación.

### Calendario único de contenidos

La barra superior de Contenidos permite deslizar entre **Campañas pagas**, **Calendario**, **Canjes** y **Pendientes**. El único calendario está en `/contenidos/calendario` y solo se muestra al elegir esa pestaña; se retiraron los calendarios de las listas de campañas y canjes.

Asigna **Fecha de entrega del contenido (opcional)** al crear o editar. El calendario reúne pagas, canjes y mixtas, incluso pagadas o publicadas, según la fecha de entrega y no el mes de cobro ni la fecha esperada de pago. Los registros sin fecha no generan eventos. Las fechas ya guardadas se conservan en el mismo campo existente, sin migración.

Permite elegir mes, avanzar/retroceder y volver con Hoy. Tocar un día filtra el tablero inferior; Ver todo el mes restaura las entregas del mes. La cuadrícula se adapta a móvil sin desplazamiento horizontal. El diseño conserva la base neutra y usa el color configurado del mes solo en detalles de borde, selección y festivos nacionales de Colombia (incluye traslados al lunes y fechas de Semana Santa). Al seleccionar un festivo se muestra su nombre.

Debajo del calendario está el kanban Pendiente / En producción / Publicado. Incluye entregas del mes y, opcionalmente, contenidos sin fecha de todos los meses. Al seleccionar un día se limita a sus entregas. Permite arrastrar tarjetas en computador o usar el selector de estado de cada tarjeta en móvil. Los cambios se guardan sobre las mismas campañas sin modificar pagos ni beneficios. En móvil las tres columnas caben juntas dentro del ancho del teléfono, con tarjetas y controles compactos y listas con desplazamiento vertical. En escritorio conservan tamaños amplios. Editar permite asignar, mover o quitar fechas desde esta vista.

### Pendientes personales y marcas en Dashboard

Contenidos tiene **Campañas pagas / Calendario / Canjes / Pendientes**. Pendientes es un checklist independiente para ideas de redes, guías o tareas de la casa, sin importes ni fechas obligatorias. Solo requiere un título; permite notas, categoría opcional (Redes, Casa, Personal u Otro), enlace de referencia HTTP/HTTPS, edición, check para completar/restaurar y eliminación. Los completados se ocultan inicialmente y se consultan con Mostrar completados; se puede filtrar por categoría.

Se guarda mediante `/api/tasks`, con autenticación y respuestas privadas sin caché, en `personal_tasks`, aparte de campañas, pagos, calendario e indicadores financieros. Marcar un check se refleja al momento y se revierte si falla el guardado. No se consulta ni incrusta automáticamente el contenido del enlace de referencia.

Las marcas se consultan en la pestaña **Marcas** ya existente de Dashboard, con selector e historial del año elegido. No se agregan pestañas al Dashboard. La antigua ruta `/contenidos/marcas` redirige a Dashboard.

La migración `0005_true_agent_zero` agrega únicamente la tabla de pendientes y usa `IF NOT EXISTS`. El endpoint puede prepararla automáticamente si sigue pendiente, conservando la posibilidad de aplicar `npm run db:migrate` después. No se migran tareas a campañas ni se convierten en cobros.
