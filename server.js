const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'office-data.json');
const PUBLIC_DIR = __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ orders: [] }, null, 2));

function readDb() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { orders: [] }; } }
function writeDb(db) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, DATA_FILE); }
function json(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(obj)); }
function readBody(req, max = 2 * 1024 * 1024) { return new Promise((resolve, reject) => { let data = ''; req.on('data', chunk => { data += chunk; if (data.length > max) { reject(new Error('Request too large')); req.destroy(); } }); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
function clean(v, max = 1500) { return String(v ?? '').trim().slice(0, max); }
function num(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; }
function newOrder(body) {
  const customer = clean(body.customer, 100), service = clean(body.service, 120);
  if (!customer || !service) throw new Error('Customer name and service are required.');
  const price = num(body.price), advance = num(body.advance);
  if (advance > price && price > 0) throw new Error('Advance cannot be greater than the total price.');
  const now = new Date().toISOString();
  return { id: 'BG-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase(), createdAt: now, updatedAt: now,
    customer, phone: clean(body.phone, 25), service, width: clean(body.width, 20), height: clean(body.height, 20), unit: clean(body.unit, 20), quantity: Math.max(1, Math.floor(num(body.quantity, 1))), price, paid: advance,
    payments: advance > 0 ? [{ date: now, amount: advance, method: 'Advance', note: 'Initial advance' }] : [], status: 'New', dueDate: clean(body.dueDate, 20), notes: clean(body.notes, 1500), collection: clean(body.collection, 100) };
}
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml' };
async function handle(req, res) {
  const base = `http://${req.headers.host || 'localhost'}`;
  let url; try { url = new URL(req.url, base); } catch { return json(res, 400, { error: 'Invalid URL' }); }
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, app: 'Bala Graphics Office App' });
  if (url.pathname === '/api/orders' && req.method === 'GET') return json(res, 200, { orders: readDb().orders.sort((a,b) => b.createdAt.localeCompare(a.createdAt)) });
  if (url.pathname === '/api/orders' && req.method === 'POST') {
    try { const body = await readBody(req); const order = newOrder(body); const db = readDb(); db.orders.push(order); writeDb(db); return json(res, 201, { order }); }
    catch (e) { return json(res, 400, { error: e.message }); }
  }
  const payMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/payments$/);
  if (payMatch && req.method === 'POST') {
    try { const body = await readBody(req); const db = readDb(); const order = db.orders.find(o => o.id === decodeURIComponent(payMatch[1])); if (!order) return json(res, 404, { error: 'Order not found' });
      const amount = num(body.amount); if (amount <= 0) return json(res, 400, { error: 'Enter a payment amount greater than zero.' });
      if (amount > Math.max(0, order.price - order.paid) + 0.005) return json(res, 400, { error: 'Payment is greater than the outstanding balance.' });
      const payment = { date: new Date().toISOString(), amount, method: clean(body.method, 40), note: clean(body.note, 150) }; order.payments = order.payments || []; order.payments.push(payment); order.paid = Math.round((Number(order.paid || 0) + amount) * 100) / 100; order.updatedAt = payment.date; writeDb(db); return json(res, 200, { order, payment });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (orderMatch && req.method === 'PATCH') {
    try { const body = await readBody(req); const db = readDb(); const order = db.orders.find(o => o.id === decodeURIComponent(orderMatch[1])); if (!order) return json(res, 404, { error: 'Order not found' });
      if (body.status !== undefined) { const allowed = ['New','Designing','Waiting for approval','Approved','Printing','Ready for pickup','Delivered','Cancelled']; if (!allowed.includes(body.status)) return json(res, 400, { error: 'Invalid status.' }); order.status = body.status; }
      order.updatedAt = new Date().toISOString(); writeDb(db); return json(res, 200, { order });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  if (url.pathname === '/api/backup' && req.method === 'GET') return json(res, 200, readDb());
  if (url.pathname === '/api/backup' && req.method === 'POST') {
    try { const body = await readBody(req, 10 * 1024 * 1024); if (!body || !Array.isArray(body.orders)) return json(res, 400, { error: 'Backup must contain an orders array.' });
      for (const o of body.orders) { if (!o.id || !o.customer || !o.service || !Array.isArray(o.payments || [])) return json(res, 400, { error: 'Backup contains an invalid order.' }); }
      writeDb({ orders: body.orders }); return json(res, 200, { ok: true, count: body.orders.length });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  if (url.pathname === '/api/generate-design' && req.method === 'POST') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return json(res, 503, { error: 'AI image generation is not configured yet. Add your OpenAI API key to the environment and restart the app. The rest of the office app works without it.' });
    try {
      const body = await readBody(req, 100000);
      const prompt = clean(body.prompt, 1500); if (!prompt) return json(res, 400, { error: 'Please describe the design first.' });
      const style = clean(body.style, 100), exact = clean(body.text, 250), size = ['1536x1024','1024x1024','1024x1536'].includes(body.size) ? body.size : '1536x1024';
      const fullPrompt = `Create an original professional print design concept for Bala Graphics. Design type: ${clean(body.designType,100)}. Visual style: ${style}. Brief: ${prompt}. ${exact ? `Include this exact text if possible: ${exact}.` : ''} Use a strong composition, crisp details, high contrast and clean margins. Do not add watermarks. If exact lettering is unreliable, keep the text area clean for manual typesetting. This is a concept preview, not guaranteed print-ready artwork.`;
      const response = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1', prompt: fullPrompt, size, quality: 'high', output_format: 'png' }) });
      const data = await response.json(); if (!response.ok) return json(res, response.status, { error: data.error?.message || 'OpenAI image generation failed.' });
      const item = data.data?.[0]; if (!item?.b64_json) return json(res, 502, { error: 'Image service returned no image. Try again.' });
      return json(res, 200, { image: `data:image/png;base64,${item.b64_json}` });
    } catch (e) { return json(res, 500, { error: e.message || 'Image generation failed.' }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 404, { error: 'Not found' });
  let pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const full = path.resolve(PUBLIC_DIR, '.' + pathname);
  if (!full.startsWith(PUBLIC_DIR + path.sep) && full !== path.join(PUBLIC_DIR, 'index.html')) return json(res, 403, { error: 'Forbidden' });
  fs.stat(full, (err, st) => { if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('File not found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(full).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); if (req.method === 'HEAD') return res.end(); fs.createReadStream(full).pipe(res);
  });
}
const server = http.createServer((req,res) => { handle(req,res).catch(e => { if (!res.headersSent) json(res,500,{error:'Server error'}); else res.end(); console.error(e); }); });
server.listen(PORT, HOST, () => {
 console.log(`\nBala Graphics Office App running at http://localhost:${PORT}`);
 const nets = os.networkInterfaces(); for (const list of Object.values(nets)) for (const net of list || []) if (net.family === 'IPv4' && !net.internal) console.log(`Phone on same Wi-Fi: http://${net.address}:${PORT}`);
 console.log('Keep this terminal open while using the app. Press Ctrl+C to stop.\n');
});
