const axios = require('axios');
const xlsx = require('xlsx');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Function to handle SIGINT (Ctrl+C)
function handleExit(signal) {
    console.log(`Received ${signal}. Exiting...`);
    process.exit();
}

const logWithColor = (text, hexColor) => {
    const [r, g, b] = hexColor.match(/\w\w/g).map((c) => parseInt(c, 16));
    console.log(`\x1b[38;2;${r};${g};${b}m%s\x1b[0m`, text);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

async function geocode(address) {
    const apiKey = '3458a525-2d26-4426-af52-8572dbfe318b'; // Замените 'YOUR_YANДЕКС_API_KEY' на ваш реальный API ключ
    const url = 'https://geocode-maps.yandex.ru/1.x/';

    try {
        const response = await axios.get(url, {
            params: {
                apikey: apiKey,
                geocode: address,
                format: 'json'
            }
        });

        // Обработка ответа
        return response.data.response.GeoObjectCollection.featureMember;

    } catch (error) {
        console.error('Error fetching geocode data:', error);
    }
}

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

// Основная функция для обработки адресов
const processAddresses = async (filePath) => {
    let input_excel = readExcel(filePath);

    // Добавляем заголовки для новых столбцов, если они ещё не добавлены
    if (input_excel[0].length < 18) {
        input_excel[0].push('Широта', 'Долгота', 'URI', 'Приоритет', 'Страна', 'Регион', 'Округ', 'Город', 'Район', 'Улица', 'Дом', 'Duplicate');
        writeExcel(filePath, input_excel); // Записываем заголовки, если они добавлены
    }

    // Поиск первой строки, которая еще не обработана
    let startRow = 1;
    for (let i = 1; i < input_excel.length; i++) {
        if (input_excel[i][5] === undefined || input_excel[i][6] === undefined) {
            startRow = i;
            break;
        }
    }
    logWithColor(`Продолжаем с ${startRow} строки: адрес ${input_excel[startRow][4]}`,'#48249c')


    for (let i = startRow; i < input_excel.length; i++) {
        if (input_excel[i][5] !== undefined && input_excel[i][6] !== undefined) {
            // Пропустить строки, где координаты уже есть
            continue;
        }

        const address = input_excel[i][4]; // Предполагаем, что адрес в пятом столбце
        if (!address) continue;
        logWithColor(`Получение координат для: ${address}`,'#ffa50a')

        const geoObjects = await geocode(address);

        if (geoObjects && geoObjects.length > 0) {
            const hasDuplicates = geoObjects.length > 1; // Проверяем наличие дубликатов

            for (let j = 0; j < geoObjects.length; j++) {
                const geoObject = geoObjects[j].GeoObject;
                const position = geoObject.Point.pos.split(' ').reverse();
                const uri = geoObject.uri;

                const newRow = [...input_excel[i]];
                logWithColor(`Координаты получены: ${position[0]} ${position[1]}`,'#14e337')
                newRow[5] = position[0]; // Широта
                newRow[6] = position[1]; // Долгота
                newRow[7] = uri; // URI
                newRow[8] = (j + 1).toString(); // Приоритет

                const componentsMap = new Map();
                geoObject.metaDataProperty.GeocoderMetaData.Address.Components.forEach(component => {
                    componentsMap.set(component.kind, component.name);
                });

                newRow[9] = componentsMap.get('country') || '';
                newRow[10] = componentsMap.get('province') || '';
                newRow[11] = componentsMap.get('area') || '';
                newRow[12] = componentsMap.get('locality') || '';
                newRow[13] = componentsMap.get('district') || '';
                newRow[14] = componentsMap.get('street') || '';
                newRow[15] = componentsMap.get('house') || '';
                newRow[16] = hasDuplicates ? '+' : ''; // Устанавливаем флаг дубликата только если есть дубликаты

                if (j === 0) {
                    // Обновляем текущую строку
                    input_excel[i] = newRow;
                } else {
                    // Добавляем новую строку для каждого следующего варианта
                    input_excel.splice(i + 1, 0, newRow);
                    i++; // Увеличиваем индекс, чтобы пропустить добавленную строку
                }
            }
        } else {
            logWithColor(`Не удалось получить координаты для ${address}`,'#d62013')
        }

        writeExcel(filePath, input_excel); // Записываем данные после обработки каждого адреса

        // Добавьте задержку между запросами, чтобы избежать блокировки API
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
};

// Путь к вашему Excel файлу
const filePath = 'input.xlsx';
const main = async () => {
    const startTime = performance.now();
    await processAddresses(filePath);
    const endTime = performance.now();
    const timeTaken = endTime - startTime;
    logWithColor(`Полное время выполнения: ${timeTaken} миллисекунд`,'#a913bd')
};

main().catch(error => {
    logWithColor('Ошибка при выполнении программы:', error,'#d62013')
});
