# Precios-scrapping 🛒

Web scraper automatizado para consultar y comparar precios de productos en las principales cadenas de supermercados de Perú.

## 📋 Descripción

Este proyecto permite realizar scraping de precios de productos en múltiples tiendas peruanas de forma automatizada. Solo necesitas proporcionar los códigos de los productos y el script se encarga de buscarlos en todas las tiendas configuradas, extrayendo información detallada de precios y disponibilidad.

### Tiendas Soportadas

- **Plaza Vea** - Precio online, precio regular y precio con tarjeta
- **Vivanda** - Precio online y precio regular
- **Wong** - Precio online y precio regular
- **Metro** - Precio online y precio regular
- **Tottus** - Precio online, precio regular y precio con tarjeta CMR

## ✨ Características

- ✅ Scraping automatizado con Playwright (navegador sin interfaz)
- ✅ Soporte para múltiples tiendas simultáneamente
- ✅ Lectura de códigos desde archivo CSV
- ✅ Exportación de resultados en formato CSV
- ✅ Manejo inteligente de redirecciones y diferentes estructuras HTML
- ✅ Detección automática de productos no disponibles
- ✅ Timestamp en archivos de salida para histórico de consultas

## 🚀 Instalación

### Prerrequisitos

- Node.js (versión 14 o superior)
- npm o yarn

### Pasos de Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/Precios-scrapping.git
cd Precios-scrapping
```

2. Instalar las dependencias:
```bash
npm install
```

3. Instalar navegadores de Playwright:
```bash
npx playwright install chromium
```

## 📖 Uso

### 1. Preparar el archivo de códigos

Crea o edita el archivo `codigos.csv` en la raíz del proyecto con los códigos de productos que deseas consultar:

```csv
codigo
922019
20393450
146268932
```

### 2. Ejecutar el scraper

```bash
node index.mjs
```

### 3. Resultados

Los resultados se guardarán automáticamente en formato CSV en la carpeta especificada (`C:\Users\PC\Downloads\fotos` por defecto) con un nombre que incluye la fecha y hora de ejecución:

```
resultados_2026-01-15T10-30-45-123Z.csv
```

El CSV de salida contendrá:
- **Codigo**: Código del producto buscado
- **Tienda**: Nombre de la tienda
- **Producto**: Nombre/descripción del producto
- **Precio Online**: Precio de venta online
- **Precio Regular**: Precio regular (sin descuento)
- **Precio Tarjeta**: Precio con tarjeta de la tienda (cuando aplique)

## 🛠️ Configuración

### Cambiar la ruta de salida

Edita la variable `outputDir` en [index.mjs](index.mjs):

```javascript
const outputDir = 'C:\\Users\\PC\\Downloads\\fotos';
```

### Modificar tiendas o selectores

La configuración de tiendas y selectores CSS se encuentra en el array `STORES` en [index.mjs](index.mjs). Cada tienda tiene:

- `name`: Nombre de la tienda
- `getUrl`: Función que genera la URL de búsqueda
- `selectors`: Selectores CSS para extraer información

## 📦 Dependencias

- **playwright**: Framework para automatización de navegadores
- **csv-parse**: Parser para leer archivos CSV
- **objects-to-csv**: Utilidad para exportar objetos JavaScript a CSV

## 🔧 Estructura del Proyecto

```
Precios-scrapping/
├── index.mjs           # Script principal del scraper
├── codigos.csv         # Archivo con códigos de productos
├── package.json        # Configuración de dependencias
├── README.md          # Este archivo
└── .gitignore         # Archivos excluidos del repositorio
```

## ⚠️ Consideraciones

- El script utiliza un navegador sin interfaz (headless) para mayor velocidad
- Se implementan pausas entre peticiones para evitar bloqueos
- Algunos sitios pueden tener protecciones anti-bot
- Los selectores CSS pueden cambiar si las tiendas actualizan sus páginas
- El tiempo de ejecución depende de la cantidad de códigos y tiendas

## 📝 Notas

- El proyecto está configurado con `type: "commonjs"` en package.json pero usa sintaxis ESM (`.mjs`)
- Asegúrate de tener buena conexión a internet para ejecutar el scraper
- Los resultados incluyen productos no encontrados para mantener registro completo

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## 👤 Autor

Christian

---

⭐ Si este proyecto te fue útil, no olvides darle una estrella!
