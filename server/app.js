import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { cleanPerson, phoneLookupVariants, issueQrToken, validateQrToken, receiptCode, receiptHash } from './core.js';
const app=express();
app.set('trust proxy',1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy:false }));
app.use(express.json({limit:'15kb'}));
app.use(cookieParser());
function error(msg,status=400){return Object.assign(new Error(msg),{status});}
function wrap(fn){return (req,res,next)=>Promise.resolve(fn(req,res)).catch(next);}
function signingKey() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) throw error('Sunucu yapılandırması eksik',500);
  return process.env.JWT_SECRET;
}
function userFromCookie(req){
  try {
    const t=req.cookies?.session;
    if(!t) return null;
    const user=jwt.verify(t,signingKey(),{algorithms:['HS256']});
    return ['admin','guard'].includes(user.role)?user:null;
  } catch {return null;}
}
function auth(req,res,next){
  req.user=userFromCookie(req);
  if(!req.user) return next(error('Oturum açmalısınız.',401));
  db.execute('SELECT session_version FROM users WHERE id=?',[req.user.id])
    .then(([rows])=>{
      if(!rows.length || Number(rows[0].session_version||0)!==Number(req.user.sessionVersion||0))
        return next(error('Oturumunuz yenilendi. Lütfen tekrar giriş yapın.',401));
      next();
    }).catch(next);
}
function onlyAdmin(req,res,next){
  if(req.user.role!=='admin') return next(error('Yönetici yetkisi gerekiyor.',403));
  next();
}
const base=(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');
app.use('/api',(req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const from=req.get('origin');
  const allowed=[base,'http://localhost:5173','http://127.0.0.1:5173','http://localhost:3000'].filter(Boolean);
  if(from && !allowed.includes(from)) return next(error('Kaynak doğrulanamadı.',403));
  next();
});
const loginLimit=rateLimit({windowMs:15*60000,limit:15,standardHeaders:'draft-7',legacyHeaders:false});
const qrLimit=rateLimit({windowMs:15*60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false});
const clients=new Set();
function changed(){for(const res of clients)res.write('event: changed\ndata: {}\n\n');}
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.post('/api/auth/login',loginLimit,wrap(async(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase();
  const password=String(req.body?.password||'');
  const [rows]=await db.execute('SELECT id,name,email,role,password_hash,session_version FROM users WHERE email=?',[email]);
  const row=rows[0];
  if(!row || !(await bcrypt.compare(password,row.password_hash))) throw error('E-posta veya şifre hatalı.',401);
  const user={id:row.id,name:row.name,email:row.email,role:row.role};
  const tokenUser={...user,sessionVersion:Number(row.session_version||0)};
  res.cookie('session',jwt.sign(tokenUser,signingKey(),{expiresIn:'8h',algorithm:'HS256'}),{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:8*3600000
  });
  res.json({user});
}));
app.post('/api/auth/logout',(req,res)=>{
  res.clearCookie('session',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax'});
  res.status(204).end();
});
app.get('/api/auth/me',auth,(req,res)=>res.json({user:req.user}));
app.post('/api/staff',auth,onlyAdmin,wrap(async(req,res)=>{
  const name=String(req.body?.name||'').trim(),email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');
  if(name.length<2||name.length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>128) throw error('Ad, e-posta ve en az 12 karakter şifre gerekiyor.');
  const role=req.body?.role==='admin'?'admin':'guard';
  const [result]=await db.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
    [name,email,await bcrypt.hash(password,12),role]);
  await db.execute('INSERT INTO audit_logs (actor_id,target_user_id,action,details) VALUES (?,?,?,?)',
    [req.user.id,result.insertId,'staff_create',role==='admin'?'Yönetici hesabı oluşturuldu':'Güvenlik görevlisi hesabı oluşturuldu']);
  res.status(201).json({id:result.insertId,name,email,role});
}));
app.get('/api/staff',auth,onlyAdmin,wrap(async(req,res)=>{
  const [staff]=await db.execute(
    "SELECT id,name,email,role,created_at AS createdAt FROM users WHERE role='guard' ORDER BY created_at DESC"
  );
  res.json({staff});
}));
app.patch('/api/staff/:id/password',auth,onlyAdmin,wrap(async(req,res)=>{
  const id=Number(req.params.id),password=String(req.body?.password||'');
  if(!Number.isSafeInteger(id)||id<1) throw error('Geçersiz personel numarası.');
  if(password.length<12||password.length>128) throw error('Yeni şifre 12-128 karakter arasında olmalıdır.');
  const [staff]=await db.execute("SELECT id,name FROM users WHERE id=? AND role='guard' LIMIT 1",[id]);
  if(!staff.length) throw error('Güvenlik görevlisi bulunamadı.',404);
  await db.execute('UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=?',
    [await bcrypt.hash(password,12),id]);
  await db.execute('INSERT INTO audit_logs (actor_id,target_user_id,action,details) VALUES (?,?,?,?)',
    [req.user.id,id,'password_reset',staff[0].name+' adlı güvenlik görevlisinin şifresi sıfırlandı']);
  res.json({ok:true});
}));
app.get('/api/qr/:purpose',auth,(req,res)=>{
  const purpose=req.params.purpose;
  if(!['entry','exit'].includes(purpose)) throw error('Geçersiz QR işlemi.');
  if(!base) throw error('PUBLIC_BASE_URL ayarlanmadı.',500);
  const token=issueQrToken(purpose);
  res.json({url:`${base}/?mode=${purpose}&token=${encodeURIComponent(token)}`,seconds:Number(process.env.QR_TTL_SECONDS)||60});
});
async function createVisit(person,method,creator){
  const receipt=receiptCode();
  const [r]=await db.execute('INSERT INTO visits (first_name,last_name,phone,method,receipt_hash,created_by) VALUES (?,?,?,?,?,?)',
    [person.firstName,person.lastName,person.phone,method,receiptHash(receipt),creator]);
  await db.execute('INSERT INTO audit_logs (actor_id,visit_id,action,details) VALUES (?,?,?,?)',
    [creator,r.insertId,'entry',method==='qr'?'QR ile giriş kaydı oluşturuldu':'Manuel giriş kaydı oluşturuldu']);
  changed();
  return {id:r.insertId,receiptCode:receipt};
}
app.post('/api/visits/manual',auth,wrap(async(req,res)=>{
  res.status(201).json(await createVisit(cleanPerson(req.body),'manual',req.user.id));
}));
app.post('/api/visits/qr',qrLimit,wrap(async(req,res)=>{
  if(!validateQrToken(req.body?.token,'entry')) throw error('QR kod geçersiz veya süresi dolmuş.',403);
  res.status(201).json(await createVisit(cleanPerson(req.body),'qr',null));
}));
app.get('/api/visits',auth,wrap(async(req,res)=>{
  const where=[],params=[];
  if(req.query.active==='1') where.push('exit_at IS NULL');
  const q=String(req.query.q||'').trim().slice(0,80);
  if(q) {where.push('(first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)');params.push(...Array(3).fill(`%${q}%`));}
  const page=Math.max(1,Math.min(100000,Number.parseInt(req.query.page,10)||1));
  const limit=Math.max(10,Math.min(100,Number.parseInt(req.query.limit,10)||50));
  const clause=where.length?' WHERE '+where.join(' AND '):'';
  const [counts]=await db.execute('SELECT COUNT(*) AS total FROM visits'+clause,params);
  const [visits]=await db.execute('SELECT id,first_name AS firstName,last_name AS lastName,phone,entry_at AS entryAt,exit_at AS exitAt,method FROM visits'+
    clause+' ORDER BY entry_at DESC,id DESC LIMIT ? OFFSET ?',[...params,limit,(page-1)*limit]);
  res.json({visits,total:Number(counts[0].total||0),page,limit});
}));
app.patch('/api/visits/:id/exit',auth,wrap(async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1) throw error('Geçersiz kayıt numarası.');
  const [r]=await db.execute('UPDATE visits SET exit_at=NOW() WHERE id=? AND exit_at IS NULL',[id]);
  if(!r.affectedRows) throw error('Kayıt yok veya çıkış zaten tamamlanmış.',409);
  await db.execute('INSERT INTO audit_logs (actor_id,visit_id,action,details) VALUES (?,?,?,?)',
    [req.user.id,id,'exit','Güvenlik görevlisi tarafından çıkış verildi']);
  changed();res.json({ok:true});
}));
app.post('/api/visits/qr-exit',qrLimit,wrap(async(req,res)=>{
  if(!validateQrToken(req.body?.token,'exit')) throw error('QR kod geçersiz veya süresi dolmuş.',403);
  const code=String(req.body?.receiptCode||'').trim();
  const numbers=phoneLookupVariants(req.body?.phone);
  if(code.length<16||code.length>80) throw error('Çıkış kodunu kontrol edin.');
  const placeholders=numbers.map(()=>'?').join(',');
  const [matches]=await db.execute(
    `SELECT id FROM visits WHERE receipt_hash=? AND phone IN (${placeholders}) AND exit_at IS NULL LIMIT 1`,
    [receiptHash(code), ...numbers]
  );
  if(!matches.length) throw error(
    'Telefon ve çıkış kodu eşleşmedi veya kayıt daha önce kapatıldı. Girişte verilen kodu kontrol edin; kod kayıpsa güvenlik görevlisine başvurun.',
    409
  );
  const visitId=matches[0].id;
  const [r]=await db.execute('UPDATE visits SET exit_at=NOW() WHERE id=? AND exit_at IS NULL',[visitId]);
  if(!r.affectedRows) throw error('Bu ziyaret kaydı için çıkış zaten tamamlanmış.',409);
  await db.execute('INSERT INTO audit_logs (actor_id,visit_id,action,details) VALUES (NULL,?,?,?)',
    [visitId,'exit','Ziyaretçi QR ile çıkış yaptı']);
  changed();res.json({ok:true});
}));
app.get('/api/reports/summary',auth,wrap(async(req,res)=>{
  const [rows]=await db.query(`SELECT COUNT(*) total,
    SUM(exit_at IS NULL) active,
    SUM(DATE(entry_at)=CURRENT_DATE()) today,
    SUM(method='qr') qr, SUM(method='manual') manual
    FROM visits`);
  res.json(rows[0]);
}));
function readDateRange(query,required=false){
  const from=String(query.from||'').trim(),to=String(query.to||'').trim();
  const valid=value=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date=new Date(value+'T00:00:00.000Z');
    return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
  };
  if((from&&!valid(from))||(to&&!valid(to))) throw error('Tarih YYYY-AA-GG biçiminde olmalıdır.');
  if(from&&to&&from>to) throw error('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
  if(required&&(!from||!to)) throw error('Başlangıç ve bitiş tarihlerini seçin.');
  return {from,to};
}
app.get('/api/audit-logs',auth,onlyAdmin,wrap(async(req,res)=>{
  const {from,to}=readDateRange(req.query);
  const where=[],params=[];
  if(from){where.push('al.created_at >= ?');params.push(from+' 00:00:00');}
  if(to){where.push('al.created_at < DATE_ADD(?, INTERVAL 1 DAY)');params.push(to);}
  const page=Math.max(1,Math.min(100000,Number.parseInt(req.query.page,10)||1));
  const limit=50,clause=where.length?' WHERE '+where.join(' AND '):'';
  const [counts]=await db.execute('SELECT COUNT(*) AS total FROM audit_logs al'+clause,params);
  const [logs]=await db.execute(
    `SELECT al.id,al.action,al.details,al.visit_id AS visitId,al.created_at AS createdAt,
      COALESCE(actor.name,'Ziyaretçi (QR)') AS actorName,actor.role AS actorRole,
      CONCAT_WS(' ',v.first_name,v.last_name) AS visitorName,
      target.name AS targetUserName
      FROM audit_logs al
      LEFT JOIN users actor ON actor.id=al.actor_id
      LEFT JOIN visits v ON v.id=al.visit_id
      LEFT JOIN users target ON target.id=al.target_user_id`+
    clause+' ORDER BY al.created_at DESC,al.id DESC LIMIT ? OFFSET ?',
    [...params,limit,(page-1)*limit]
  );
  res.json({logs,total:Number(counts[0].total||0),page,limit});
}));
app.get('/api/reports/range',auth,onlyAdmin,wrap(async(req,res)=>{
  const {from,to}=readDateRange(req.query,true);
  const [summaryRows]=await db.execute(
    `SELECT
      (SELECT COUNT(*) FROM visits WHERE entry_at>=? AND entry_at<DATE_ADD(?,INTERVAL 1 DAY)) AS entries,
      (SELECT COUNT(*) FROM visits WHERE exit_at>=? AND exit_at<DATE_ADD(?,INTERVAL 1 DAY)) AS exits,
      (SELECT COUNT(*) FROM visits WHERE method='qr' AND entry_at>=? AND entry_at<DATE_ADD(?,INTERVAL 1 DAY)) AS qr,
      (SELECT COUNT(*) FROM visits WHERE method='manual' AND entry_at>=? AND entry_at<DATE_ADD(?,INTERVAL 1 DAY)) AS manual,
      (SELECT COUNT(*) FROM visits WHERE exit_at IS NULL) AS activeNow`,
    [from,to,from,to,from,to,from,to]
  );
  const [days]=await db.execute(
    `SELECT DATE_FORMAT(activity_at,'%Y-%m-%d') AS day,SUM(entries) AS entries,SUM(exits) AS exits
      FROM (
        SELECT entry_at AS activity_at,1 AS entries,0 AS exits FROM visits
          WHERE entry_at>=? AND entry_at<DATE_ADD(?,INTERVAL 1 DAY)
        UNION ALL
        SELECT exit_at AS activity_at,0 AS entries,1 AS exits FROM visits
          WHERE exit_at IS NOT NULL AND exit_at>=? AND exit_at<DATE_ADD(?,INTERVAL 1 DAY)
      ) activity
      GROUP BY DATE(activity_at) ORDER BY DATE(activity_at)`,
    [from,to,from,to]
  );
  res.json({from,to,summary:summaryRows[0],days});
}));
app.get('/api/events',auth,(req,res)=>{
  res.setHeader('Content-Type','text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control','no-cache, no-transform');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();res.write(': connected\n\n');clients.add(res);
  const timer=setInterval(()=>res.write(': heartbeat\n\n'),25000);
  req.on('close',()=>{clearInterval(timer);clients.delete(res);});
});
const here=path.dirname(fileURLToPath(import.meta.url)),dist=path.resolve(here,'../web/dist');
if(fs.existsSync(path.join(dist,'index.html'))){
  app.use(express.static(dist));
  app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')));
}
app.use((err,req,res,next)=>{
  if(err.code==='ER_DUP_ENTRY') return res.status(409).json({error:'Aynı bilgiyle kayıt zaten mevcut.'});
  const status=Number.isInteger(err.status)?err.status:500;
  if(status>=500)console.error(err);
  res.status(status).json({error:status>=500?'Sunucu hatası. Tekrar deneyin.':err.message});
});
export default app;
