const ExcelJS = require('exceljs');
console.log('Keys:', Object.keys(ExcelJS));
console.log('Type of Workbook:', typeof ExcelJS.Workbook);
console.log('Is it default?', ExcelJS.default ? 'Yes' : 'No');
