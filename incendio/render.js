const {chromium}=require('playwright'); const http=require('http'); const fs=require('fs'); const path=require('path');
const root=__dirname; const types={'.html':'text/html','.js':'text/javascript','.json':'application/json'};
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0])); fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;} r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}); r.end(d);});});
let [,,mode,a,b,outDir]=process.argv; if(mode==='stills') outDir=b;
srv.listen(0,async()=>{
  const port=srv.address().port;
  const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const VERT=!!process.env.VERT; const pg=await br.newPage({viewport:VERT?{width:720,height:1280}:{width:1280,height:720}});
  pg.on('console',m=>console.log('PAGE',m.text())); pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.goto(`http://localhost:${port}/index.html?${VERT ? 'vertical=1&' : ''}${process.env.NOCAP ? 'nocap=1&' : ''}${process.env.NOTITLE ? 'notitle=1' : ''}`); await pg.waitForFunction(()=>window.READY,null,{timeout:60000});
  const fps=await pg.evaluate(()=>window.FPS), total=await pg.evaluate(()=>window.TOTAL);
  fs.mkdirSync(outDir,{recursive:true});
  if(mode==='stills'){ for(const t of a.split(',').map(Number)){ await pg.evaluate(t=>window.renderFrame(t),t); await pg.screenshot({path:`${outDir}/t${t.toFixed(1)}.jpg`,quality:85}); console.log('still',t);} }
  else { const f0=+a, f1=Math.min(+b, Math.floor(total*fps)); const t0=Date.now();
    for(let f=f0;f<f1;f++){ await pg.evaluate(t=>window.renderFrame(t),f/fps); await pg.screenshot({path:`${outDir}/f${String(f).padStart(5,'0')}.jpg`,quality:92}); if(f%60==0) console.log('frame',f,((Date.now()-t0)/(f-f0+1)).toFixed(0)+'ms/f'); } }
  await br.close(); srv.close();
});
