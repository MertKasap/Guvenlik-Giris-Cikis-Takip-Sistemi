# Yapay Zekâ Kullanım Günlüğü

## 18 Ekim 2026 — İlk konu
Önceki araç giriş yönetimi konusundaki planlama ve dokümanların hazırlanmasında yapay zekâ kullanıldı. Ayrıntılar ilk commit geçmişinde mevcuttur.

## 2 Kasım 2026 — Konu değişikliği
**Ne istendi?** Projenin araç takip konusundan QR veya manuel kayıt ile çalışan **güvenlik giriş-çıkış takip sistemine** dönüştürülmesi; eski README ve problem kartının güncellenmesi ve gereksinim dokümanı oluşturulması.

**Ne üretildi?** README.md, PROBLEM.md, GEREKSINIMLER.md, örnek ortam değişkenleri ve DOCX gereksinim belgesi taslağı. Giriş ad-soyad-telefon, çıkış zamanı, iki alternatif kayıt kanalı ve yetkili paneli için iş akışları ve kabul kriterleri tanımlandı.

**Neler kontrol edilmeli / neden?** Kişisel veri güvenliği ve QR çıkış doğrulama riskleri nedeniyle gerçek kişi bilgileri üretilmedi, görüşme alanları boş bırakıldı. Taslak özellikler bitmiş uygulama olarak sunulmadı. Öğrencilerin kodu ve gereksinimleri anlayıp test etmesi, gerçek görüşmeleri yapması ve ders onayı alması gerekiyor.

**Durum:** GitHub dokümantasyonu güncellendi; bu dosyalar tek başına çalışan veya canlıya alınmış uygulama değildir.


## 8 Kasım 2026 — İlk uygulama kaynak kodları
**İstek:** QR ve manuel güvenlik giriş-çıkış uygulamasının geliştirilmesi, GitHub'a anlamlı commit'ler eklenmesi ve canlı yayın hazırlığı.

**Üretilen:** Express/MySQL backend, QR token doğrulama, görevli/yönetici oturumu, manuel/QR kayıt, çıkış ve raporlama API'leri, React arayüzü, QR gösterim ekranı, otomatik CI test/derleme yapılandırması ve yayın dokümantasyonu.

**Yapılan düzeltme:** QR çıkış formunda yeniden ad-soyad istemek yerine telefon ve kişiye verilen çıkış kodu kullanılacak şekilde arayüz güncellendi.

**Kontrol edilmesi gerekenler:** Bağımlılıkların kurulması, CI sonuçları, canlı MySQL entegrasyonu, HTTPS alan adı, QR'ın gerçek telefondan okunması ve kişisel veri güvenliği. Yapılmayan kontroller yapılmış gibi beyan edilmez.

## 8 Kasım 2026 — Railway ilk dağıtım
**İstek:** Uygulamayı GitHub'dan Railway'e canlı yayın için taşımak.

**Yapılan:** Railway'de `Guvenlik-Giris-Cikis` projesi oluşturuldu. Kalıcı diskli MySQL servisi kuruldu; `guvenlik-web` servisi GitHub `main` dalına bağlandı. Ortam değişkenleri Railway üzerinde gizli değer olarak ayarlandı; Railway alan adı üretildi.

**Doğrulama:** Railway'de iki servisin dağıtım durumu SUCCESS. Sunucu logunda ilk yönetici oluşturuldu ve HTTP dinleyicisi başladı. GitHub Actions birim test/React derlemesi başarılı. Kamuya açık URL için dış ağdan uçtan uca işlevsel test bu adımda henüz doğrulanmadı.

**Eksikler:** Giriş, QR ve manuel kayıt, çıkış, SSE yenileme ve yetki testleri tarayıcı/telefonla tamamlanmalı. Gerçek kişisel veri yerine izinli sahte test verisi kullanılmalı.

## 8 Kasım 2026 — QR çıkış kodu kopyalama hatası düzeltmesi

**Geri bildirim:** QR ile oluşturulan giriş kaydının çıkış kodu, ekrandaki "Kodu kopyala" butonu kullanıldığında eşleşmedi; kullanıcı kodu kendisi seçip kopyalayınca çıkış başarılı oldu. Railway HTTP günlüklerinde QR çıkış denemeleri 409 ile dönmüştü.

**Değişiklik:** Panoya kopyalama artık `await` ile sonuç kontrolü yapıyor. Kopyalama izni olmayan tarayıcılarda yedek yöntem deneniyor; başarı ve başarısızlık kullanıcıya bildiriliyor. Çıkış kodu salt-okunur, tıklayınca tamamı seçilen bir alanda gösteriliyor.

**Neden:** Önceki sürümde `navigator.clipboard?.writeText(...)` çağrısının başarısızlığı sessizce göz ardı ediliyordu.

**Kapsam:** Sunucudaki QR doğrulama, veritabanı ve kayıt eşleştirme algoritması değiştirilmedi. Gerçek cihazda butonun davranışı ayrıca doğrulanmalıdır.

## 8 Kasım 2026 — QR çıkış kaydı eşleştirme iyileştirmesi
**İstek:** QR girişten sonra özel kodun kopyalanmasında güçlük ve QR çıkışta 409 hatası.
**İnceleme:** Railway günlüklerinde QR giriş için HTTP 201, çıkış için HTTP 409 yanıtları bulundu. Telefon ve kodun eşleşmemesi olasılığı incelendi.
**Düzeltme:** Önceden eklenmiş mobil kopyalama düzeltmesi korundu. Yeni çıkış kodları dört gruplu 16 hex karaktere çevrildi. Girilen telefonlar normalize edildi; eski kayıtlardaki 05, 90, +90 ve 10 haneli sürümler çıkışta eşleştirilebiliyor. Eski uzun kodların hash algoritması korundu. QR kod süresi değişmedi.
**Kontrol:** Birim testleri ve Railway dağıtımı ayrıca doğrulanacak. Kod kayıpsa hash'ten kurtarılamaz; yetkili güvenlik görevlisinin manuel çıkış yapması gerekir.

## 8 Kasım 2026 — Mobil hızlı doldurma iyileştirmesi
**Geri bildirim:** QR kayıt ve çıkış ekranlarında ad, soyad ve telefon için tarayıcıdan hızlı doldurma/öneri seçimi kullanılamadı.
**Ön değerlendirme:** Form alanları `autocomplete` içeriyordu fakat `name` bilgisi eksikti. Bu durum mobil tarayıcıların yerleşik otomatik doldurma özelliğini etkileyebilir; belirli bir telefonda doğrulanmış neden değildir.
**Değişiklik:** `name`, `id`, `autoComplete`, `autoCapitalize`, `inputMode` ve `onInput` tanımları eklendi. Giriş ve çıkış API'lerine gönderilecek değerler submit sırasında `FormData` ile gerçek form alanlarından okunuyor. Kopyalama düzelmesi korunuyor.
**Doğrulama ihtiyacı:** Chrome ve Safari'de tarayıcı otomatik doldurma önerisinin görünmesi, dokunmayla doldurma, QR giriş/çıkış ve manuel kayıt yeniden test edilmeli.

## 8 Kasım 2026 — Yönetici giriş kurtarma düzeltmesi
**Geri bildirim:** Railway Variables içindeki `ADMIN_PASSWORD` ile MySQL `users.password_hash` sütunu düz metin olarak değiştirilmiş, yönetici girişi bozulmuş.
**Neden:** Giriş işlemi bcrypt hash doğrulaması yapar. Değişken değiştirilince mevcut kullanıcının hash değeri otomatik güncellenmez.
**Çözüm:** `ADMIN_PASSWORD_RESET_ON_START=true` sadece yönetici e-postası eşleştiğinde yeni güçlü parolanın bcrypt özetini ilgili hesapta oluşturur. Tek seferlik kurtarma sonrasında değişken `false` yapılmalıdır. Hiçbir gerçek parola repoya eklenmemiştir.
