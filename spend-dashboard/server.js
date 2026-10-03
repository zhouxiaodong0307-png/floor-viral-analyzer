const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 10000;
const dbUrl = process.env.DATABASE_URL;
const memoryStore = new Map();

const pool = dbUrl ? new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
}) : null;

app.use(express.json({ limit: '12mb' }));
app.disable('x-powered-by');
app.use((req,res,next)=>{
  res.setHeader('Cache-Control', req.path.startsWith('/api/') ? 'no-store' : 'public, max-age=120');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.path.startsWith('/api/')){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.setHeader('Access-Control-Allow-Methods','GET,PUT,OPTIONS');
    if(req.method==='OPTIONS') return res.sendStatus(204);
  }
  next();
});

async function ensureTable(){
  if(!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS spend_sync (
    space_id TEXT PRIMARY KEY,
    blob TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

app.get('/api/health', async (_req,res)=>{
  try { if(pool) await pool.query('SELECT 1'); res.json({ok:true,version:'1.2.0',storage:pool?'postgres':'memory'}); }
  catch(e){ res.status(503).json({ok:false}); }
});

app.get('/api/sync/:space', async (req,res)=>{
  const space = String(req.params.space||'');
  if(!/^[a-f0-9]{64}$/i.test(space)) return res.status(400).json({error:'invalid space'});
  try{
    if(!pool){const v=memoryStore.get(space);if(!v)return res.status(404).json({error:'not found'});return res.json(v)}
    const q = await pool.query('SELECT blob, updated_at FROM spend_sync WHERE space_id=$1',[space]);
    if(!q.rowCount) return res.status(404).json({error:'not found'});
    res.json({blob:q.rows[0].blob,updatedAt:q.rows[0].updated_at});
  }catch(e){ res.status(500).json({error:'read failed'}); }
});

app.put('/api/sync/:space', async (req,res)=>{
  const space = String(req.params.space||'');
  const blob = req.body && req.body.blob;
  if(!/^[a-f0-9]{64}$/i.test(space)) return res.status(400).json({error:'invalid space'});
  if(typeof blob !== 'string' || blob.length < 16 || blob.length > 11_000_000) return res.status(400).json({error:'invalid blob'});
  try{
    if(!pool){const v={blob,updatedAt:new Date().toISOString()};memoryStore.set(space,v);return res.json({ok:true,updatedAt:v.updatedAt})}
    const q = await pool.query(`INSERT INTO spend_sync(space_id,blob,updated_at) VALUES($1,$2,NOW())
      ON CONFLICT(space_id) DO UPDATE SET blob=EXCLUDED.blob,updated_at=NOW()
      RETURNING updated_at`,[space,blob]);
    res.json({ok:true,updatedAt:q.rows[0].updated_at});
  }catch(e){ res.status(500).json({error:'write failed'}); }
});

app.use(express.static(path.join(__dirname,'public'), { extensions:['html'] }));
app.get('*', (_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

ensureTable().then(()=>{
  app.listen(port, '0.0.0.0', ()=>console.log(`spend-dashboard listening on ${port}`));
}).catch(err=>{ console.error(err); process.exit(1); });
