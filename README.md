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
- **Marcas que más pagan** muestra el ranking del mes en Finanzas y del año en Dashboard, ordenado por pagos recibidos, con valor acordado y promedio por campaña. Agrupa variantes de mayúsculas, tildes y espacios y excluye el salario de Fundación de la Mujer.
- Al consultar los datos se agregan los meses faltantes de transporte ($420.000 COP) y del salario fijo de Fundación de la Mujer ($3.100.000 COP) desde octubre de 2026. No se generan salarios en meses anteriores; los registros anteriores sin pagos se excluyen de los datos mostrados y cualquier pago registrado se conserva. Los salarios sin pagos usan el importe fijo; los registros con pagos conservan su valor e historial. Los nuevos meses no copian pagos ni fechas de contenido. Transporte no se duplica si ya existe como cuenta o gasto del mes.

Para comprobar la lógica de recurrencias, ranking y cobros anteriores (Node.js 24):

```bash
node tests/finance-insights.test.mjs
npm run lint
npx next typegen && npx tsc --noEmit
```

## Secciones

- **Finanzas** (`/`): salario fijo de Fundación de la Mujer, cuentas de la casa, transporte y todos los gastos extras, sin importar su categoría (incluidos Trabajo, Producción, Contenido y Publicidad). Permite registrar el salario recibido y consultar los salarios ya pagados.
- **Contenidos** (`/contenidos`): campañas, pagos de marcas, cobros de meses anteriores, calendario y una subsección **Marcas** (`/contenidos/marcas`). El selector de marcas permite consultar campañas y pagos de todos los meses, agrupando variantes del nombre; los pagados se ocultan por defecto.
- **Dashboard**: indicadores compactos, con fondos de color sutiles e iconos, con una barra de categorías deslizable: General, Finanzas, Contenidos, Marcas y Movimientos. General reúne salario, marcas, cuentas y gastos extras; las otras categorías muestran sus propios indicadores y detalles, manteniendo el año seleccionado. El balance usa dinero recibido menos gastos pagados.
- **Movimientos**: selector de sección para consultar el historial de cada área por separado.
