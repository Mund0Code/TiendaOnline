# Tienda Online con Supabase y Astro/React

Un proyecto de comercio electrónico completo, construido con **Astro**, **React**, **Supabase** y **Stripe**, que incluye:

- Autenticación y gestión de usuarios
- Catálogo de productos digitales (libros)
- Carrito de compras y pago con Stripe
- Perfil de usuario con:
  - Resumen de pedidos y gasto
  - Descarga de libros y facturas
  - Historial de pedidos y facturas en PDF
  - Formulario de soporte
- Panel de administración para gestionar productos, categorías, pedidos y usuarios
- Generación dinámica de facturas (PDF) con `pdfkit`
- Subida y firma de URLs en Supabase Storage
- Dashboard de métricas con gráficas de Recharts

---

## 📦 Tecnologías

- **Astro**: SSG/SSR ligero para páginas públicas y rutas API
- **React**: Componentes dinámicos en cliente (perfil, pedidos, descargas)
- **Supabase**: Postgres + autenticación + Storage + funciones RPC
- **Stripe**: Gestión de pagos vía Checkout Sessions
- **pdfkit**: Creación de facturas en PDF
- **Recharts**: Gráficos de barras para métricas
- **Tailwind CSS**: Estilos utilitarios
- **Node.js**: Backend ligero para API routes y worker

---

## 🚀 Comenzando

### Prerrequisitos

- Node.js ≥ 16
- Cuenta y proyecto en [Supabase](https://supabase.com)
- Cuenta y credenciales en [Stripe](https://stripe.com)

### Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/tu-usuario/tienda-online.git
   cd tienda-online

   ```

2. Instala dependencias:

   ```bash
   npm install
   # ó
   yarn install
   ```

3. Crea un archivo .env en la raíz con tus credenciales:

   ```bash
   # Supabase
    SUPABASE_URL=https://xyzcompany.supabase.co
    SUPABASE_ANON_KEY=public-anon-key
    SUPABASE_SERVICE_ROLE_KEY=service-role-key

    # Stripe
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_PUBLISHABLE_KEY=pk_test_...

    # URLs
    SITE_URL=https://tudominio.com
   ```

4. Inicializa la base de datos (ejecuta en psql o en SQL editor de Supabase):

   ```sql
   -- Habilita UUID
    create extension if not exists "uuid-ossp";

    -- Tabla de órdenes
    create table orders (
    id uuid primary key default uuid_generate_v4(),
    checkout_session_id text unique not null,
    customer_id uuid references auth.users(id),
    customer_email text,
    amount_total numeric not null,
    status text not null,
    created_at timestamptz not null default now(),
    name text,
    product_id uuid references products(id),
    invoice_url text,
    downloaded boolean not null default false,
    invoice_downloaded boolean not null default false
    );

    -- Tabla de categorías
    create table categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null
    );

    -- Tabla de productos
    create table products (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    price_cents integer not null,
    file_path text,
    category_id uuid references categories(id)
    );

    -- Función RPC para total gastado
    create or replace function sum_amount_by_customer(cust_id uuid)
    returns table(sum numeric) language sql as $$
    select sum(amount_total) from orders where customer_id = cust_id;
    $$;
   ```

5. Configura los buckets en Supabase Storage:

   - books (para archivos PDF de libros)

   - invoices (para facturas generadas)

# Scripts

    - npm run dev – modo desarrollo (Astro dev + API)

    - npm run build – genera producción

    - npm run preview – preview del build

# 📁 Estructura de carpetas

    ```text
        /
    ├── public/                  # Archivos estáticos (logo, libros subidos)
    ├── src/
    │   ├── components/          # React Components
    │   │   ├── ProfileDashboard.jsx
    │   │   ├── UserOrders.jsx
    │   │   ├── UserDownloads.jsx
    │   │   ├── SettingsForm.jsx
    │   │   ├── SupportForm.jsx
    │   │   ├── DownloadButton.jsx
    │   │   ├── InvoiceDownloadButton.jsx
    │   │   └── BookDownloadButton.jsx
    │   ├── layouts/             # Astro layouts
    │   ├── lib/
    │   │   └── supabaseClient.js
    │   ├── pages/
    │   │   ├── index.astro
    │   │   ├── success.astro     # página tras pago
    │   │   └── api/
    │   │       └── generate-invoice.ts
    │   └── worker.js            # Opcional: cron worker
    ├── .env
    ├── package.json
    └── README.md
    ```

# 🔑 Rutas y API

- GET /success?session_id=...
  Página de agradecimiento tras el pago, recupera el pedido y muestra botón de descarga.

- POST /api/generate-invoice
  Genera factura en PDF, sube a Storage y devuelve URL firmada.

- Supabase RPC
  - sum_amount_by_customer(cust_id) → total gastado

# 🖥️ Panel de Usuario

- Resumen

  - Nº de pedidos, total gastado, gasto medio

  - Pedidos sin descargar (libro / factura)

  - Última compra

  - Gráfico de pedidos últimos 6 meses

  - Tabla con últimos 3 pedidos y botones de descarga

- Pedidos
  Listado completo con posibilidad de descargar libro.

- Facturas
  Listado de facturas generadas con enlace de descarga.

- Configuración
  Formulario para editar nombre, email y contraseña.

- Soporte
  Formulario para enviar mensaje al equipo.

# 🛠️ Panel de Administración

- Gestión de productos, categorías, órdenes y usuarios (con flag is_admin).

- Visualización de métricas avanzadas y edición de contenido.

# 📦 Despliegue

- Build: npm run build

- Variables: configura tu entorno de producción con las mismas variables en .env.

- Servidor: sirve la carpeta dist/ con Node o un host compatible con SSR (Vercel, Netlify, Fly.io…).

- Worker: ejecuta node worker.js en background (PM2, Docker, CronJob, Cloud Run, etc.).

# 🤝 Contribuciones

1. Haz un fork del repositorio

2. Crea una rama (git checkout -b feature/nueva-funcionalidad)

3. Realiza tus cambios y haz commit

4. Abre un Pull Request describiendo tu aporte

<p align="center"> <sub>Desarrollado con ❤️ por tu equipo</sub> </p> ```
