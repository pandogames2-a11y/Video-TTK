// Modern title hook: the words drop in one by one with a spring, a short RGB split, a glow, a shine sweeping across the letters,
// a thin bar growing under the text and a few sparkles; it shrinks away (with a blur) when the narrator finishes the question.
// lines: [{ txt, size, colors: [top, bottom] }]; a = start time, out = when the question ends.
function titleFX(t, a, out, lines, y0 = 760) {
  const gone = out + 0.45; if (t < a || t > gone) return;
  const L = mk(), c = L.getContext('2d'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const words = []; let y = y0 - (lines.length - 1) * 66; let lastY = y;
  lines.forEach((ln, li) => {
    c.font = `900 ${ln.size}px "Inter Display", Inter`; const ws = ln.txt.split(' '), sp = c.measureText(' ').width;
    const tw = ws.reduce((s, w) => s + c.measureText(w).width, 0) + sp * (ws.length - 1); let x = SW / 2 - tw / 2;
    ws.forEach(w => { const wd = c.measureText(w).width; words.push({ w, x: x + wd / 2, y, ln }); x += wd + sp; });
    lastY = y; y += ln.size * 1.18;
  });
  const exitK = ss(out, gone, t), S = 1 - exitK;
  words.forEach((wd, i) => {
    const k = clamp((t - a - i * 0.07) / 0.32); if (k <= 0) return;
    const spring = 1 + Math.sin(k * Math.PI * 1.5) * 0.22 * (1 - k), drop = (1 - ease(k)) * -90;
    c.save(); c.translate(wd.x, wd.y + drop); c.scale(spring * (0.6 + 0.4 * k), spring * (0.6 + 0.4 * k)); c.globalAlpha = k;
    c.font = `900 ${wd.ln.size}px "Inter Display", Inter`;
    c.lineWidth = wd.ln.size * 0.2; c.strokeStyle = '#08061a'; c.strokeText(wd.w, 0, 6);   // a little drop shadow
    const gr = c.createLinearGradient(0, -wd.ln.size / 2, 0, wd.ln.size / 2); gr.addColorStop(0, wd.ln.colors[0]); gr.addColorStop(1, wd.ln.colors[1]);
    c.lineWidth = wd.ln.size * 0.16; c.strokeText(wd.w, 0, 0); c.fillStyle = gr; c.fillText(wd.w, 0, 0);
    c.restore();
  });
  // shine: a bright diagonal band that sweeps across the letters once they are in
  const shK = clamp((t - a - words.length * 0.07 - 0.25) / 0.7);
  if (shK > 0 && shK < 1) { c.save(); c.globalCompositeOperation = 'source-atop'; const sx = lerp(-300, SW + 300, shK); const g2 = c.createLinearGradient(sx - 120, 0, sx + 120, 0);
    g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, 'rgba(255,255,255,0.75)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.setTransform(1, 0, 0, 1, 0, 0); c.translate(0, 0); c.transform(1, 0, -0.35, 1, 0, 0); c.fillRect(0, 0, SW * 2, SH); c.restore(); }
  // the bar under the text
  const barK = ease(clamp((t - a - 0.25) / 0.5)), last = lines[lines.length - 1], by = lastY + last.size * 0.62;
  if (barK > 0) { const bw = 520 * barK; const g3 = c.createLinearGradient(SW / 2 - bw / 2, 0, SW / 2 + bw / 2, 0); g3.addColorStop(0, 'rgba(255,90,74,0)'); g3.addColorStop(0.5, last.colors[0]); g3.addColorStop(1, 'rgba(255,90,74,0)');
    c.fillStyle = g3; c.beginPath(); c.roundRect(SW / 2 - bw / 2, by, bw, 10, 5); c.fill(); }
  // draw to the screen: soft colored glow + a short RGB split on entry, then the text; whole block scales/blurs out at the end
  const split = (1 - clamp((t - a) / 0.35)) * 14 + exitK * 10;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  main.translate(SW / 2, y0); main.scale(S * (1 + 0.03 * Math.sin((t - a) * 2.2)), S); main.translate(-SW / 2, -y0);
  if (exitK > 0) main.filter = `blur(${exitK * 10}px)`;
  main.globalAlpha = 1 - exitK * 0.6;
  main.shadowColor = 'rgba(255,70,60,0.55)'; main.shadowBlur = 40; main.drawImage(L, 0, 0); main.shadowBlur = 0;
  if (split > 0.5) { main.globalCompositeOperation = 'screen'; main.globalAlpha = 0.5; main.filter = 'none';
    const tint = (col, dx) => { const T = mk(), tc = T.getContext('2d'); tc.drawImage(L, 0, 0); tc.globalCompositeOperation = 'source-in'; tc.fillStyle = col; tc.fillRect(0, 0, SW, SH); main.drawImage(T, dx, 0); };
    tint('#ff2a4a', -split); tint('#2ad9ff', split); main.globalCompositeOperation = 'source-over'; main.globalAlpha = 1 - exitK * 0.6; }
  main.drawImage(L, 0, 0);
  main.restore();
  // sparkles around the title
  for (let i = 0; i < 6; i++) { const k = (t - a - 0.3 - i * 0.12); if (k < 0 || k > 0.8) continue; const an = i * 1.7, r = 330 + (i % 2) * 60;
    const x = SW / 2 + Math.cos(an) * r, yy = y0 + Math.sin(an) * 170; const s = Math.sin(clamp(k / 0.8) * Math.PI) * 26 * S;
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, yy); main.rotate(k * 3); main.fillStyle = '#fff3c4'; main.beginPath();
    for (let j = 0; j < 8; j++) { const rr = j % 2 ? s * 0.3 : s, a2 = j / 8 * Math.PI * 2; main.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); } main.fill(); main.restore(); }
}
