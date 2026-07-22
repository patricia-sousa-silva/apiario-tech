const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const htmlPath = path.join(__dirname, 'docs', 'apresentacao-apiario-tech.html');
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  
  const outputPath = path.join(__dirname, 'docs', 'Apiario-Tech-Apresentacao.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;text-align:center;font-size:8pt;color:#999;padding:0 20mm;">Apiário Tech — Confidencial | Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>'
  });
  
  await browser.close();
  console.log(`PDF gerado: ${outputPath}`);
})();
