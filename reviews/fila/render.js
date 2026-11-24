// node render.js stills 1,5,9 outDir   |   node render.js frames A B outDir
const { chromium } = require('playwright');
const [, , mode, a, b, outDir] = process.argv;
(async () => {
  const br = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto('file://' + __dirname + '/index.html'); await pg.waitForFunction('window.READY');
  const fs = require('fs');
  if (mode === 'stills') { fs.mkdirSync(b, { recursive: true }); for (const t of a.split(',').map(Number)) { await pg.evaluate(t => window.renderFrame(t), t); await pg.screenshot({ path: `${b}/t${t.toFixed(2)}.jpg`, quality: 85 }); } }
  else { fs.mkdirSync(outDir, { recursive: true }); for (let f = +a; f < +b; f++) { await pg.evaluate(t => window.renderFrame(t), f / 30); await pg.screenshot({ path: `${outDir}/f${String(f).padStart(5, '0')}.jpg`, quality: 90 }); } }
  await br.close();
})();
