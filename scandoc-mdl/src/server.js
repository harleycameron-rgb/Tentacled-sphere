import http from 'node:http';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Store} from './store.js';
import {topology} from './schema.js';
import {oath} from './core.js';
export function credentials(secret){if(typeof secret!=='string'||secret.length<32)throw Error('A configured secret of at least 32 characters is required');return {operator:secret,tips:Array.from({length:8},(_,i)=>createHmac('sha256',secret).update('scandoc-tip/1:'+String(i+1)).digest('hex'))};}
function equal(a,b){if(typeof a!=='string')return false;const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);}
export function createServer({store,secret,origin}){
 const auth=credentials(secret);if(!(store instanceof Store)||typeof origin!=='string'||!/^https?:\/\//.test(origin))throw Error('Store and explicit same-origin policy required');
 const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 return http.createServer(async(req,res)=>{
  const bearer=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):'';
  const actor=equal(bearer,auth.operator)?0:auth.tips.findIndex(t=>equal(bearer,t))+1;
  if(!bearer||actor===0&&!equal(bearer,auth.operator))return send(res,401,{error:'AUTHENTICATION_REQUIRED',gate:'CLOSED'});
  if(req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'SAME_ORIGIN_REQUIRED'});
  try{
   const url=new URL(req.url,'http://local');
   if(req.method==='GET'&&url.pathname==='/api/mdl/state')return send(res,200,{authority:'PERSISTENT_SIMULATION_SERVICE',state:store.getState(),nativeGate:'CLOSED'});
   if(req.method==='GET'&&url.pathname==='/api/mdl/topology')return send(res,200,topology());
   if(req.method==='GET'&&url.pathname==='/api/mdl/events')return send(res,200,{events:store.events(Number(url.searchParams.get('after')||0)),nativeGate:'CLOSED'});
   if(req.method==='GET'&&url.pathname==='/api/mdl/oath')return send(res,200,oath(url.searchParams.get('claim')));
   if(req.method!=='POST'||url.pathname!=='/api/mdl/command')return send(res,404,{error:'NOT_FOUND'});
   if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(res,415,{error:'JSON_ONLY'});
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)return send(res,413,{error:'COMMAND_TOO_LARGE'});}
   const command=JSON.parse(raw);
   if(actor!==0&&(command.source_tentacle!==actor||!['FACE_ACTIVATE','FACE_QUALIFY','FACE_COMMIT','DECLARED_INPUT'].includes(command.event_type)))return send(res,403,{error:'CAPABILITY_DENIED'});
   return send(res,200,store.execute(command));
  }catch{return send(res,409,{error:'COMMAND_OR_STATE_REJECTED',nativeGate:'CLOSED'});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const host=process.env.SCANDOC_HOST||'127.0.0.1',port=Number(process.env.PORT||8090);
 const origin=process.env.SCANDOC_ORIGIN||`http://127.0.0.1:${port}`;
 if(host!=='127.0.0.1'&&(process.env.SCANDOC_ALLOW_REMOTE!=='1'||!origin.startsWith('https://')))throw Error('Remote hosting requires explicit HTTPS origin and deployment approval/configuration');
 credentials(process.env.SCANDOC_OPERATOR_TOKEN);
 if(!process.env.SCANDOC_DB_PATH||host!=='127.0.0.1'&&process.env.SCANDOC_DB_PATH===':memory:')throw Error('Explicit durable database required for remote service');
 const store=new Store(process.env.SCANDOC_DB_PATH),server=createServer({store,secret:process.env.SCANDOC_OPERATOR_TOKEN,origin});server.listen(port,host,()=>console.log('Authenticated SCANDOC simulation service listening; native gate CLOSED'));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
}
