import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {initial,transition} from './core.js';
import {canonical,copy,hash,keys,identifier,topology,validateCommand} from './schema.js';
export class Store{
 constructor(path,{sessionId=null,maxEvents=5000}={}){
  if(typeof path!=='string'||!path)throw Error('Explicit durable database path or test :memory: required');
  if(!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>50000)throw Error('Invalid event budget');this.maxEvents=maxEvents;
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS root(id INTEGER PRIMARY KEY CHECK(id=1),config TEXT NOT NULL,seal TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS events(tick INTEGER PRIMARY KEY,event_id TEXT UNIQUE NOT NULL,command TEXT NOT NULL,event TEXT NOT NULL,state_hash TEXT NOT NULL);
   CREATE TRIGGER IF NOT EXISTS no_event_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'append-only'); END;
   CREATE TRIGGER IF NOT EXISTS no_event_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'append-only'); END;
   CREATE TRIGGER IF NOT EXISTS no_root_update BEFORE UPDATE ON root BEGIN SELECT RAISE(ABORT,'immutable root'); END;
   CREATE TRIGGER IF NOT EXISTS no_root_delete BEFORE DELETE ON root BEGIN SELECT RAISE(ABORT,'immutable root'); END;`);
  let row=this.db.prepare('SELECT * FROM root WHERE id=1').get();
  if(!row){const config={schema:'scandoc-session-root/1',session_id:identifier(sessionId||randomUUID()),topology_hash:hash('topology',topology()),nativeGate:'CLOSED'};this.db.prepare('INSERT INTO root VALUES(1,?,?)').run(canonical(config),hash('session-root',config));row=this.db.prepare('SELECT * FROM root WHERE id=1').get();}
  this.config=JSON.parse(row.config);keys(this.config,['schema','session_id','topology_hash','nativeGate']);
  if(this.config.schema!=='scandoc-session-root/1'||this.config.nativeGate!=='CLOSED'||row.seal!==hash('session-root',this.config)||this.config.topology_hash!==hash('topology',topology())||sessionId&&sessionId!==this.config.session_id)throw Error('Persistent root mismatch');
  this.replay();
 }
 replay(){
  let state=initial(this.config.session_id);const rows=this.db.prepare('SELECT * FROM events ORDER BY tick').all();if(rows.length>this.maxEvents)throw Error('Stored event budget exceeded');
  for(const row of rows){const command=JSON.parse(row.command);if(command.event_id!==row.event_id||row.tick!==state.tick+1)throw Error('Journal ordering/identity corruption');const next=transition(state,command);if(canonical(next.event)!==row.event||hash('state',next.state)!==row.state_hash)throw Error('Journal hash or replay corruption');state=next.state;}
  this.state=state;return copy(state);
 }
 refresh(){const head=this.db.prepare('SELECT MAX(tick) AS tick FROM events').get().tick||0;if(head!==this.state.tick)this.replay();}
 getState(){this.refresh();return copy(this.state);}
 execute(raw){
  const command=validateCommand(raw);this.db.exec('BEGIN IMMEDIATE');
  try{
   this.refresh();const previous=this.db.prepare('SELECT command,event FROM events WHERE event_id=?').get(command.event_id);
   if(previous){if(previous.command!==canonical(command))throw Error('Idempotency identity reused with altered command');this.db.exec('COMMIT');return {state:copy(this.state),event:JSON.parse(previous.event),duplicate:true};}
   if(this.state.tick>=this.maxEvents)throw Error('Event budget reached; source operator must review capacity');
   const next=transition(this.state,command);this.db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(next.state.tick,command.event_id,canonical(command),canonical(next.event),hash('state',next.state));
   this.db.exec('COMMIT');this.state=next.state;return {...copy(next),duplicate:false};
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 events(after=0,limit=100){if(!Number.isSafeInteger(after)||after<0||!Number.isInteger(limit)||limit<1||limit>200)throw Error('Invalid recorded history cursor');return this.db.prepare('SELECT event FROM events WHERE tick>? ORDER BY tick LIMIT ?').all(after,limit).map(r=>JSON.parse(r.event));}
 close(){this.db.close();}
}
