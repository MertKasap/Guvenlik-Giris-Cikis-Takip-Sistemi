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
