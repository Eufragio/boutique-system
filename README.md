# Boutique System

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)
![Last Commit](https://img.shields.io/github/last-commit/Eufragio/-boutique-system)

Sistema web de gestión integral para tiendas boutique — ventas, inventario, caja, compras y reportes desde una sola interfaz.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express.js |
| Base de datos | PostgreSQL 16 |
| Vistas | EJS |
| Autenticación | Sessions + bcryptjs |
| Reportes | ExcelJS + json2csv |
| Archivos | Multer |

## Funcionalidades

- **POS** — Punto de venta con búsqueda de productos y múltiples métodos de pago
- **Inventario** — Control de stock con alertas de stock mínimo
- **Kardex** — Historial completo de movimientos por producto
- **Compras** — Registro de compras a proveedores con actualización automática de stock
- **Clientes** — Base de datos con historial de compras por cliente
- **Caja** — Apertura/cierre con conciliación de efectivo y pagos digitales
- **Gastos** — Registro de gastos operativos
- **Reportes** — Exportación a Excel y CSV de ventas e inventario
- **Usuarios** — Sistema multiusuario con roles (admin / vendedor)
- **Configuración** — Nombre del negocio, logo, moneda y zona horaria

## Instalación

### Opción A — Docker (recomendado)

Requiere [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/Eufragio/-boutique-system.git
cd boutique-system
cp .env.example .env
docker compose up --build
```

Editá `.env` antes de levantar. La base de datos se inicializa automáticamente.

Abrí `http://localhost:3000`.

### Opción B — Manual

**Requisitos:** Node.js v18+ · PostgreSQL v14+

```bash
git clone https://github.com/Eufragio/-boutique-system.git
cd boutique-system
npm install
cp .env.example .env
npm run init-db
npm run dev
```

Abrí `http://localhost:3000`.

**Credenciales por defecto:** `admin@boutique.com` / `admin123`

> Cambiá la contraseña del admin después del primer login.

## Estructura del Proyecto

```
boutique-system/
├── app.js
├── docker-compose.yml
├── src/
│   ├── config/        # Configuración BD y multer
│   ├── controllers/   # Lógica de negocio
│   ├── models/        # Consultas SQL
│   ├── routes/        # Rutas Express
│   ├── middlewares/   # Autenticación y roles
│   ├── views/         # Templates EJS
│   └── database/      # Schema SQL
└── public/            # CSS, JS y uploads
```

## Licencia

MIT
