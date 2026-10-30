/* Math Quest Island — results API (Vercel serverless function), 2026-10-24.
   Each device queues a compact summary of every finished quest / paper (maths and
   science) and posts it here; the parent page (parent.html) reads them back.
   Storage: Upstash Redis via REST, same helper and env vars as api/leaderboard.js.
   Returns 503 until the Redis integration is connected; devices keep their queue.

   POST { results: [ ... ] }  no auth: strict validation + size/batch caps are the defence.
   GET                        needs the parent key in the X-Parent-Key header.
   2026-10-24 (miss detail): a mock paper may carry review: [{ n, topic, q, given, answer,
   correct, skipped }], one entry per question, so the parent page can list the misses.
   The field is optional. A malformed entry is dropped on its own (the paper's score row is
   kept); a review that is not an array is dropped; more than MAX_REVIEW entries keep the
   first MAX_REVIEW.
   Optional per row: marks (1-10), secs (time on the question), changed (answer changes),
   options (MCQ option text, 2-6, each <= 40 chars). Optional per paper: timeLimitSec,
   ended ('submit' | 'timeout'). A bad optional value drops that field only.
   2026-10-25: a quest (science practice / Power-Up) may carry the same review, one row per
   question reached, plus optional got (marks scored, halves allowed, <= marks), first (the
   first-try MCQ pick), hintsShown (0-5 hint rungs seen) and hints (their text, <= 3 x 200).
   2026-10-30 (replay keys): a mock paper may carry variant ('quick' | 'full' | 'long' |
   'paper1' | 'paper2'), and each review row gen ("<node>.<generator>"), seed (uint32 draw
   seed), level (pool 1-3), band (1-5) and conv (true = MCQ asked as typed), so an item can be
   redrawn exactly (js/app.js mqiSeededDraw). All optional; a bad value drops only that field.
   The repo is public, so only the SHA-256 of the parent key lives here. */
import { createHash, timingSafeEqual } from 'crypto';

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PARENT_KEY_SHA256 = '91ecc3f3ac33b606b33ba435e843d5c7ba3880d32bb13867c2845f824ffb24eb';
const HKEY = 'mqi:res:h';      // hash: id -> record JSON
const ZKEY = 'mqi:res:z';      // sorted set: id scored by endedAt (ms)
const KEEP = 5000;             // newest records kept
const MAX_BATCH = 50;
const MAX_BODY = 128 * 1024;   /* a 40-question review is ~20 KB; the client batches by size under 48 KB */
const MAX_REVIEW = 60;
const MIN_T = Date.UTC(2026, 0, 1);

async function redis(cmd){
  const r = await fetch(RURL, {
    method:'POST',
    headers:{ Authorization:'Bearer '+RTOKEN, 'Content-Type':'application/json' },
    body: JSON.stringify(cmd)
  });
  if(!r.ok) throw new Error('redis '+r.status);
  return r.json();
}

const ID_RE = /^[0-9a-z]{8,32}$/;
const GEN_RE = /^[A-Za-z0-9_$-]{1,40}\.[A-Za-z0-9_$-]{1,60}$/;
function clampStr(v, n){
  if(typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);
  return s;
}
/* review text keeps < and > (maths compares numbers); parent.html escapes everything it prints */
function clampText(v, n){
  if(typeof v !== 'string') return null;
  return v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
}
function cleanReview(a){
  if(!Array.isArray(a)) return null;
  const out = [];
  for(const x of a.slice(0, MAX_REVIEW)){
    if(!x || typeof x !== 'object' || Array.isArray(x)) continue;
    if(!Number.isInteger(x.n) || x.n < 1 || x.n > 200) continue;
    if(typeof x.correct !== 'boolean' || typeof x.skipped !== 'boolean') continue;
    const q = clampText(x.q, 240), topic = clampText(x.topic, 60);
    if(!q || topic == null) continue;
    let given = null;
    if(x.given != null){ given = clampText(x.given, 80); if(given == null) continue; }
    let answer = null;
    if(x.answer != null){ answer = clampText(x.answer, 120); if(answer == null) continue; }
    const row = { n: x.n, topic, q, given: given || null, answer: answer || null, correct: x.correct, skipped: x.skipped };
    /* optional telemetry (2026-10-24): a bad value drops only that field, never the row */
    if(Number.isInteger(x.marks) && x.marks >= 1 && x.marks <= 10) row.marks = x.marks;
    if(Number.isInteger(x.secs) && x.secs >= 0 && x.secs <= 86400) row.secs = x.secs;
    if(Number.isInteger(x.changed) && x.changed >= 0 && x.changed <= 99) row.changed = x.changed;
    if(Array.isArray(x.options) && x.options.length >= 2 && x.options.length <= 6){
      const opts = x.options.map(o => clampText(o, 40));
      if(opts.every(o => o != null)) row.options = opts;
    }
    /* practice detail (2026-10-25) */
    const got = num(x.got, 0, 10, 1);
    if(got != null && (row.marks == null || got <= row.marks)) row.got = got;
    if(x.first != null){ const f = clampText(x.first, 80); if(f) row.first = f; }
    if(Number.isInteger(x.hintsShown) && x.hintsShown >= 0 && x.hintsShown <= 5) row.hintsShown = x.hintsShown;
    if(Array.isArray(x.hints) && x.hints.length >= 1 && x.hints.length <= 3){
      const hs = x.hints.map(s => clampText(s, 200));
      if(hs.every(s => s)) row.hints = hs;
    }
    /* replay keys (2026-10-30) */
    if(typeof x.gen === 'string' && GEN_RE.test(x.gen)) row.gen = x.gen;
    if(Number.isInteger(x.seed) && x.seed >= 0 && x.seed <= 4294967295) row.seed = x.seed;
    if(Number.isInteger(x.level) && x.level >= 1 && x.level <= 3) row.level = x.level;
    if(Number.isInteger(x.band) && x.band >= 1 && x.band <= 5) row.band = x.band;
    if(x.conv === true) row.conv = true;
    out.push(row);
  }
  return out.length ? out : null;
}
function num(v, lo, hi, dp){
  if(typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) return null;
  const f = Math.pow(10, dp||0);
  return Math.round(v * f) / f;
}

/* one record -> a clean copy, or null when it doesn't fit the shape */
export function cleanRecord(r, now){
  if(!r || typeof r !== 'object' || Array.isArray(r)) return null;
  if(typeof r.id !== 'string' || !ID_RE.test(r.id)) return null;
  if(typeof r.device !== 'string' || !ID_RE.test(r.device)) return null;
  if(r.app !== 'maths' && r.app !== 'science') return null;
  if(r.kind !== 'quest' && r.kind !== 'paper') return null;
  const total = num(r.total, 0, 1000, 1), correct = num(r.correct, 0, 1000, 1);
  if(total == null || correct == null || correct > total) return null;
  if(typeof r.endedAt !== 'string' || r.endedAt.length > 40) return null;
  const t = Date.parse(r.endedAt);
  if(!Number.isFinite(t) || t < MIN_T || t > (now || Date.now()) + 86400000) return null;
  let hintsUsed = null;
  if(r.hintsUsed != null){ hintsUsed = num(r.hintsUsed, 0, 1000, 0); if(hintsUsed == null) return null; }
  let durationSec = null;
  if(r.durationSec != null){ durationSec = num(r.durationSec, 0, 86400, 0); if(durationSec == null) return null; }
  const topics = [];
  if(r.topics != null){
    if(!Array.isArray(r.topics) || r.topics.length > 30) return null;
    for(const x of r.topics){
      if(!x || typeof x !== 'object') return null;
      const tt = clampStr(x.t, 60), n = num(x.n, 0, 1000, 1), c = num(x.c, 0, 1000, 1);
      if(!tt || n == null || c == null || c > n) return null;
      topics.push({ t: tt, c, n });
    }
  }
  const review = r.review != null ? cleanReview(r.review) : null;
  const out = {
    id: r.id, device: r.device,
    deviceLabel: clampStr(r.deviceLabel, 16) || 'Other',
    app: r.app, kind: r.kind,
    mode: (clampStr(r.mode, 16) || '').replace(/[^a-z0-9-]/gi, ''),
    topic: clampStr(r.topic, 60) || '',
    topics, correct, total, hintsUsed, durationSec,
    endedAt: new Date(t).toISOString(),
    rx: now || Date.now()
  };
  if(review) out.review = review;
  if(r.kind === 'paper'){
    if(Number.isInteger(r.timeLimitSec) && r.timeLimitSec > 0 && r.timeLimitSec <= 86400) out.timeLimitSec = r.timeLimitSec;
    if(r.ended === 'timeout' || r.ended === 'submit') out.ended = r.ended;
    if(typeof r.variant === 'string' && /^[a-z0-9-]{1,16}$/.test(r.variant)) out.variant = r.variant;
  }
  return out;
}

function keyOk(given){
  if(typeof given !== 'string' || !given || given.length > 256) return false;
  const a = createHash('sha256').update(given.trim()).digest();
  const b = Buffer.from(PARENT_KEY_SHA256, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex');
  if(!RURL || !RTOKEN) return res.status(503).json({ error:'results storage not configured yet' });

  try{
    if(req.method==='POST'){
      const len = parseInt((req.headers && req.headers['content-length']) || '0', 10);
      if(len > MAX_BODY) return res.status(413).json({ error:'too large' });
      let b = req.body;
      if(typeof b==='string'){
        if(b.length > MAX_BODY) return res.status(413).json({ error:'too large' });
        try{ b = JSON.parse(b); }catch(e){ return res.status(400).json({ error:'bad json' }); }
      }
      if(!b || typeof b!=='object' || !Array.isArray(b.results)) return res.status(400).json({ error:'expected { results: [] }' });
      if(JSON.stringify(b).length > MAX_BODY) return res.status(413).json({ error:'too large' });
      if(b.results.length > MAX_BATCH) return res.status(413).json({ error:'batch too long' });
      const now = Date.now(), seen = {}, ok = [];
      let rejected = 0;
      for(const r of b.results){
        const c = cleanRecord(r, now);
        if(!c){ rejected++; continue; }
        if(seen[c.id]) continue;
        seen[c.id] = 1; ok.push(c);
      }
      let stored = 0;
      for(const c of ok){
        const out = await redis(['HSETNX', HKEY, c.id, JSON.stringify(c)]);
        if(out && Number(out.result) === 1){
          await redis(['ZADD', ZKEY, String(Date.parse(c.endedAt)), c.id]);
          stored++;
        }
      }
      if(stored){
        const n = Number((await redis(['ZCARD', ZKEY])).result) || 0;
        if(n > KEEP){
          const old = (await redis(['ZRANGE', ZKEY, '0', String(n-KEEP-1)])).result || [];
          if(old.length){
            await redis(['ZREMRANGEBYRANK', ZKEY, '0', String(old.length-1)]);
            await redis(['HDEL', HKEY, ...old]);
          }
        }
      }
      return res.status(200).json({ ok:true, stored, duplicate: ok.length-stored, rejected });
    }

    if(req.method==='GET'){
      const h = req.headers || {};
      if(!keyOk(h['x-parent-key'])) return res.status(401).json({ error:'parent key required' });
      const ids = (await redis(['ZREVRANGE', ZKEY, '0', String(KEEP-1)])).result || [];
      let rows = [];
      if(ids.length){
        const vals = (await redis(['HMGET', HKEY, ...ids])).result || [];
        for(const v of vals){ if(!v) continue; try{ rows.push(JSON.parse(v)); }catch(e){} }
      }
      return res.status(200).json({ rows });
    }

    return res.status(405).json({ error:'method not allowed' });
  }catch(e){
    return res.status(500).json({ error:'storage error' });
  }
}
