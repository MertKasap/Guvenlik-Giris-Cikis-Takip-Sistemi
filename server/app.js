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
import { cleanPerson, issueQrToken, validateQrToken, receiptCode, receiptHash } from './core.js';
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
  next();
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
  const [rows]=await db.execute('SELECT id,name,email,role,password_hash FROM users WHERE email=?',[email]);
  const row=rows[0];
  if(!row || !(await bcrypt.compare(password,row.password_hash))) throw error('E-posta veya şifre hatalı.',401);
  const {password_hash:unused,...user}=row;
  res.cookie('session',jwt.sign(user,signingKey(),{expiresIn:'8h',algorithm:'HS256'}),{
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
  if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>128) throw error('Ad, e-posta ve en az 12 karakter şifre gerekiyor.');
  const role=req.body?.role==='admin'?'admin':'guard';
  const [result]=await db.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
    [name,email,await bcrypt.hash(password,12),role]);
  res.status(201).json({id:result.insertId,name,email,role});
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
  await db.execute('INSERT INTO audit_logs (actor_id,visit_id,action) VALUES (?,?,?)',[creator,r.insertId,'entry']);
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
  const [visits]=await db.execute('SELECT id,first_name AS firstName,last_name AS lastName,phone,entry_at AS entryAt,exit_at AS exitAt,method FROM visits'+
    (where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY entry_at DESC LIMIT 150',params);
  res.json({visits});
}));
app.patch('/api/visits/:id/exit',auth,wrap(async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1) throw error('Geçersiz kayıt numarası.');
  const [r]=await db.execute('UPDATE visits SET exit_at=NOW() WHERE id=? AND exit_at IS NULL',[id]);
  if(!r.affectedRows) throw error('Kayıt yok veya çıkış zaten tamamlanmış.',409);
  await db.execute('INSERT INTO audit_logs (actor_id,visit_id,action) VALUES (?,?,?)',[req.user.id,id,'exit']);
  changed();res.json({ok:true});
}));
app.post('/api/visits/qr-exit',qrLimit,wrap(async(req,res)=>{
  if(!validateQrToken(req.body?.token,'exit')) throw error('QR kod geçersiz veya süresi dolmuş.',403);
  const phone=String(req.body?.phone||'').replace(/[^\d+]/g,''),code=String(req.body?.receiptCode||'');
  if(!/^\+?\d{10,15}$/.test(phone)||code.length<18||code.length>80) throw error('Telefon veya çıkış kodunu kontrol edin.');
  const [r]=await db.execute('UPDATE visits SET exit_at=NOW() WHERE receipt_hash=? AND phone=? AND exit_at IS NULL',[receiptHash(code),phone]);
  if(!r.affectedRows) throw error('Açık kayıt bulunamadı veya çıkış zaten yapılmış.',409);
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
