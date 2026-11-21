const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
for(const o of ['a','b','c','d']){await p.goto('file://'+__dirname+'/personagens.html?o='+o);await p.waitForFunction('window.READY');await p.waitForTimeout(300);
await p.screenshot({path:__dirname+`/personagem_${o}.jpg`,quality:85});}
await b.close();})();
