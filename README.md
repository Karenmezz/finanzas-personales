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

En desarrollo, la aplicación sincroniza Turso automáticamente y conserva una copia temporal en `localStorage` como respaldo.

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

En producción configura las mismas variables privadas y activa `FINANCE_SYNC_ENABLED=true`. Todas las páginas y la ruta financiera requieren una sesión administrativa válida.
