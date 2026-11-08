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
  async function submit(e){e.preventDefault();try{await api('/staff','POST',form);setMessage('Personel hesabı oluşturuldu.');setError('');setForm({name:'',email:'',password:'',role:'guard'});}
    catch(e){setError(e.message);setMessage('');}}
  return <section className="section-card"><div className="section-heading"><div><h3>Personel hesabı oluştur</h3><p className="muted">Bu bölüm yalnızca yöneticiye açıktır.</p></div></div>
    <form onSubmit={submit} className="staff-form"><label>Ad Soyad<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>E-posta<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Şifre (en az 12 karakter)<input required type="password" minLength="12" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
      <label>Yetki<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="guard">Güvenlik görevlisi</option><option value="admin">Yönetici</option></select></label>
      <Alert message={error}/><Alert message={message} kind="success"/><button className="primary">Hesap oluştur</button></form></section>;
}
function Dashboard({user,onLogout}){
  const [tab,setTab]=useState('overview'),[visits,setVisits]=useState([]),[summary,setSummary]=useState({}),[query,setQuery]=useState(''),
    [activeOnly,setActiveOnly]=useState(true),[notice,setNotice]=useState(''),[failure,setFailure]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    try{
      const [a,b]=await Promise.all([api('/visits?active='+(activeOnly?'1':'0')+'&q='+encodeURIComponent(query)),api('/reports/summary')]);
      setVisits(a.visits);setSummary(b);setFailure('');
    }catch(e){setFailure(e.message);}
  },[query,activeOnly]);
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
  return <div className="app-layout"><aside className="sidebar">
    <div className="brand"><Logo/><div><strong>GÜVENLİK</strong><small>Giriş / Çıkış Yönetimi</small></div></div>
    <div className="menu-label">YÖNETİM</div>
    {[['overview','▦','Genel bakış'],['visits','☷','Ziyaret kayıtları'],['entry','✎','Manuel kayıt'],['qr','▦','QR kod noktası'],...(user.role==='admin'?[['staff','♙','Personel yönetimi']]:[])].map(([key,ico,title])=>
      <button key={key} className={'menu-item '+(tab===key?'selected':'')} onClick={()=>setTab(key)}><span>{ico}</span>{title}</button>)}
    <div className="sidebar-bottom"><div className="avatar">{user.name?.slice(0,1).toLocaleUpperCase('tr')}</div>
      <div className="account-text"><strong>{user.name}</strong><small>{user.role==='admin'?'Yönetici':'Güvenlik görevlisi'}</small></div>
      <button title="Çıkış yap" className="logout" onClick={logout}>↪</button></div>
  </aside><main className="main-area"><div className="topbar"><div className="breadcrumb">Yönetim Paneli <span>/</span> {({overview:'Genel bakış',visits:'Ziyaret kayıtları',entry:'Manuel kayıt',qr:'QR kod noktası',staff:'Personel'})[tab]}</div>
    <div><Pill tone="green">● Sistem paneli</Pill></div></div>
    <div className="main-content"><div className="page-header"><div><h1>{({overview:'Genel bakış',visits:'Ziyaret kayıtları',entry:'Manuel kayıt',qr:'QR kod noktası',staff:'Personel yönetimi'})[tab]}</h1>
      <p>QR ve manuel güvenlik giriş-çıkış takip sistemi</p></div><button className="secondary" onClick={load}>↻ Yenile</button></div>
      <Alert message={notice} kind="success"/><Alert message={failure}/>
      {(tab==='overview'||tab==='visits')&&<><div className="stat-grid">
        {[['İçerideki kişiler',fmt(summary.active),'inside'],['Bugünkü girişler',fmt(summary.today),'daily'],['QR kayıtları',fmt(summary.qr),'qrstat'],['Manuel kayıtlar',fmt(summary.manual),'manual']].map(([label,count,style])=>
          <div className={'stat-card '+style} key={label}><span>{label}</span><strong>{count}</strong><small>Güncel veritabanı bilgisi</small></div>)}</div>
        <section className="section-card table-section"><div className="section-heading"><div><h3>Ziyaret kayıtları</h3><p className="muted">Girişler, çıkışlar ve kayıt yöntemlerini takip edin.</p></div></div>
          <div className="filters"><input aria-label="Kayıt ara" placeholder="Ad, soyad veya telefon ile ara…" value={query} onChange={e=>setQuery(e.target.value)}/>
            <label className="check"><input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)}/> Yalnızca içeridekiler</label></div>
          <div className="table-wrap"><table><thead><tr><th>KİŞİ</th><th>TELEFON</th><th>GİRİŞ</th><th>ÇIKIŞ</th><th>YÖNTEM</th><th>DURUM / İŞLEM</th></tr></thead>
            <tbody>{visits.length?visits.map(v=><tr key={v.id}><td><b>{v.firstName} {v.lastName}</b><small>#{v.id}</small></td>
              <td>{v.phone}</td><td><DateCell value={v.entryAt}/></td><td><DateCell value={v.exitAt}/></td>
              <td><Pill tone="info">{v.method==='qr'?'QR':'Manuel'}</Pill></td>
              <td>{v.exitAt?<Pill>Çıkış yaptı</Pill>:<button disabled={busy} className="exit-btn" onClick={()=>exitVisit(v.id)}>Çıkış ver →</button>}</td></tr>):
              <tr><td className="empty-state" colSpan="6">Henüz bu filtreye uygun kayıt bulunmuyor.</td></tr>}</tbody></table></div></section></>}
      {tab==='entry'&&<div className="center-column"><ManualEntry afterAdd={load}/></div>}
      {tab==='qr'&&<div className="center-column"><QrStation/></div>}
      {tab==='staff'&&user.role==='admin'&&<div className="center-column"><StaffForm/></div>}
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
