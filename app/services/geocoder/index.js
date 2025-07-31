const fs = require('fs');
const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

const timeOut = 1500
// Функция для вывода текста с цветом в консоль
const logWithColor = (text, hexColor) => {
    const [r, g, b] = hexColor.match(/\w\w/g).map((c) => parseInt(c, 16));
    console.log(`\x1b[38;2;${r};${g};${b}m%s\x1b[0m`, text);
};

// Функция для чтения Excel файла
const readExcel = (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet, { header: 1 });
};

// Функция для записи данных в Excel файл
const writeExcel = (filePath, data) => {
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    xlsx.writeFile(workbook, filePath);
};

// Функция для получения координат с помощью Яндекс.Карт
const getCoordinates = async (address) => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, devtools: true });
        const page = await browser.newPage();
        await page.goto('https://yandex.ru/maps');

        // Ввод адреса в поиск
        await page.type('input.input__control', address);
        await page.keyboard.press('Enter');

        // Проверка на битый адресsearch-snippet-view__body _type_business
        try {
            await page.waitForSelector('.nothing-found-view__header', { timeout: timeOut });
            logWithColor(`Битый адрес: ${address}`, '#FF0000');
            await browser.close();
            return 'Некорректный, адрес';
        } catch (error) {
            logWithColor('Адрес корректный, продолжаем...', '#00FF00');
        }

        // Проверка наличия предупреждения и клик на уточнение результата
        try {
            await page.waitForSelector('.search-list-view__warning', { timeout: timeOut });
            await page.click('.search-snippet-view__body');
        } catch (error) {
            logWithColor('Предупреждение отсутствует, продолжаем...', '#00FF00');
        }

        try {
            await page.waitForSelector('.toponym-card-title-view__coords-badge', { timeout: timeOut });
            logWithColor('Координаты найдены!', '#00FF00');
        } catch (error) {
            try {
                const elements = await page.$$('li.search-snippet-view');
                if (elements.length > 0) {
                    await elements[0].click();
                } else {
                    logWithColor('Элементы не найдены, продолжаем...', '#FFFF00');
                }
            } catch (error) {
                logWithColor('Ошибка при поиске предложений', '#FF0000');
            }
        }



        // Ожидание загрузки страницы и попытка получения координат
        try {
            await page.waitForSelector('.toponym-card-title-view__coords-badge', { timeout: timeOut });
            const coordinates = await page.evaluate(() => {
                const coordElement = document.querySelector('.toponym-card-title-view__coords-badge');
                return coordElement ? coordElement.textContent : null;
            });
            await browser.close();
            return coordinates;
        } catch (error) {
            // Если элемент не найден, ищем новый адрес
            logWithColor('Элементы не найдены, продолжаем...', '#FFFF00');
            const newAddress = await page.evaluate(() => {
                const addressElement = document.querySelector('.business-contacts-view__address-link');
                return addressElement ? addressElement.textContent : null;
            });

            if (newAddress) {
                logWithColor(`Новый адрес найден: ${newAddress}`, '#0000FF');
                await browser.close();
                return await getCoordinates(newAddress); // Повторный вызов функции с новым адресом
            } else {
                await browser.close();
                throw new Error('Новый адрес не найден');
            }
        }
    } catch (error) {
        if (browser) {
            await browser.close();
        }
        throw error;
    }
};


const getCoordinatesWithRetries = async (address, retries = 10) => {
    for (let i = 0; i < retries; i++) {
        try {
            const coordinates = await getCoordinates(address);
            if (coordinates) {
                return coordinates;
            }
        } catch (error) {
            logWithColor(`Попытка ${i + 1} для ${address} не удалась: ${error.message}`, '#1414e0');
            if (i === retries - 1) {
                throw error;
            }
        }
    }
};

// Основная функция для обработки адресов
const processAddresses = async (filePath) => {
    let data = readExcel(filePath);
    // const address = data[7][4];
    // console.log(`Получение координат для: ${address}`);
    // const coordinates = await getCoordinates(address);
    // console.log(coordinates);
    // const startTime = performance.now();
    let i = 1
    for (; i < data.length; i++) {
        if (!data[i][6]) { // Проверка, если координаты уже есть
            const address = data[i][4];
            console.log(`Получение координат для: ${address}`);
            const coordinates = await getCoordinatesWithRetries(address, 20);
            if (coordinates) {
                data[i][6] = coordinates.split(',')[0];
                data[i][7] = coordinates.split(',')[1];
                writeExcel(filePath, data); // Сохранение после каждой итерации
                console.log(`Координаты для ${address}: ${coordinates}`);
            } else {
                console.log(`Не удалось получить координаты для ${address}`);
            }
        }
    }
    // const endTime = performance.now();
    // const timeTaken = endTime - startTime;
    // console.log('Времени ушло: ' + timeTaken + ', на ' + i + 'адресов');
};

// Путь к вашему Excel файлу
const filePath = 'АП-МПК.xlsx';
const main = async () => {
    const startTime = performance.now();
    await processAddresses(filePath);
    const endTime = performance.now();
    const timeTaken = endTime - startTime;
    console.log(`Полное время выполнения: ${timeTaken} миллисекунд`);
};

main().catch(error => {
    console.error('Ошибка при выполнении программы:', error);
});