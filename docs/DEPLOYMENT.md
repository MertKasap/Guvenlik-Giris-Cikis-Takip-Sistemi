# Canlı Yayın Kurulumu (Railway + MySQL)
> Bu belge **yapılmış bir yayın** değildir; henüz gerçek bir canlı URL doğrulanmadı.

## Ön koşul
GitHub Actions üzerinde birim testleri ve React derlemesi başarılı olmalıdır. MySQL veritabanı kalıcı hizmet olarak kurulmalıdır.

## Railway adımları
1. Railway hesabını GitHub'a bağla ve bu depodan **New Project → Deploy from GitHub Repo** ile Node servisi oluştur.
2. Projeye **MySQL** hizmeti ekle ve bağlantı bilgilerini Node servisinin ortam değişkenlerine tanımla: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
3. Build: `npm install && npm run build`. Start: `npm start`.
4. NODE_ENV=production, JWT_SECRET (32+ karakter), QR_SIGNING_SECRET (32+ karakter), QR_TTL_SECONDS=60, ADMIN_EMAIL ve ADMIN_PASSWORD (12+ karakter) değişkenlerini ekle.
5. Servis için herkese açık HTTPS alan adı üret; ardından PUBLIC_BASE_URL değişkenine bu URL'yi tam olarak yazıp yeniden deploy et.
6. `https://alan-adin/api/health` adresinin `{"ok":true}` döndüğünü doğrula.
7. Telefonda QR giriş ve çıkış, manuel kayıt, oturum ve rapor sayısını gerçekten test et.

## Gizlilik ve teknik kısıtlar
Gerçek kişi bilgilerini test için kullanma. Sadece örnek/izinli veriler kullan. Şifreleri ve bağlantı anahtarlarını GitHub'a yükleme. Canlı ortam için güvenlik incelemesi, veritabanı yedeği, erişim sınırları ve kişisel veri saklama/silme politikası ayrıca gözden geçirilmelidir. İlk sürümde otomatik testler çekirdek doğrulama mantığını kapsar; gerçek MySQL ile entegrasyon testleri ayrıca yapılmalıdır.
