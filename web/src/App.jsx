import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

async function api(path, method='GET', data) {
  let response;
  try {
    response=await fetch('/api'+path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:undefined,
      body:data?JSON.stringify(data):undefined});
  } catch { throw new Error('Sunucuya bağlanılamadı. API ve veritabanını kontrol edin.'); }
  if(response.status===204) return {};
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error||'İşlem tamamlanamadı.');
  return result;
}
function Logo(){return <span className="logo-icon">◈</span>;}
function Pill({children,tone='neutral'}){return <span className={'pill '+tone}>{children}</span>;}
const emptyPerson={firstName:'',lastName:'',phone:''};
function PersonFields({value,setValue,exitOnly=false}){
  // name + autocomplete tarayıcıya kayıtlı kişi bilgilerini önerme olanağı verir.
  const onField = key => e => {
    const currentValue = e.currentTarget.value;
    setValue(v => v[key] === currentValue ? v : {...v,[key]:currentValue});
  };
  return <div className="person-grid">
    {!exitOnly&&<><label htmlFor="visitor-first-name">Ad<input
      id="visitor-first-name" name="firstName" type="text" required maxLength="60"
      autoComplete="given-name" autoCapitalize="words" placeholder="Ad" value={value.firstName}
      onChange={onField('firstName')} onInput={onField('firstName')}/></label>
    <label htmlFor="visitor-last-name">Soyad<input
      id="visitor-last-name" name="lastName" type="text" required maxLength="60"
      autoComplete="family-name" autoCapitalize="words" placeholder="Soyad" value={value.lastName}
      onChange={onField('lastName')} onInput={onField('lastName')}/></label>
    </>}
    <label className="span-2" htmlFor="visitor-phone">Telefon<input
      id="visitor-phone" name="phone" type="tel" inputMode="tel" required maxLength="20"
      autoComplete="tel" placeholder="05xx xxx xx xx" value={value.phone}
      onChange={onField('phone')} onInput={onField('phone')}/></label>
  </div>;
}
function Alert({message,kind='error'}){return message?<div className={'alert '+kind}>{message}</div>:null;}
function PublicForm(){
  const params=new URLSearchParams(window.location.search);
  const mode=params.get('mode'),token=params.get('token');
  const isExit=mode==='exit';
  const [form,setForm]=useState({...emptyPerson});
  const [receipt,setReceipt]=useState('');
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [copyState,setCopyState]=useState('');
  const receiptFieldRef=useRef(null);
  async function copyReceiptCode(){
    const value=result?.receiptCode;
    if(!value)return;
    setCopyState('');
    try{
      if(navigator.clipboard?.writeText && window.isSecureContext){
        await navigator.clipboard.writeText(value);
        setCopyState('success');
        return;
      }
    }catch{
      // Bazı mobil tarayıcılar panoya erişimi engelleyebilir; ikinci yöntemi deneyelim.
    }
    const field=receiptFieldRef.current;
    if(field){
      field.focus();
      field.select();
      field.setSelectionRange(0,value.length);
      try{
        if(document.execCommand('copy')){
          setCopyState('success');
          return;
        }
      }catch{
        // Kullanıcı kod alanından elle kopyalayabilir.
      }
    }
    setCopyState('manual');
  }
  async function submit(e){
    e.preventDefault();setError('');setBusy(true);
    try{
      if(!token)throw new Error('QR kodu bulunamadı.');
      // Telefonun otomatik doldurması React olayını tetiklemezse gerçek form değerlerini de al.
      const submitted = Object.fromEntries(new FormData(e.currentTarget));
      const data=isExit
        ? await api('/visits/qr-exit','POST',{token,phone:String(submitted.phone||''),receiptCode:String(submitted.receiptCode||'').trim()})
        : await api('/visits/qr','POST',{
            firstName:String(submitted.firstName||''),
            lastName:String(submitted.lastName||''),
            phone:String(submitted.phone||''),token
          });
      setResult(data);
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <div className="public-layout"><div className="public-card">
    <header className="public-header"><Logo/><span>Güvenlik Giriş-Çıkış</span><Pill tone="info">QR İşlemi</Pill></header>
    {result?<div className="success-view"><div className="success-icon">✓</div><h1>{isExit?'Çıkış tamamlandı':'Giriş kaydı oluşturuldu'}</h1>
      <p>{isExit?'Çıkış zamanınız sisteme işlendi.':'Girişiniz kaydedildi. Çıkış işlemi için aşağıdaki özel kodu saklayın.'}</p>
      {!isExit&&<div className="receipt"><small>Kişisel çıkış kodunuz</small>
        <input ref={receiptFieldRef} className="receipt-code" type="text" readOnly
          aria-label="Kişisel çıkış kodu" autoComplete="off" spellCheck={false} value={result.receiptCode}
          onFocus={e=>e.currentTarget.select()} onClick={e=>e.currentTarget.select()}/>
        <button type="button" className="secondary" onClick={copyReceiptCode}>
          {copyState==='success'?'✓ Kopyalandı':'Kodu kopyala'}</button>
        <div className={'copy-hint '+(copyState==='manual'?'copy-warning':'')} role="status" aria-live="polite">
          {copyState==='success'?'Kod panoya kopyalandı. Çıkış ekranına yapıştırabilirsiniz.'
            :copyState==='manual'?'Tarayıcı kopyalamaya izin vermedi. Yukarıdaki kod alanına dokunup Kopyala seçeneğini kullanın.'
            :'Kodu saklayın. Çıkış yaparken bu kod ve telefon numaranız gerekecek.'}
        </div></div>}
      <p className="muted tiny">Bu sayfada başka kişilerin kayıtları görüntülenmez.</p>
    </div>:<><div className="big-symbol">{isExit?'↗':'↘'}</div>
    <h1>{isExit?'Güvenli çıkış kaydı':'Güvenli giriş kaydı'}</h1>
    <p className="muted">{isExit?'Çıkış için girişte yazdığınız telefon numarasını ve size verilen özel kodu girin. Telefonu 05... veya +905... biçiminde yazabilirsiniz.':'İçeri giriş için ad, soyad ve telefon bilgilerinizi girin. Giriş saati otomatik kaydedilir.'}</p>
    <form onSubmit={submit} autoComplete="on"><PersonFields value={form} setValue={setForm} exitOnly={isExit}/>
      {isExit&&<label className="extra-field">Girişte verilen çıkış kodu
        <input required name="receiptCode" autoComplete="off" value={receipt} onChange={e=>setReceipt(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX (eski kodlar da geçerli)"/>
      </label>}
      <p className="tiny muted">Gönderdiğiniz bilgiler yalnızca yetkili güvenlik personelinin erişebildiği kayıtta tutulur.</p>
      <Alert message={error}/>
      <button className="primary full" disabled={busy}>{busy?'İşleniyor…':isExit?'Çıkış işlemini tamamla':'Giriş kaydını oluştur'}</button>
    </form></>}</div><div className="public-footer">QR kodlar kısa süreli geçerlidir. Süresi dolarsa güvenlik görevlisinden yeni kod isteyin.</div></div>;
}
function Login({onSuccess}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setError('');setBusy(true);try{
    const r=await api('/auth/login','POST',{email,password});onSuccess(r.user);
  }catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="auth-layout"><div className="auth-left">
    <div className="brand"><Logo/><div><strong>GÜVENLİK</strong><small>Giriş / Çıkış Yönetimi</small></div></div>
    <div className="auth-message"><Pill tone="info">Yönetim Paneli</Pill><h1>Girişler kontrol altında.<br/><span>Kayıtlar tek ekranda.</span></h1>
    <p>QR ile hızlı kayıt, görevli tarafından manuel giriş ve gerçek zamanlı ziyaretçi takibi.</p></div>
    <div className="auth-decor"><span>◈</span><span>◈</span><span>◈</span></div>
  </div><div className="auth-right"><div className="login-box">
    <div className="mobile-brand"><Logo/><b>GÜVENLİK</b></div>
    <h2>Tekrar hoş geldiniz</h2><p className="muted">Güvenlik görevlisi veya yönetici hesabınızla oturum açın.</p>
    <form onSubmit={submit}><label>E-posta<input required type="email" placeholder="ornek@kurum.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Şifre<input required type="password" placeholder="••••••••••••" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <Alert message={error}/><button className="primary full" disabled={busy}>{busy?'Giriş yapılıyor…':'Panele giriş yap'} <span>→</span></button></form>
    <p className="tiny muted centered">Personel hesapları yönetici tarafından oluşturulur.</p></div></div></div>;
}
function QrStation(){
  const [purpose,setPurpose]=useState('entry'),[data,setData]=useState(null),[error,setError]=useState('');
  const load=useCallback(async()=>{
    try{const r=await api('/qr/'+purpose);setData({...r,issued:Date.now()});setError('');}
    catch(e){setError(e.message);}
  },[purpose]);
  useEffect(()=>{load();const timer=setInterval(load,35000);return ()=>clearInterval(timer);},[load]);
  return <section className="section-card qr-section">
    <div className="section-heading"><div><h3>Canlı QR noktası</h3><p className="muted">Ziyaretçinin telefonuyla okutarak işlem yapması için gösterin.</p></div></div>
    <div className="segment"><button className={purpose==='entry'?'active':''} onClick={()=>setPurpose('entry')}>↓ Giriş QR</button>
      <button className={purpose==='exit'?'active':''} onClick={()=>setPurpose('exit')}>↑ Çıkış QR</button></div>
    <div className="qr-card"><div className="qr-ribbon"><Logo/><div><b>{purpose==='entry'?'GİRİŞ KAYDI':'ÇIKIŞ KAYDI'}</b><small>Telefon kamerasıyla okutun</small></div><Pill tone="light">● Canlı</Pill></div>
      {data?<div className="qr-image"><QRCodeSVG value={data.url} size={246} marginSize={2} level="M"/></div>:<div className="qr-placeholder">QR hazırlanıyor</div>}
      <p className="muted tiny centered">Kod yaklaşık {data?.seconds||60} saniye geçerlidir; düzenli olarak yenilenir.</p>
      <button className="secondary full" onClick={load}>↻ QR kodu yenile</button></div><Alert message={error}/>
  </section>;
}
function ManualEntry({afterAdd}){
  const [form,setForm]=useState({...emptyPerson}),[error,setError]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError('');
    try{
      const submitted=Object.fromEntries(new FormData(e.currentTarget));
      const data=await api('/visits/manual','POST',{
        firstName:String(submitted.firstName||''),lastName:String(submitted.lastName||''),phone:String(submitted.phone||'')
      });
      setResult(data);setForm({...emptyPerson});afterAdd();}
    catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <section className="section-card"><div className="section-heading"><div><h3>Manuel giriş kaydı</h3><p className="muted">Ziyaretçi QR kullanamıyorsa kayıt oluşturun.</p></div><span className="section-icon">✎</span></div>
    <form onSubmit={submit} autoComplete="on"><PersonFields value={form} setValue={setForm}/>
      <p className="tiny muted">Giriş saati sunucuda otomatik kaydedilir.</p><Alert message={error}/>
      {result&&<Alert kind="success" message={'Kayıt #'+result.id+' oluşturuldu. QR çıkışı için özel kod: '+result.receiptCode}/>}
      <button disabled={busy} className="primary full">{busy?'Kaydediliyor…':'+ Giriş kaydı oluştur'}</button></form>
  </section>;
}
function DateCell({value}){return value?<span>{new Date(String(value).replace(' ','T')).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>:<span className="muted">—</span>;}
function StaffForm(){
  const [form,setForm]=useState({name:'',email:'',password:'',role:'guard'}),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [staff,setStaff]=useState([]),[resetPasswords,setResetPasswords]=useState({}),[resetMessages,setResetMessages]=useState({}),[busyId,setBusyId]=useState(null);
  const loadStaff=useCallback(async()=>{try{const r=await api('/staff');setStaff(r.staff||[]);}catch(e){setError(e.message);}},[]);
  useEffect(()=>{loadStaff();},[loadStaff]);
  async function submit(e){e.preventDefault();setError('');setMessage('');
    try{await api('/staff','POST',form);setMessage('Personel hesabı oluşturuldu.');setForm({name:'',email:'',password:'',role:'guard'});await loadStaff();}
    catch(e){setError(e.message);}}
  async function resetPassword(person){
    const password=resetPasswords[person.id]||'';
    if(password.length<12){setResetMessages(v=>({...v,[person.id]:'Şifre en az 12 karakter olmalıdır.'}));return;}
    if(!confirm(person.name+' adlı görevlinin şifresi sıfırlansın mı?'))return;
    setBusyId(person.id);setResetMessages(v=>({...v,[person.id]:''}));
    try{await api('/staff/'+person.id+'/password','PATCH',{password});setResetPasswords(v=>({...v,[person.id]:''}));
      setResetMessages(v=>({...v,[person.id]:'Şifre güncellendi. Görevlinin açık oturumları kapatıldı.'}));}
    catch(e){setResetMessages(v=>({...v,[person.id]:e.message}));}
    finally{setBusyId(null);}
  }
  return <div className="staff-manager">
    <section className="section-card"><div className="section-heading"><div><h3>Personel hesabı oluştur</h3><p className="muted">Yeni güvenlik görevlisi hesabı ekleyin.</p></div></div>
      <form onSubmit={submit} className="staff-form"><label>Ad Soyad<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>E-posta<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label>İlk şifre (en az 12 karakter)<input required type="password" minLength="12" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
        <label>Yetki<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="guard">Güvenlik görevlisi</option><option value="admin">Yönetici</option></select></label>
        <Alert message={error}/><Alert message={message} kind="success"/><button className="primary">Hesap oluştur</button></form>
    </section>
    <section className="section-card staff-list-card"><div className="section-heading"><div><h3>Güvenlik görevlileri</h3><p className="muted">Yönetici yeni şifre belirleyebilir; eski açık oturumlar geçersiz kılınır.</p></div><button className="secondary" type="button" onClick={loadStaff}>↻ Yenile</button></div>
      {staff.length?staff.map(person=><div className="staff-row" key={person.id}>
        <div className="staff-person"><strong>{person.name}</strong><small>{person.email}</small></div>
        <div className="staff-reset"><input type="password" minLength="12" autoComplete="new-password" aria-label={person.name+' için yeni şifre'}
          placeholder="Yeni şifre (en az 12 karakter)" value={resetPasswords[person.id]||''}
          onChange={e=>setResetPasswords(v=>({...v,[person.id]:e.target.value}))}/>
          <button type="button" className="secondary" disabled={busyId===person.id} onClick={()=>resetPassword(person)}>
            {busyId===person.id?'Güncelleniyor…':'Şifreyi sıfırla'}</button>
          {resetMessages[person.id]&&<small className={resetMessages[person.id].includes('güncellendi')?'reset-success':'reset-error'}>{resetMessages[person.id]}</small>}
        </div>
      </div>):<p className="empty-state">Henüz güvenlik görevlisi hesabı oluşturulmamış.</p>}
    </section>
  </div>;
}
function localDate(offset=0){
  const date=new Date();date.setDate(date.getDate()+offset);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function dateLabel(value){
  if(!value)return '—';
  const [y,m,d]=String(value).slice(0,10).split('-');
  return new Date(Number(y),Number(m)-1,Number(d),12).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit'});
}
function Reports({isAdmin}){
  const [from,setFrom]=useState(()=>localDate(-13)),[to,setTo]=useState(()=>localDate(0));
  const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    if(!from||!to)return;
    setBusy(true);setError('');
    try{setData(await api('/reports/range?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)));}
    catch(e){setError(e.message);setData(null);}
    finally{setBusy(false);}
  },[from,to]);
  useEffect(()=>{load();},[load]);
  const chartDays=(()=>{
    if(!from||!to||from>to)return [];
    const result=[],start=new Date(from+'T12:00:00'),end=new Date(to+'T12:00:00');
    const byDay=new Map((data?.days||[]).map(d=>[String(d.day).slice(0,10),d]));
    for(const date=new Date(start);date<=end&&result.length<367;date.setDate(date.getDate()+1)){
      const key=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
      const item=byDay.get(key)||{};
      result.push({day:key,entries:Number(item.entries||0),exits:Number(item.exits||0)});
    }
    return result;
  })();
  const max=Math.max(1,...chartDays.flatMap(d=>[d.entries,d.exits]));
  const summary=data?.summary||{};
  return <div className="reports-page">
    <section className="section-card report-filter"><div><h3>Rapor tarih aralığı</h3><p className="muted">Giriş ve çıkış sayılarını seçtiğiniz dönem için inceleyin.</p></div>
      <div className="report-date-fields"><label>Başlangıç<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
        <label>Bitiş<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
        <button className="primary" disabled={busy||!from||!to||from>to} onClick={load}>{busy?'Hesaplanıyor…':'Raporu getir'}</button></div>
      <div className="report-export-actions">
        <a className="secondary download-link" href={'/api/export/visits.csv?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)}>Ziyaretçi kayıtlarını CSV indir</a>
        {isAdmin&&<a className="secondary download-link" href={'/api/export/audit.csv?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)}>İşlem geçmişini CSV indir</a>}
      </div>
      <Alert message={error}/>
    </section>
    {data&&<><div className="report-stat-grid">
      {[['Toplam giriş',summary.entries,'blue'],['Toplam çıkış',summary.exits,'green'],['QR ile giriş',summary.qr,'purple'],['Manuel giriş',summary.manual,'orange'],['Şu an içeride',summary.activeNow,'dark']].map(([label,value,tone])=>
        <div className={'report-stat '+tone} key={label}><span>{label}</span><strong>{Number(value||0).toLocaleString('tr-TR')}</strong></div>)}
    </div>
    <section className="section-card chart-card"><div className="section-heading"><div><h3>Günlük giriş ve çıkış grafiği</h3><p className="muted">{dateLabel(from)} – {dateLabel(to)} dönemindeki hareketler</p></div></div>
      <div className="chart-legend"><span><i className="legend-entry"/> Giriş</span><span><i className="legend-exit"/> Çıkış</span></div>
      {chartDays.length?<div className="bar-chart" role="img" aria-label="Günlere göre giriş ve çıkış sayıları">
        {chartDays.map(day=><div className="chart-column" key={day.day} title={day.day+': '+day.entries+' giriş, '+day.exits+' çıkış'}>
          <div className="chart-bars"><span className="chart-bar entry-bar" style={{height:(day.entries?Math.max(3,day.entries/max*100):0)+'%'}}/>
            <span className="chart-bar exit-bar" style={{height:(day.exits?Math.max(3,day.exits/max*100):0)+'%'}}/></div>
          <small>{dateLabel(day.day)}</small></div>)}
      </div>:<p className="empty-state">Bu tarih aralığında gösterilecek hareket yok.</p>}
    </section></>}
  </div>;
}
function AuditLogs(){
  const [from,setFrom]=useState(()=>localDate(-29)),[to,setTo]=useState(()=>localDate(0));
  const [page,setPage]=useState(1),[data,setData]=useState({logs:[],total:0}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{const r=await api('/audit-logs?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)+'&page='+page);setData(r);}
    catch(e){setError(e.message);}
    finally{setBusy(false);}
  },[from,to,page]);
  useEffect(()=>{setPage(1);},[from,to]);
  useEffect(()=>{load();},[load]);
  const actionName={entry:'Giriş kaydı',exit:'Çıkış kaydı',staff_create:'Personel hesabı oluşturma',password_reset:'Personel şifresi sıfırlama'};
  const pageCount=Math.max(1,Math.ceil(data.total/50));
  return <section className="section-card audit-card"><div className="section-heading"><div><h3>İşlem geçmişi</h3><p className="muted">Ziyaretçi ve yönetici işlemleri; işlemi yapan kişi ve zaman bilgisiyle listelenir.</p></div>
      <div className="audit-actions"><a className="secondary download-link" href={'/api/export/audit.csv?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)}>CSV indir</a>
        <button className="secondary" type="button" disabled={busy} onClick={load}>↻ Yenile</button></div></div>
    <div className="audit-filters"><label>Başlangıç<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
      <label>Bitiş<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label></div>
    <Alert message={error}/>
    <div className="table-wrap"><table><thead><tr><th>TARİH</th><th>İŞLEMİ YAPAN</th><th>İŞLEM</th><th>İLGİLİ KAYIT</th><th>AÇIKLAMA</th></tr></thead>
      <tbody>{data.logs.length?data.logs.map(log=><tr key={log.id}><td><DateCell value={log.createdAt}/></td>
        <td><b>{log.actorName}</b><small>{log.actorRole==='admin'?'Yönetici':log.actorRole==='guard'?'Güvenlik görevlisi':'QR ziyaretçisi'}</small></td>
        <td><Pill tone={log.action==='password_reset'?'info':'neutral'}>{actionName[log.action]||log.action}</Pill></td>
        <td>{log.visitorName||log.targetUserName||(log.visitId?'Kayıt #'+log.visitId:'—')}</td><td>{log.details||'—'}</td></tr>):
        <tr><td colSpan="5" className="empty-state">{busy?'Kayıtlar yükleniyor…':'Bu tarih aralığında işlem bulunamadı.'}</td></tr>}</tbody></table></div>
    <div className="pagination"><span>{data.total} işlem · Sayfa {page}/{pageCount}</span>
      <div><button className="secondary" disabled={page<=1||busy} onClick={()=>setPage(v=>v-1)}>Önceki</button>
        <button className="secondary" disabled={page>=pageCount||busy} onClick={()=>setPage(v=>v+1)}>Sonraki</button></div></div>
  </section>;
}
function Dashboard({user,onLogout}){
  const [tab,setTab]=useState('overview'),[visits,setVisits]=useState([]),[summary,setSummary]=useState({}),[query,setQuery]=useState(''),
    [activeOnly,setActiveOnly]=useState(user.role!=='admin'),[page,setPage]=useState(1),[total,setTotal]=useState(0),
    [notice,setNotice]=useState(''),[failure,setFailure]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    try{
      const [a,b]=await Promise.all([
        api('/visits?active='+(activeOnly?'1':'0')+'&q='+encodeURIComponent(query)+'&page='+page+'&limit=50'),
        api('/reports/summary')
      ]);
      setVisits(a.visits);setTotal(a.total);setSummary(b);setFailure('');
    }catch(e){setFailure(e.message);}
  },[query,activeOnly,page]);
  useEffect(()=>{setPage(1);},[query,activeOnly]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const events=new EventSource('/api/events');
    events.addEventListener('changed',load);
    const interval=setInterval(load,60000);
    return ()=>{events.close();clearInterval(interval);};
  },[load]);
  async function exitVisit(id){if(!confirm('Kayıt #'+id+' için çıkış işlemi tamamlansın mı?'))return;setBusy(true);
    try{await api('/visits/'+id+'/exit','PATCH');setNotice('Kayıt #'+id+' için çıkış tamamlandı.');await load();}
    catch(e){setFailure(e.message);}finally{setBusy(false);}}
  async function logout(){await api('/auth/logout','POST').catch(()=>{});onLogout();}
  const fmt=x=>Number(x||0).toLocaleString('tr-TR');
  const labels={overview:'Genel bakış',visits:'Ziyaret kayıtları',entry:'Manuel kayıt',qr:'QR kod noktası',reports:'Raporlar',audit:'İşlem geçmişi',staff:'Personel yönetimi'};
  return <div className="app-layout"><aside className="sidebar">
    <div className="brand"><Logo/><div><strong>GÜVENLİK</strong><small>Giriş / Çıkış Yönetimi</small></div></div>
    <div className="menu-label">YÖNETİM</div>
    {[['overview','▦','Genel bakış'],['visits','☷','Ziyaret kayıtları'],['entry','✎','Manuel kayıt'],['qr','▦','QR kod noktası'],['reports','▥','Raporlar'],...(user.role==='admin'?[['audit','◷','İşlem geçmişi'],['staff','♙','Personel yönetimi']]:[])].map(([key,ico,title])=>
      <button key={key} className={'menu-item '+(tab===key?'selected':'')} onClick={()=>setTab(key)}><span>{ico}</span>{title}</button>)}
    <div className="sidebar-bottom"><div className="avatar">{user.name?.slice(0,1).toLocaleUpperCase('tr')}</div>
      <div className="account-text"><strong>{user.name}</strong><small>{user.role==='admin'?'Yönetici':'Güvenlik görevlisi'}</small></div>
      <button title="Çıkış yap" className="logout" onClick={logout}>↪</button></div>
  </aside><main className="main-area"><div className="topbar"><div className="breadcrumb">Yönetim Paneli <span>/</span> {labels[tab]}</div>
    <div><Pill tone="green">● Sistem paneli</Pill></div></div>
    <div className="main-content"><div className="page-header"><div><h1>{labels[tab]}</h1>
      <p>QR ve manuel güvenlik giriş-çıkış takip sistemi</p></div>{['overview','visits'].includes(tab)&&<button className="secondary" onClick={load}>↻ Yenile</button>}</div>
      <Alert message={notice} kind="success"/><Alert message={failure}/>
      {(tab==='overview'||tab==='visits')&&<><div className="stat-grid">
        {[['İçerideki kişiler',fmt(summary.active),'inside'],['Bugünkü girişler',fmt(summary.today),'daily'],['QR kayıtları',fmt(summary.qr),'qrstat'],['Manuel kayıtlar',fmt(summary.manual),'manual']].map(([label,count,style])=>
          <div className={'stat-card '+style} key={label}><span>{label}</span><strong>{count}</strong><small>Güncel veritabanı bilgisi</small></div>)}</div>
        <section className="section-card table-section"><div className="section-heading"><div><h3>{user.role==='admin'?'Tüm ziyaretçi geçmişi':'Ziyaret kayıtları'}</h3><p className="muted">Girişler, çıkışlar ve kayıt yöntemlerini takip edin.</p></div></div>
          <div className="filters"><input aria-label="Kayıt ara" placeholder="Ad, soyad veya telefon ile ara…" value={query} onChange={e=>setQuery(e.target.value)}/>
            {user.role==='admin'&&<label className="check"><input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)}/> Yalnızca içeridekiler</label>}
            <span className="history-count">{total} kayıt</span></div>
          <div className="table-wrap"><table><thead><tr><th>KİŞİ</th><th>TELEFON</th><th>GİRİŞ</th><th>ÇIKIŞ</th><th>YÖNTEM</th><th>DURUM / İŞLEM</th></tr></thead>
            <tbody>{visits.length?visits.map(v=><tr key={v.id}><td><b>{v.firstName} {v.lastName}</b><small>#{v.id}</small></td>
              <td>{v.phone}</td><td><DateCell value={v.entryAt}/></td><td><DateCell value={v.exitAt}/></td>
              <td><Pill tone="info">{v.method==='qr'?'QR':'Manuel'}</Pill></td>
              <td>{v.exitAt?<Pill>Çıkış yaptı</Pill>:<button disabled={busy} className="exit-btn" onClick={()=>exitVisit(v.id)}>Çıkış ver →</button>}</td></tr>):
              <tr><td className="empty-state" colSpan="6">Henüz bu filtreye uygun kayıt bulunmuyor.</td></tr>}</tbody></table></div>
          <div className="pagination"><span>{total} kayıt · Sayfa {page}/{Math.max(1,Math.ceil(total/50))}</span>
            <div><button className="secondary" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Önceki</button>
              <button className="secondary" disabled={page>=Math.max(1,Math.ceil(total/50))} onClick={()=>setPage(v=>v+1)}>Sonraki</button></div></div>
        </section></>}
      {tab==='entry'&&<div className="center-column"><ManualEntry afterAdd={load}/></div>}
      {tab==='qr'&&<div className="center-column"><QrStation/></div>}
      {tab==='reports'&&<Reports isAdmin={user.role==='admin'}/>}
      {tab==='audit'&&user.role==='admin'&&<AuditLogs/>}
      {tab==='staff'&&user.role==='admin'&&<StaffForm/>}
      <footer className="app-footer">Güvenlik Giriş-Çıkış Takip Sistemi · Ders projesi prototipi · Veriler erişim yetkileriyle korunmalıdır.</footer>
    </div></main></div>;
}
export default function App(){
  const params=new URLSearchParams(window.location.search);
  const publicMode=params.get('mode');
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{if(['entry','exit'].includes(publicMode)){setLoading(false);return;}
    api('/auth/me').then(x=>setUser(x.user)).catch(()=>setUser(null)).finally(()=>setLoading(false));
  },[publicMode]);
  if(['entry','exit'].includes(publicMode))return <PublicForm/>;
  if(loading)return <div className="loading-screen"><Logo/> Sistem hazırlanıyor…</div>;
  return user?<Dashboard user={user} onLogout={()=>setUser(null)}/>:<Login onSuccess={setUser}/>;
}
