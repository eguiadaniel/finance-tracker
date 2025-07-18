# Finance Tracker 💰

Una herramienta completa para el control de finanzas personales, diseñada para ser alojada en tu propio servidor Synology.

## Características

- 📊 **Dashboard interactivo** con estadísticas en tiempo real
- 💰 **Gestión de transacciones** (ingresos y gastos)
- 🏷️ **Categorías personalizables** con iconos y colores
- 📱 **Diseño responsive** para móviles y tablets
- 🔒 **Autenticación de usuarios** con JWT
- 📈 **Análisis y reportes** con gráficos
- 💾 **Base de datos SQLite** local
- 📤 **Exportación a CSV** para análisis externos
- 🎯 **Presupuestos y objetivos** de ahorro

## Tecnologías

- **Backend**: Node.js, Express.js
- **Base de datos**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Autenticación**: JWT (JSON Web Tokens)
- **Seguridad**: Helmet, CORS, bcryptjs

## Instalación

### Requisitos previos

- Node.js (versión 14 o superior)
- npm o yarn

### Instalación local

1. **Clonar o descargar el proyecto**
   ```bash
   git clone <tu-repositorio>
   cd finance-tracker
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

4. **Inicializar la base de datos**
   ```bash
   npm run setup
   ```

5. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

6. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## Uso con Claude Terminal

Este proyecto está optimizado para trabajar con Claude Terminal. Puedes usar comandos como:

```bash
# Iniciar el servidor
claude run dev

# Crear nuevas funcionalidades
claude generate controller transactions

# Ejecutar tests
claude run test

# Hacer build para producción
claude run build
```

## Instalación en Synology

### Método 1: Docker (Recomendado)

1. **Crear Dockerfile** (incluido en el proyecto)
2. **Construir imagen**
   ```bash
   docker build -t finance-tracker .
   ```
3. **Ejecutar contenedor**
   ```bash
   docker run -p 3000:3000 -v /volume1/docker/finance-tracker:/app/data finance-tracker
   ```

### Método 2: Node.js directo

1. **Instalar Node.js** en tu Synology
2. **Subir archivos** al directorio web
3. **Instalar dependencias**
   ```bash
   npm install --production
   ```
4. **Configurar variables** de entorno
5. **Iniciar aplicación**
   ```bash
   npm start
   ```

## Estructura del proyecto

```
finance-tracker/
├── src/
│   ├── controllers/         # Controladores de la aplicación
│   ├── models/             # Modelos de datos
│   ├── routes/             # Rutas de la API
│   ├── middleware/         # Middleware personalizado
│   ├── utils/              # Utilidades y helpers
│   ├── app.js              # Configuración de Express
│   └── server.js           # Servidor principal
├── public/
│   ├── css/                # Hojas de estilo
│   ├── js/                 # JavaScript del frontend
│   ├── images/             # Imágenes y recursos
│   └── index.html          # Aplicación principal
├── data/                   # Base de datos SQLite
├── .env                    # Variables de entorno
├── package.json            # Dependencias y scripts
└── README.md              # Este archivo
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil

### Transacciones
- `GET /api/transactions` - Listar transacciones
- `POST /api/transactions` - Crear transacción
- `PUT /api/transactions/:id` - Actualizar transacción
- `DELETE /api/transactions/:id` - Eliminar transacción

### Categorías
- `GET /api/categories` - Listar categorías
- `POST /api/categories` - Crear categoría
- `PUT /api/categories/:id` - Actualizar categoría
- `DELETE /api/categories/:id` - Eliminar categoría

### Estadísticas
- `GET /api/stats/summary` - Resumen financiero
- `GET /api/stats/monthly` - Estadísticas mensuales
- `GET /api/stats/categories` - Gastos por categoría

## Configuración

### Variables de entorno (.env)

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/finance.db
JWT_SECRET=tu_clave_secreta_super_segura
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

### Personalización

1. **Categorías**: Modifica las categorías por defecto en `src/models/database.js`
2. **Colores**: Personaliza los colores en `public/css/styles.css`
3. **Moneda**: Cambia la moneda en `public/js/app.js`

## Desarrollo

### Scripts disponibles

- `npm run dev` - Servidor de desarrollo con recarga automática
- `npm start` - Servidor de producción
- `npm run setup` - Inicializar base de datos
- `npm run build` - Construir para producción
- `npm test` - Ejecutar tests (por implementar)

### Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## Próximas funcionalidades

- [ ] Gráficos avanzados con Chart.js
- [ ] Notificaciones por email
- [ ] Importación de datos bancarios
- [ ] Aplicación móvil PWA
- [ ] Múltiples monedas
- [ ] Respaldos automáticos
- [ ] Análisis predictivo con IA

---

**Desarrollado con ❤️ para la gestión financiera personal**