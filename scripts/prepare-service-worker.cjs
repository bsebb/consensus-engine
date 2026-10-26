// Precache the actual hashed production chunks, including on a user's first visit.
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const dist = path.resolve(__dirname, '../client/dist');
const assets = fs.readdirSync(path.join(dist,'assets')).filter(name => fs.statSync(path.join(dist,'assets',name)).isFile()).map(name=>`/assets/${name}`).sort();
if (!assets.length) throw new Error('No production assets found for service-worker precaching');
const buildId = crypto.createHash('sha256').update(JSON.stringify(assets)).update(fs.readFileSync(path.join(dist,'index.html'))).update(fs.readFileSync(path.join(dist,'theme-init.js'))).digest('hex').slice(0,16);
let source = fs.readFileSync(path.join(dist,'sw.js'),'utf8');
source = source.replace("'noyoupick-pwa-v47'", `'noyoupick-pwa-${buildId}'`).replace('const BUILD_ASSETS = [];',`const BUILD_ASSETS = ${JSON.stringify(assets)};`);
fs.writeFileSync(path.join(dist,'sw.js'),source);
console.log(`Prepared offline cache for ${assets.length} production assets`);
