# GPA Hesaplayıcı

Tarayıcıda çalışan, kurulum gerektirmeyen bir GPA hesaplayıcı.

## Özellikler

- **Ders ekleme**: ders adı ve kredi
- **Bileşenler**: Vize (midterm), Quiz, Ödev/Proje, Ders Dışı Etkinlik, Final
- **Adet ayarı**: her bileşende kaç vize/quiz/ödev/etkinlik olduğunu seç
- **Yüzdelik kontrol**: her bileşenin ders notuna etkisi kaydırıcı veya sayı ile (%) ayarlanır; toplam %100 değilse uyarı verir
- **Ayrı yüzdeler**: bir bileşenin içindeki öğelere (ör. Quiz 1 %70, Quiz 2 %30) farklı pay verilebilir
- **Kısmi hesap**: henüz girilmemiş notlar hesaba katılmaz, o ana kadarki ortalama gösterilir
- **Dönem GPA ve Genel GPA (CGPA)**: önceki GPA ve kredi girilirse genel ortalama hesaplanır
- **Düzenlenebilir harf notu skalası** (varsayılan: AA–FF, 4'lük sistem)
- Veriler tarayıcıda (`localStorage`) otomatik saklanır
- **Boğaziçi'den ders seç**: Boğaziçi ders programındaki tüm dersler (kod, ad, kredi, AKTS) aranıp tek tıkla eklenir

## Ders listesini güncelleme

Ders verisi `data/courses.js` dosyasındadır. Yeni dönem için `tools/departments.json` içindeki
`semester` ve bölüm linklerini güncelleyip şunu çalıştır:

```bash
node tools/fetch-courses.mjs
```

## Çalıştırma

`index.html` dosyasını tarayıcıda açman yeterli. Yerel sunucu ile:

```bash
npx http-server -p 5173 .
```
