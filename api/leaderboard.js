/* Math Quest Island — world leaderboard API (Vercel serverless function).
   Storage: Upstash Redis via REST (works with Vercel KV / Upstash marketplace
   integration — reads either env-var naming scheme). Returns 503 until the
   Redis integration is connected, which the game handles gracefully. */

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'mqi:lb';
const BAD = ['fuck','shit','bitch','cunt','dick','cock','nigg','fag','slut','whore','asshole'];

async function redis(cmd){
  const r = await fetch(RURL, {
    method:'POST',
    headers:{ Authorization:'Bearer '+RTOKEN, 'Content-Type':'application/json' },
    body: JSON.stringify(cmd)
  });
  if(!r.ok) throw new Error('redis '+r.status);
  return r.json();
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(!RURL || !RTOKEN) return res.status(503).json({ error:'leaderboard not configured yet' });

  try{
    if(req.method==='GET'){
      const out = await redis(['ZRANGE', KEY, '0', '19', 'WITHSCORES']);
      const arr = out.result || [];
      const rows = [];
      for(let i=0; i<arr.length; i+=2){
        try{ const m = JSON.parse(arr[i]); m.ms = parseInt(arr[i+1],10); rows.push(m); }catch(e){}
      }
      res.setHeader('Cache-Control','s-maxage=15, stale-while-revalidate=60');
      return res.status(200).json({ rows });
    }

    if(req.method==='POST'){
      let b = req.body;
      if(typeof b==='string'){ try{ b=JSON.parse(b); }catch(e){ b={}; } }
      b = b || {};
      let name = String(b.name||'').replace(/[^\w \-]/g,'').trim().slice(0,14) || 'Hero';
      if(BAD.some(w=>name.toLowerCase().includes(w))) name = 'Hero';
      const avatar = String(b.avatar||'🦄').slice(0,8);
      const topic = String(b.topic||'').replace(/[^\w]/g,'').slice(0,20);
      const ms = Math.round(Number(b.ms));
      const acc = Math.max(0, Math.min(100, Math.round(Number(b.acc)||0)));
      const timed = !!b.timed;
      /* sanity window: a real 6-monster win takes minutes, not seconds */
      if(!Number.isFinite(ms) || ms < 45000 || ms > 10800000)
        return res.status(400).json({ error:'invalid time' });
      const member = JSON.stringify({ name, avatar, topic, acc, timed, t: Date.now() });
      await redis(['ZADD', KEY, String(ms), member]);
      await redis(['ZREMRANGEBYRANK', KEY, '100', '-1']); // keep top 100
      return res.status(200).json({ ok:true });
    }

    return res.status(405).json({ error:'method not allowed' });
  }catch(e){
    return res.status(500).json({ error:'storage error' });
  }
}
