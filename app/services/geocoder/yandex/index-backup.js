const axios = require('axios');
const fs = require('fs');
const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

async function geocode(address) {
    const apiKey = '3458a525-2d26-4426-af52-8572dbfe318b'; // Замените 'YOUR_YANDEX_API_KEY' на ваш реальный API ключ
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
        const geoObject = response.data.response.GeoObjectCollection.featureMember[0].GeoObject;
        console.log('GeoObject:', geoObject);

        // Вернуть данные для дальнейшего парсинга
        return geoObject;

    } catch (error) {
        console.error('Error fetching geocode data:', error);
    }
}
// // Пример использования функции
// const address = 'Москва, Красная площадь';
// geocode(address).then(geoObject => {
//   // Дополнительная обработка geoObject
//   console.log('Parsed GeoObject:', geoObject);
// });


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

const geoKindMap = new Map([
    ['country', 'Страна'],
    ['province', 'Регион'],
    ['area', 'Округ'],
    ['district', 'Район'],
    ['street', 'Улица'],
    ['house', 'Дом'],
])
const geoKindMapExcel = new Map([
    ['country', 9],
    ['province', 10],
    ['area', 11],
    ['district', 12],
    ['street', 13],
    ['house', 14],
])

// Основная функция для обработки адресов
const processAddresses = async (filePath) => {
    let input_excel = readExcel(filePath);
    let i = 1
    const coordinates = await feo();
    const cord = coordinates.GeoObject.Point.pos.split(' ').reverse()
    const uri = coordinates.GeoObject.uri
    console.log('Координаты', coordinates.GeoObject.Point.pos.split(' ').reverse());
    console.log('uri:', coordinates.GeoObject.uri);
    console.log(coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components);
    coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components.forEach(zone => {
        console.log(geoKindMap.get(zone.kind), zone.name);
    });
    input_excel[0][6] = 'Широта';
    input_excel[1][6] = cord[0];
    input_excel[0][7] = 'Долгота';
    input_excel[1][7] = cord[1];

    input_excel[0][8] = 'uri';
    input_excel[1][8] = uri;

    input_excel[0][9] = 'Страна';
    input_excel[0][10] = 'Регион';
    input_excel[0][11] = 'Округ';
    input_excel[0][12] = 'Город';
    input_excel[0][13] = 'Район';
    input_excel[0][14] = 'Улица';
    input_excel[0][15] = 'Дом';

    input_excel[1][9] = coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name ? coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name : '';
    input_excel[1][10] = coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name ? coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[1].name : '';
    input_excel[1][11] = coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name ? coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[2].name : '';
    input_excel[1][12] = coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name ? coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[3].name : '';
    input_excel[1][13] = coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name ? coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[4].name : '';
    input_excel[1][14] = coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name ? coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[5].name : '';
    input_excel[1][14] = coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[0].name ? coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components[5].name : '';

    writeExcel(filePath, input_excel); // Сохранение после каждой итерации

    // for (; i < input_excel.length; i++) {
    //     if (!input_excel[i][6]) { // Проверка, если координаты уже есть
    //         const address = input_excel[i][4];
    //         console.log(`Получение координат для: ${address}`);
    //         const coordinates = await feo(address);
    //         console.log(coordinates.GeoObject.Point.pos.split(' ').reverse());
    //         // console.log(coordinates.GeoObject.uri);
    //         console.log(coordinates.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components);
    //         // if (coordinates) {
    //         //     input_excel[i][6] = coordinates.split(',')[0];
    //         //     input_excel[i][7] = coordinates.split(',')[1];
    //         //     writeExcel(filePath, input_excel); // Сохранение после каждой итерации
    //         //     console.log(`Координаты для ${address}: ${coordinates}`);
    //         // } else {
    //         //     console.log(`Не удалось получить координаты для ${address}`);
    //         // }
    //     }
    // }
};

// Путь к вашему Excel файлу
const filePath = 'input.xlsx';
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



async function feo(address) {
    return {
        GeoObject: {
            metaDataProperty: {
                GeocoderMetaData: {
                    precision: "exact",
                    text: "1, Мухаммед Бин Рашид бульвар, Даунтаун Дубай, эмират Дубай, Объединенные Арабские Эмираты",
                    kind: "house",
                    Address: {
                        country_code: "AE",
                        formatted: "1, Мухаммед Бин Рашид бульвар, Даунтаун Дубай, эмират Дубай, Объединенные Арабские Эмираты",
                        Components: [
                            {
                                kind: "country",
                                name: "Объединенные Арабские Эмираты"
                            },
                            {
                                kind: "province",
                                name: "эмират Дубай"
                            },
                            {
                                kind: "area",
                                name: "Сектор 3"
                            },
                            {
                                kind: "district",
                                name: "Даунтаун Дубай"
                            },
                            {
                                kind: "district",
                                name: "Даунтаун Дубай"
                            },
                            {
                                kind: "street",
                                name: "Мухаммед Бин Рашид бульвар"
                            },
                            {
                                kind: "house",
                                name: "1"
                            }
                        ]
                    },
                    AddressDetails: {
                        Country: {
                            AddressLine: "1, Мухаммед Бин Рашид бульвар, Даунтаун Дубай, эмират Дубай, Объединенные Арабские Эмираты",
                            CountryNameCode: "AE",
                            CountryName: "Объединенные Арабские Эмираты",
                            AdministrativeArea: {
                                AdministrativeAreaName: "эмират Дубай",
                                SubAdministrativeArea: {
                                    SubAdministrativeAreaName: "Сектор 3",
                                    Locality: {
                                        DependentLocality: {
                                            DependentLocalityName: "Даунтаун Дубай",
                                            DependentLocality: {
                                                DependentLocalityName: "Даунтаун Дубай",
                                                Thoroughfare: {
                                                    ThoroughfareName: "Мухаммед Бин Рашид бульвар",
                                                    Premise: {
                                                        PremiseNumber: "1"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            name: "1, Мухаммед Бин Рашид бульвар",
            description: "Даунтаун Дубай, эмират Дубай, Объединенные Арабские Эмираты",
            boundedBy: {
                Envelope: {
                    lowerCorner: "55.270141 25.193445",
                    upperCorner: "55.278352 25.200915"
                }
            },
            uri: "ymapsbm1://geo?data=CgoyMTE3NTQxODgxEocB2KfZhNil2YXYp9ix2KfYqiDYp9mE2LnYsdio2YrYqSDYp9mE2YXYqtit2K_YqSwg2KXZhdin2LHYqSDYr9io2YosINmI2LPYtyDZhdiv2YrZhtipINiv2KjZiiwg2KjZiNmE2YrZgdin2LHYryDZhdit2YXYryDYqNmGINix2KfYtNivLCAxIgoN1BhdQhXVk8lB",
            Point: {
                pos: "55.274247 25.19718"
            }
        }
    }
}