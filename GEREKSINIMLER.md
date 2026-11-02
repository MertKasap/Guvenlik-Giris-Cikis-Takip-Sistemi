# Yazılım Gereksinimleri — QR ve Manuel Güvenlik Giriş-Çıkış Takip Sistemi

**Sürüm:** 1.0 (2 Kasım 2026)  
**Durum:** Taslak; hedef kurum görüşmeleri ve öğretim elemanı onayı bekliyor.

## Amaç ve Kapsam
Güvenlik noktasında giriş yapan kişilerin **ad, soyad ve telefon numarası** ile **QR** veya **manuel** olarak kayıt edilmesi. Giriş ve çıkış saatlerinin aynı ziyaret kaydında saklanması; içeridekilerin ve geçmiş kayıtların yetkili kullanıcılarca takip edilmesi.

## Kullanıcı Rolleri
- **Ziyaretçi:** QR giriş formunu doldurur; uygun doğrulamayla çıkış QR işlemi başlatır.
- **Güvenlik görevlisi:** Hesabıyla oturum açar; manuel giriş ve çıkış oluşturur, aktif listeyi görür.
- **Yönetici:** Kullanıcı rolleri, işlem geçmişi ve raporları yönetir.

## Fonksiyonel Gereksinimler

| Kod | Gereksinim | Öncelik |
| --- | --- | --- |
| FR-01 | Güvenlik personeli/yönetici kaydı ve oturum açma | Zorunlu |
| FR-02 | En az iki farklı personel rolü ve sunucu taraflı yetkilendirme | Zorunlu |
| FR-03 | QR ile ad-soyad-telefon alanlı giriş formu | Zorunlu |
| FR-04 | Görevli tarafından aynı bilgilerle manuel giriş | Zorunlu |
| FR-05 | Her kayda sunucu kaynaklı giriş saati ve tekil kimlik | Zorunlu |
| FR-06 | Aktif giriş kaydına personel tarafından çıkış kaydı | Zorunlu |
| FR-07 | Ayrı QR çıkış akışı ve kayıt doğrulama | Hedef |
| FR-08 | İkinci çıkışın ve zaman tutarsızlığının engellenmesi | Zorunlu |
| FR-09 | Aktif içeridekiler listesi; yetkiye bağlı arama ve filtreleme | Zorunlu |
| FR-10 | Veritabanı verilerine dayalı günlük özet/grafik | Zorunlu |
| FR-11 | SSE/WebSocket ile anlık güncelleme | Zorunlu |
| FR-12 | Süreli, imzalı QR bağlantısının sunucuda doğrulanması | Hedef |
| FR-13 | Kaydın QR mı manuel mi oluşturulduğunun saklanması | Zorunlu |

## Kullanıcı Senaryoları
1. **QR giriş:** Giriş QR'ı → form → doğrulama → kayıt → giriş saati.
2. **Manuel giriş:** Görevli oturumu → form → doğrulama → kayıt → giriş saati.
3. **Çıkış:** Görevli açık kaydı sonlandırır veya ziyaretçi çıkış QR akışında ilgili açık kaydı güvenli biçimde doğrular → çıkış zamanı.
4. **Kontrol:** Yetkili görevli içeridekileri görür, kayıt arar ve yönetici raporları inceler.

## Veri Modeli (öneri)
- `users(id, name, email, password_hash, role, created_at)`
- `visits(id, first_name, last_name, phone, entry_at, exit_at, method, created_by, status)`
- `audit_logs(id, actor_id, visit_id, action, timestamp)`
- `qr_tokens(token_hash, purpose, expires_at, used_at)`

## İş Kuralları ve Kabul Kriterleri
- Ad, soyad veya telefon eksikse kayıt reddedilir.
- Giriş/çıkış tarih-saatleri sunucu tarafından belirlenir.
- Kişi açık kayıt olmadan çıkış yapamaz; mükerrer çıkış reddedilir.
- QR token içinde kişi bilgileri bulunmaz; süre sonu ve sahte token reddedilir.
- Ziyaretçi başka kişilerin telefon veya kayıtlarını göremez.
- Güvenlik personeli yönetici işlemlerine erişemez.
- QR ve manuel kayıtlar ortak listede görünür ve kaynak türüne göre ayrıştırılabilir.
- Grafik ve özetler gerçekten kaydedilmiş veritabanı bilgilerinden üretilir.

## Fonksiyonel Olmayan Gereksinimler
- **Güvenlik:** HTTPS, şifre hash, yetki kontrolleri, hız sınırlama, sunucu taraflı giriş doğrulama.
- **Gizlilik:** Telefon numaraları sınırlı erişime açıktır; saklama süresi, aydınlatma ve silme politikası gerçek kurumla belirlenecek.
- **Kullanılabilirlik:** Mobil uyumlu QR formu; açık başarı/hata durumları.
- **Süreklilik:** Kalıcı veritabanı; uygulama yeniden başlasa da kayıtlar korunur.
- **Yayın:** 6. hafta için herkese açık URL hedefi; canlı çalışma ayrıca doğrulanmalı.

## Teknoloji
React (Vite), Node.js (Express), MySQL. Dersin üç ek özelliği: **rol tabanlı yetkilendirme, gerçek zamanlı güncelleme, raporlama/grafik**.

## Test Örnekleri
- Geçerli QR ile giriş, süresi dolmuş QR reddi
- Manuel giriş, eksik telefon reddi
- Çıkışın tek sefer gerçekleştirilmesi
- Yetkisiz yönetici isteğinin reddi
- Veritabanı kaydından rapor üretimi
- Mobil form ve klavye erişilebilirliği

## Açık Sorular
- Üç gerçek kişiyle görüşme yapılması ve kurumun belirlenmesi
- QR çıkış doğrulaması için güvenli yöntemin seçimi
- Ziyaretçilere hesap açma zorunluluğunun ders sorumlusuyla netleştirilmesi
- Kişisel veri saklama, silme ve aydınlatma planı
- Canlı URL, test kullanıcıları ve konu onayı
