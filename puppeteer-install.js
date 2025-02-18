const puppeteer = require('puppeteer');

puppeteer.launch().then(browser => {
  console.log('Chromium descargado correctamente');
  return browser.close();
}).catch(error => {
  console.error('Error al descargar Chromium:', error);
});