const { fork, execFileSync } = require('node:child_process'); const { randomUUID } = require('node:crypto');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const net = require('node:net');
const assert = require('node:assert/strict'); const { io } = require('../client/node_modules/socket.io-client');
const { Client } = require('../server/node_modules/pg');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function event(socket,name,timeout=10000){return new Promise((resolve,reject)=>{const t=setTimeout(()=>{socket.off(name,fn);reject(new Error(`Missing ${name}`))},timeout);function fn(d){clearTimeout(t);resolve(d)}socket.once(name,fn)})}
(async()=>{
 const {default:EmbeddedPostgres}=await import(process.env.EMBEDDED_POSTGRES_MODULE||'embedded-postgres');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'consensus-outage-test-'));
 const temporary=net.createServer();await new Promise(r=>temporary.listen(0,'127.0.0.1',r));const port=temporary.address().port;await new Promise(r=>temporary.close(r));
 const password=randomUUID();const databaseUrl=`postgresql://outage_test:${password}@127.0.0.1:${port}/consensus_outage_test`;
 const pg=new EmbeddedPostgres({databaseDir:path.join(dir,'data'),user:'outage_test',password,port,persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
 let worker;let logs='';const sockets=[];const checks=[];
 try{
  await pg.initialise();await pg.start();await pg.createDatabase('consensus_outage_test');
  execFileSync(path.resolve(__dirname,'../server/node_modules/.bin/prisma'),['migrate','deploy','--schema',path.resolve(__dirname,'../server/prisma/schema.prisma')],{env:{...process.env,DATABASE_URL:databaseUrl},stdio:'pipe'});
  worker=fork(path.resolve(__dirname,'../server/test-support/clusterChild.js'),[],{execArgv:[],env:{...process.env,TEST_DATABASE_URL:databaseUrl,TEST_RATE_LIMIT_NAMESPACE:`outage-${randomUUID()}`},stdio:['ignore','pipe','pipe','ipc']});
  worker.stdout.on('data',b=>{logs=(logs+b).slice(-5000)});worker.stderr.on('data',b=>{logs=(logs+b).slice(-5000)});
  const ready=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Worker startup timed out')),10000);worker.once('message',m=>{clearTimeout(t);resolve(m)})});
  const host={id:randomUUID(),device_id:`v2_${randomUUID()}`},guest={id:randomUUID(),device_id:`v2_${randomUUID()}`};
  const response=await fetch(`${ready.url}/api/v1/rooms`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host_id:host.id,device_id:host.device_id,mode:'CUSTOM',theme:'Database outage test',radius:5000})});assert.equal(response.status,201);const room=await response.json();
  for(const person of [host,guest]){
   person.socket=io(ready.url,{transports:['websocket'],reconnection:false});sockets.push(person.socket);await event(person.socket,'connect');
   const joined=event(person.socket,'lobby_state');person.socket.emit('join_lobby',{pin:room.pin,participant_id:person.id,device_id:person.device_id,...(person===host?{host_token:room.host_token}:{})});await joined;
  }
  const options=[{id:randomUUID(),name:'Preferred'},{id:randomUUID(),name:'Other'}];let started=event(host.socket,'voting_started');host.socket.emit('host_start_voting',{pin:room.pin,host_id:host.id,options});await started;
  const votes=options.map((o,i)=>({option_id:o.id,score:i?-1:1}));let progress=event(host.socket,'vote_progress');host.socket.emit('submit_ballot',{pin:room.pin,participant_id:host.id,rankings:votes});assert.equal((await progress).voted_participants,1);
  let winners=0;host.socket.on('winner_announced',()=>winners++);
  await pg.stop();
  const health=await fetch(`${ready.url}/ready`,{signal:AbortSignal.timeout(10000)});assert.equal(health.status,503);checks.push('readiness returns 503 while PostgreSQL is stopped');
  const failure=event(guest.socket,'ballot_error');guest.socket.emit('submit_ballot',{pin:room.pin,participant_id:guest.id,rankings:votes});assert.equal((await failure).code,'STATE_UNAVAILABLE');assert.equal(winners,0);checks.push('a ballot during the database outage fails closed without announcing a winner');
  await pg.start();const deadline=Date.now()+15000;
  while(true){try{if((await fetch(`${ready.url}/ready`)).status===200)break}catch{}if(Date.now()>deadline)throw new Error('Database subscription did not recover');await wait(150)}
  const outcome=event(host.socket,'winner_announced');guest.socket.emit('submit_ballot',{pin:room.pin,participant_id:guest.id,rankings:votes});const winner=await outcome;assert.equal(winner.winningOptionId,options[0].id);assert.equal(winner.total_voted,2);
  const client=new Client({connectionString:databaseUrl});await client.connect();assert.equal((await client.query('SELECT count(*)::int AS count FROM votes')).rows[0].count,4);await client.end();
  checks.push('database reconnect restores the saved ballot and accepts the retry exactly once');
  const result={checks,failures:[]};console.log(JSON.stringify(result,null,2));fs.writeFileSync(process.env.AUDIT_OUTAGE_OUTPUT||'/private/tmp/consensus-database-outage.json',JSON.stringify(result,null,2)+'\n');
 }catch(error){console.error('Outage worker evidence:',logs);throw error;}finally{
  sockets.forEach(s=>s.disconnect());if(worker&&worker.exitCode===null&&!worker.signalCode)await new Promise(r=>{worker.once('exit',r);worker.kill('SIGKILL')});
  await pg.stop().catch(()=>{});fs.rmSync(dir,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
