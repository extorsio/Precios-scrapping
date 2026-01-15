import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import ObjectsToCsv from 'objects-to-csv';
import { chromium } from 'playwright';

// Configuración de tiendas y selectores
const STORES = [
    {
        name: 'Plaza Vea',
        getUrl: (code) => `https://www.plazavea.com.pe/search/?_query=${code}`,
        selectors: {
            container: '.Showcase',
            title: '.Showcase__name',
            priceOnline: '.Showcase__salePrice',
            priceRegular: '.Showcase__oldPrice',
            priceCard: '.Showcase__ohPrice'
        }
    },
    {
        name: 'Vivanda',
        getUrl: (code) => `https://www.vivanda.com.pe/${code}?_q=${code}&map=ft`,
        selectors: {
            // Vivanda usa prefijo 'vivanda-' en lugar de 'vtex-'
            container: 'article, .vivanda-product-summary-2-x-container, .vtex-product-summary-2-x-container',
            title: '.vivanda-product-summary-2-x-brandName, .vivanda-product-summary-2-x-productBrand',
            // Precios: sellingPriceWithTax = precio oferta (89.90), listPriceWithTax = precio regular tachado (99.90)
            priceOnline: '.vivanda-product-price-1-x-sellingPriceWithTax',
            priceRegular: '.vivanda-product-price-1-x-listPriceWithTax',
            priceCard: null
        }
    },
    {
        name: 'Wong',
        getUrl: (code) => `https://www.wong.pe/${code}?_q=${code}&map=ft`,
        selectors: {
            container: 'article, .vtex-product-summary-2-x-container',
            title: '.vtex-product-summary-2-x-brandName, .vtex-product-summary-2-x-productBrand',
            priceOnline: '.vtex-product-price-1-x-sellingPriceValue, .vtex-product-price-1-x-sellingPriceValue--product-online-price',
            priceRegular: '.vtex-product-price-1-x-listPriceValue',
            priceCard: null
        }
    },
    {
        name: 'Metro',
        getUrl: (code) => `https://www.metro.pe/${code}?_q=${code}&map=ft`,
        selectors: {
            container: 'article, .vtex-product-summary-2-x-container',
            title: '.vtex-product-summary-2-x-brandName, .vtex-product-summary-2-x-productBrand',
            priceOnline: '.vtex-product-price-1-x-sellingPriceValue',
            priceRegular: '.vtex-product-price-1-x-listPriceValue',
            priceCard: null
        }
    },
    {
        name: 'Tottus',
        getUrl: (code) => `https://www.tottus.com.pe/tottus-pe/buscar?Ntt=${code}`,
        selectors: {
            // Selectores para LISTA de resultados
            container: 'li.product-item',
            title: '.pod-link b, .item-product-caption b',
            priceOnline: '.price-selector.internet .active-price span, .price.internet',
            priceRegular: '.price-selector.regular .active-price span, .price.regular',
            priceCard: '.price-selector.cmr .active-price span, .price.cmr',

            // Detección y selectores para PDP (Pagina de Producto) si redirige
            pdpCheck: (url) => url.includes('/articulo/') || url.includes('/p/'),
            pdp: {
                title: 'h1.product-name, .product-name',
                priceOnline: 'span.primary.senary.bold, .prices-0-x-sellingPriceValue, div[class*="active-price"] span',
                priceRegular: 'span.copy1.crossed, .prices-0-x-listPriceValue'
            }
        }
    }
];

async function scrapeStore(page, store, code) {
    const url = store.getUrl(code);
    console.log(`[${store.name}] Navegando a: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Manejo especial para Tottus y redirecciones a PDP
        if (store.selectors.pdpCheck && store.selectors.pdpCheck(page.url())) {
            console.log(`[${store.name}] Redireccionado a página de producto.`);
            // Esperar a que cargue el título
            try {
                await page.waitForSelector(store.selectors.pdp.title, { timeout: 5000 });
            } catch (e) { }

            const product = await page.evaluate((sel) => {
                const title = document.querySelector(sel.title)?.innerText.trim();
                const priceOnline = document.querySelector(sel.priceOnline)?.innerText.trim();
                const priceRegular = document.querySelector(sel.priceRegular)?.innerText.trim();
                return { title, 'Precio online': priceOnline, 'precio regular': priceRegular };
            }, store.selectors.pdp);

            if (product.title) {
                console.log(`[${store.name}] ✅ Producto encontrado (PDP): ${product.title}`);
                return { store: store.name, codigo: code, available: true, ...product };
            }
        }

        // Flujo normal (Lista de resultados)
        // Intentar esperar al contenedor
        try {
            await Promise.race([
                page.waitForSelector(store.selectors.container, { timeout: 8000 }),
                page.waitForTimeout(4000)
            ]);
        } catch (e) { }

        // Crear una copia de los selectores sin funciones para pasar al navegador
        const serializableSelectors = { ...store.selectors };
        delete serializableSelectors.pdpCheck;
        delete serializableSelectors.pdp; // pdp también podría tener cosas innecesarias, pero pdpCheck es el function

        const product = await page.evaluate((selectors) => {
            // Buscamos el primer contenedor
            const item = document.querySelector(selectors.container);
            if (!item) return null;

            const getText = (sel) => {
                if (!sel) return null;
                // Soporte para múltiples selectores separados por coma
                const el = item.querySelector(sel);
                return el ? el.innerText.trim() : null;
            };

            // Lógica específica para precios
            let priceOnline = getText(selectors.priceOnline);
            // Fallback para Plaza Vea
            if (!priceOnline && selectors.priceOnline && selectors.priceOnline.includes('Showcase')) {
                const el = item.querySelector(selectors.priceOnline);
                if (el && el.getAttribute('data-price')) priceOnline = el.getAttribute('data-price');
            }

            return {
                title: getText(selectors.title),
                'Precio online': priceOnline,
                'precio regular': getText(selectors.priceRegular),
                'precio con tarjeta': getText(selectors.priceCard)
            };
        }, serializableSelectors);

        if (product && product.title) {
            console.log(`[${store.name}] ✅ Producto encontrado: ${product.title}`);
            return {
                store: store.name,
                codigo: code,
                available: true,
                ...product
            };
        } else {
            console.log(`[${store.name}] ❌ Producto no encontrado (o sin stock).`);
            return {
                store: store.name,
                codigo: code,
                available: false
            };
        }

    } catch (error) {
        console.error(`[${store.name}] Error: ${error.message}`);
        return {
            store: store.name,
            codigo: code,
            available: false,
            error: error.message
        };
    }
}

function readCodes(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`El archivo CSV no existe: ${filePath}`);
    }
    const fileContent = fs.readFileSync(filePath);
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
    // Asumimos que la columna se llama 'codigo' (o tomamos la primera columna)
    return records.map(r => Object.values(r)[0]);
}

async function run() {
    const csvPath = path.resolve('codigos.csv');
    console.log(`Leyendo códigos de: ${csvPath}`);

    let codes = [];
    try {
        codes = readCodes(csvPath);
    } catch (e) {
        console.error(`Error al leer CSV: ${e.message}`);
        console.log('Asegurate de tener un archivo "codigos.csv" con una columna "codigo".');
        return;
    }

    console.log(`Se encontraron ${codes.length} códigos para procesar.`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    const allResults = [];

    for (const code of codes) {
        console.log(`\n--- Procesando código: ${code} ---`);
        for (const store of STORES) {
            const result = await scrapeStore(page, store, code);
            // Solo guardamos si encontramos info o al menos indicamos que no hubo
            if (result.available) {
                // Aplanar el objeto para el CSV final
                allResults.push({
                    Codigo: code,
                    Tienda: store.name,
                    Producto: result.title,
                    'Precio Online': result['Precio online'],
                    'Precio Regular': result['precio regular'],
                    'Precio Tarjeta': result['precio con tarjeta']
                });
            } else {
                // Opcional: Guardar también los no encontrados
                allResults.push({
                    Codigo: code,
                    Tienda: store.name,
                    Producto: 'NO ENCONTRADO',
                    'Precio Online': '',
                    'Precio Regular': '',
                    'Precio Tarjeta': ''
                });
            }
            // Pequeña pausa para no saturar
            await page.waitForTimeout(1000);
        }
    }

    await browser.close();

    // Guardar CSV
    if (allResults.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = 'C:\\Users\\PC\\Downloads\\fotos';

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `resultados_${timestamp}.csv`);
        const csv = new ObjectsToCsv(allResults);
        await csv.toDisk(outputPath);
        console.log(`\n✅ Resultados guardados exitosamente en:\n${outputPath}`);
    } else {
        console.log('\n⚠️ No se obtuvieron resultados para guardar.');
    }
}

run();
