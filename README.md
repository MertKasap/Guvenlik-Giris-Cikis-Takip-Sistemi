# QR ve Manuel Güvenlik Giriş-Çıkış Takip Sistemi

**Web Programlama / Web Teknolojileri Dönem Projesi — 2026–2027 Güz**

> **Durum (8 Kasım 2026):** İlk MVP için React, Express ve MySQL kaynak kodları eklendi. Canlı yayın henüz doğrulanmadı; tam testler bekliyor.

## Problem ve hedef

Bir kurum, işletme, okul binası veya tesisin güvenlik girişinde ziyaretçilerin **ad, soyad, telefon, giriş zamanı ve çıkış zamanı** bilgilerinin tek merkezden kaydedilmesini ve takip edilmesini amaçlayan web uygulamasıdır.

Aynı kaydı oluşturmak için **iki alternatif giriş yöntemi** bulunacaktır:
- **QR ile giriş:** Kişi giriş noktasındaki QR kodu telefonuyla okutur, açılan formda adını, soyadını ve telefonunu girerek giriş kaydını gönderir. Sistem giriş saatini sunucuda oluşturur.
- **Manuel giriş:** Güvenlik personeli aynı üç bilgiyi kendi oturumundan kaydeder. Sistem giriş saatini oluşturur.

**Çıkış takibi:** Görevli aktif kayıttan kişiyi seçip çıkış verir veya kişi çıkış noktasına özel QR kodunu okutarak açık girişini doğrulayıp çıkış kaydını tamamlar. Çıkış saati de sunucu tarafından kaydedilir.

Sistem bir **ders yoklama uygulaması değildir**; bina/tesis güvenlik giriş-çıkış takibi içindir. QR ekranı yalnızca görsel ilhamdır.

## Kullanıcı rolleri

| Rol | Yetki |
| --- | --- |
| Güvenlik görevlisi | Giriş/çıkış kaydı, aktif ziyaretçileri görüntüleme, kayıt arama |
| Yönetici | Güvenlik personeli yetkileri, geçmiş kayıtlara erişim, istatistik/rapor |
| Ziyaretçi | QR bağlantısı üzerinden kendi giriş/çıkış kaydını oluşturma veya tamamlama |

**Kimlik doğrulama:** Görevli/yönetici için kullanıcı kaydı ve giriş akışı geliştirilecektir. Ziyaretçiler için QR formu hızlı kayıt yoludur; kayıt formu bir personel oturumunun yerine geçmez. Bu ayrım ders sorumlusuyla teyit edilecek ve gerekiyorsa ziyaretçi hesapları eklenecektir.

## Temel iş akışları

**QR girişi**
1. Güvenlik noktasındaki güncel "Giriş" QR kodunu tara.
2. Ad, soyad, telefon numarasını forma gir.
3. Geçerli QR ve alan denetimlerinden sonra giriş kaydını oluştur.
4. Kayıt numarası / kısa doğrulama kodunu kişiye göster.

**Manuel giriş**
1. Güvenlik görevlisi kullanıcı hesabıyla giriş yapar.
2. Ad, soyad, telefon alanlarını doldurur.
3. Sistem zaman damgası ile giriş kaydını kaydeder.

**Çıkış**
1. Görevli açık kayıtlardan ilgili kişiyi seçer; **veya** kişi "Çıkış" QR bağlantısıyla kendi açık kaydını doğrular.
2. Sistem girişe ait çıkış zamanını yazar; ikinci kez çıkış oluşturulamaz.

## Planlanan temel modüller

- Kayıt/giriş ve rol tabanlı yetkilendirme
- QR giriş ve QR çıkış bağlantıları; süreli ve imzalı token kontrolü
- Güvenlik panelinde manuel giriş ve çıkış
- İçeride olanların listesi; ad, soyad, telefon ile arama (yetkili kullanıcı)
- Günlük giriş-çıkış raporları, sayısal özetler ve grafik
- Anlık kayıt güncellemesi (SSE veya WebSocket)
- Kişisel veri erişim sınırları ve kullanıcı işlemi kayıtları

## Teknoloji ve ders gereksinimi

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Veritabanı:** MySQL (alternatifler onay sonrası değerlendirilebilir)
- **Kimlik doğrulama:** Görevli ve yönetici için hesap/giriş
- **Canlı dağıtım:** 6. hafta (10 Kasım 2026) için planlanan hedef
- **Seçilen üç teknik özellik:** Rol tabanlı yetkilendirme, gerçek zamanlı güncelleme, raporlama/grafik

## Durum ve teslim hedefleri

- [x] GitHub deposu var; konu yeni güvenlik giriş-çıkış sistemine çevrildi
- [x] İlk kapsam ve gereksinim taslakları hazırlandı
- [ ] En az üç gerçek kullanıcı görüşmesiyle problem doğrulansın
- [ ] React/Express/MySQL uygulaması geliştirilsin ve test edilsin
- [ ] 10 Kasım ilk çalışan proje sunumu için canlı URL sağlansın
- [ ] 24 Kasım'da tamamlanmış uygulama için test senaryoları hazırlansın
- [ ] Ekipteki iki kişinin de düzenli GitHub commit'i bulunsun

## Belgeler

- [PROBLEM.md](PROBLEM.md) — Problem kartı, görüşme alanları
- [GEREKSINIMLER.md](GEREKSINIMLER.md) — Yazılım gereksinimleri ve kabul ölçütleri
- [AI_LOG.md](AI_LOG.md) — Yapay zekâ kullanım günlüğü
- [.env.example](.env.example) — Gizli bilgi içermeyen örnek yapılandırma

## Gizlilik ve güvenlik

QR kodun içinde ad, soyad veya telefon numarası taşınmaz; yalnızca kısa süreli, sunucu tarafından doğrulanan işlem bağlantısı olur. Kişisel bilgiler yalnızca yetkili kullanıcılara gösterilir. GitHub'a gerçek ziyaretçi kayıtları veya şifreler yüklenmez. Sistem yalnızca kullanıcı beyanına dayanarak kimlik doğruluğunu garanti ettiğini iddia etmez.

## Depo adının değiştirilmesi

Önerilen ad: `Guvenlik-Giris-Cikis-Takip-Sistemi`. GitHub'da **Settings → General → Repository name → Rename** üzerinden bu adla yeniden adlandırılabilir. İçerik ve commit geçmişi korunur.


## İlk sürümü çalıştırma (8 Kasım)
1. Node.js 20+ ve MySQL kurun.
2. `git clone https://github.com/MertKasap/Guvenlik-Giris-Cikis-Takip-Sistemi.git`
3. `npm install`
4. `.env.example` dosyasını `.env` olarak kopyalayın; MySQL, güçlü gizli anahtarlar ve ilk yönetici bilgilerini ekleyin.
5. MySQL'de `CREATE DATABASE security_entry_exit CHARACTER SET utf8mb4;` komutunu çalıştırın.
6. Terminal 1: `npm run dev` (Express API, port 3000)
7. Terminal 2: `npm run dev:web` (React, http://localhost:5173)
8. Test: `npm test` | Üretim derlemesi: `npm run build`

İlk yönetici, yalnızca daha önce yönetici yoksa `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ile oluşturulur. Yönetici panelinden güvenlik personeli hesabı açılabilir. QR'ın telefondan açılması için `PUBLIC_BASE_URL` gerçek cihazdan erişilebilir URL olmalıdır.

**Yayın:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). **Sunum kontrolü:** [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md).

Uygulama geliştirme aşamasındadır. Kaynak kodun gönderilmiş olması, MySQL ile uçtan uca testin veya canlı sitenin tamamlandığı anlamına gelmez.
