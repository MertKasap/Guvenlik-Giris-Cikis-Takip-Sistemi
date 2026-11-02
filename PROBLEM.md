# PROBLEM KARTI — QR ve Manuel Güvenlik Giriş-Çıkış Takip Sistemi

**Belge durumu:** Görüşmeler ve öğretim elemanı onayı bekleyen taslak (2 Kasım 2026)

## 1. Gerçek problem ve problemi yaşayanlar

**Problem hipotezi:** Kurum/tesis girişlerinde defter, tablo veya dağınık dijital kayıtlar kullanılması; içerideki kişi listesinin güncelliğini, giriş/çıkış saatlerinin eşleştirilmesini ve geçmiş ziyaretlerin sorgulanmasını zorlaştırabilir.

**Hedef gerçek kurum:** [Kurumun adı — araştırılarak doldurulacak]

**İletişim kişisi / onay veren yetkili:** [İzinli bilgiler, görevi, iletişim yöntemi]

**İlgili roller:** Güvenlik görevlisi; tesis yöneticisi; ziyaretçi veya tesise giriş yapan kişi.

Bu bölümdeki sorunlar *varsayımdır*; belirli bir kurumda doğrulanmış yaşanmış sorunlar olduğu ileri sürülmemektedir.

## 2. İş bugün nasıl yapılıyor?

Görüşmede doğrulanacak sorular:
- Girişte ziyaretçi bilgileri deftere mi, Excel'e mi, uygulamaya mı işleniyor?
- İsim, soyisim, telefon ve giriş-çıkış saati gerçekten tutuluyor mu?
- Çıkış yapmayan kayıtlar nasıl kontrol ediliyor?
- Giriş noktasında internet / telefon erişimi var mı?
- Bilgiler kimler tarafından görüntülenebiliyor?

**Gerçek mevcut iş akışı:** [Görüşme sonucuyla doldurulacak]

## 3. En az üç gerçek kişiyle görüşme

### Görüşme 1 — Güvenlik görevlisi
- Tarih / görev / kurum: [Doldurulacak]
- İzinli iletişim bilgisi veya kanalı: [Doldurulacak]
- Mevcut işlem sırası: [Gerçek yanıt]
- Yaşanan somut sorun ve örnek: [Gerçek yanıt]
- Öncelikli ihtiyaç: [Gerçek yanıt]

### Görüşme 2 — Yönetici / idari personel
- Tarih / görev / kurum: [Doldurulacak]
- İzinli iletişim bilgisi veya kanalı: [Doldurulacak]
- Geçmiş ve raporlama ihtiyacı: [Gerçek yanıt]
- Yaşanan somut sorun ve örnek: [Gerçek yanıt]
- Öncelikli ihtiyaç: [Gerçek yanıt]

### Görüşme 3 — Giriş yapan kişi / ziyaretçi
- Tarih / görev / kurum: [Doldurulacak]
- İzinli iletişim bilgisi veya kanalı: [Doldurulacak]
- QR kod ile kayıt hakkındaki deneyim: [Gerçek yanıt]
- Manuel kayıt gerektiği durumlar: [Gerçek yanıt]
- Öncelikli ihtiyaç: [Gerçek yanıt]

**Önemli:** Gerçek görüşmeler yapılmadıysa tamamlanmış gibi gösterilmeyecek. Telefon numarası vb. kişisel veriler kişinin izni olmadan herkese açık GitHub'a yazılmayacak.

## 4. Önerilen çözüm ve üç ana özellik

1. **İki seçenekli kayıt:** QR ile kişinin kendini kaydetmesi ya da güvenlik görevlisinin aynı ad-soyad-telefon alanlarıyla manuel kayıt yapması.
2. **Giriş-çıkış eşleştirme:** Tekil giriş kaydı üzerinde zaman damgaları; aktif ziyaretçi listesi; görevli çıkışı veya ayrı çıkış QR'ı.
3. **Kontrol paneli:** Güvenlik ve yönetici rolleri için erişim kuralları, arama, aktif kişi sayısı ve dönemsel raporlar.

## 5. Seçilen teknik özellikler

Yönergede gereken **en az üç** özellik:
- Rol tabanlı yetkilendirme
- Gerçek zamanlı güncelleme (SSE/WebSocket)
- Veritabanına bağlı raporlama / grafik

## 6. Beklenen fayda ve özgünlük

Tek bir sistemde QR ve manuel yöntemler birbirinin alternatifi olarak çalışır; kayıtlar aynı veri modeline bağlanır. Güvenlik personeli, içeride bulunan kişileri ve çıkışı henüz yapılmamış kayıtları kontrol edebilir. Çözüm yalnızca bir form/listeden oluşmayacak; yetkili yönetim paneli ve işlem akışı içerecektir.

## 7. Doğrulanması gerekenler

- [ ] Gerçek kurum ve problem sahibi belirlendi
- [ ] Üç görüşme gerçekleştirildi
- [ ] Manuel ve QR süreci hedef kurum için doğrulandı
- [ ] Öğretim elemanından konu onayı alındı
- [ ] Kişisel veri toplama amacı, saklama süresi ve erişim yetkileri kararlaştırıldı
