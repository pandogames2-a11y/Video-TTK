// node render.js stills t1,t2 outDir      → JPEGs de teste
// node render.js video f0 f1 out.mp4      → quadros [f0,f1) direto para o ffmpeg (sem salvar JPEGs em disco)
const {chromium} = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path'); const {spawn} = require('child_process');
const root = __dirname; const types = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg'};
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}); r.end(d); }); });
const [, , mode, a, b, out] = process.argv;
srv.listen(0, async () => {
  const br = await chromium.launch(); const pg = await br.newPage({viewport: {width: 1920, height: 1080}});
  pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html`); await pg.waitForFunction(() => window.READY, null, {timeout: 60000});
  const fps = await pg.evaluate(() => window.FPS), total = await pg.evaluate(() => window.TOTAL);
  if (mode === 'stills') { fs.mkdirSync(b, {recursive: true});
    for (const t of a.split(',').map(Number)) { const d = await pg.evaluate(async t => await window.frameJPEG(t, 0.85), t); fs.writeFileSync(`${b}/t${t.toFixed(1)}.jpg`, Buffer.from(d.split(',')[1], 'base64')); } }
  else {
    const f0 = +a, f1 = Math.min(+b, Math.ceil(total * fps));
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-threads', '1', out], {stdio: ['pipe', 'inherit', 'inherit']});
    const t0 = Date.now();
    for (let f = f0; f < f1; f += 15) {
      const ds = await pg.evaluate(async ([f, n, fps]) => { const o = []; for (let i = 0; i < n; i++) o.push(await window.frameJPEG((f + i) / fps, 0.92)); return o; }, [f, Math.min(15, f1 - f), fps]);
      for (const d of ds) { if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r)); }
      if ((f - f0) % 900 === 0) console.log(out, 'frame', f, '/', f1, ((Date.now() - t0) / (f - f0 + 15)).toFixed(0) + 'ms/f');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await br.close(); srv.close();
});
