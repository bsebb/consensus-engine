// Local-only static-host rehearsal with the real deployment headers and same-origin API proxy.
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const backend = new URL(process.env.TEST_BACKEND_URL);
if (!['127.0.0.1','localhost'].includes(backend.hostname)) throw new Error('Only a local test backend is permitted');
const root = path.resolve(__dirname, '../../client/dist');
const config = require('../../client/vercel.json');
const contentTypes = { '.js':'application/javascript', '.css':'text/css', '.html':'text/html', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const server = http.createServer((req,res) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/socket.io/')) {
    const proxy = http.request(new URL(req.url,backend),{method:req.method,headers:req.headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res)});
    proxy.on('error',()=>{res.writeHead(502);res.end()});req.pipe(proxy);return;
  }
  const url = new URL(req.url,'http://localhost');
  const target = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403);res.end();return; }
  let file = target;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file=path.join(root,'index.html');
  for (const h of config.headers[0].headers) res.setHeader(h.key,h.value);
  res.setHeader('content-type',contentTypes[path.extname(file)]||'application/octet-stream');
  res.setHeader('cache-control',url.pathname==='/sw.js'?'no-cache':url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache');
  if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);
});
server.on('upgrade',(req,socket,head)=>{
 const proxy=http.request(new URL(req.url,backend),{headers:req.headers});
 proxy.on('upgrade',(response,upstream,upstreamHead)=>{
  socket.write(`HTTP/1.1 ${response.statusCode} Switching Protocols\r\n`);
  for(const [key,value] of Object.entries(response.headers))socket.write(`${key}: ${value}\r\n`);
  socket.write('\r\n');if(upstreamHead.length)socket.write(upstreamHead);if(head.length)upstream.write(head);
  socket.pipe(upstream);upstream.pipe(socket);upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());
 });proxy.on('error',()=>socket.destroy());proxy.end();
});
server.listen(Number(process.env.TEST_FRONTEND_PORT)||0,'127.0.0.1',()=>process.send?.({url:`http://127.0.0.1:${server.address().port}`}));
