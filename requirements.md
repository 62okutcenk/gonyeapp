# CraftForge - Marangoz Proje Yönetim SaaS

## Orijinal Gereksinimler
Multi-tenant bir SaaS projesi - marangozlar ve yapı tasarım ürünleri yapanlar için.

### Temel Özellikler
1. **Kurulum Sihirbazı**: İlk kayıt sonrası step-by-step firma kurulumu
2. **Gruplar & Alt Görevler**: Planlama, Üretim, Montaj, Kontrol aşamaları
3. **İş Kalemleri**: Kapı, dolap, vestiyer vb. ürün tanımları
4. **Proje Yönetimi**: İş kalemlerini seçerek proje oluşturma, otomatik görev atama
5. **RBAC Yetki Sistemi**: Rol ve izin yönetimi
6. **Kullanıcı Yönetimi**: Renk ataması ile ekip üyeleri
7. **Gerçek Zamanlı Bildirimler**: WebSocket ile anlık bildirimler
8. **Dosya Yükleme**: Proje dosyaları yönetimi
9. **Logo Yönetimi**: Açık/koyu tema için ayrı logolar
10. **Koyu Mod Desteği**: Tema değiştirme

### Kullanıcı Tercihleri
- JWT tabanlı authentication
- Türkçe dil desteği
- Açık mod varsayılan
- Modern minimalist UI
- Detaylı durum takibi: Bekliyor, Planlandı, Üretimde, Kontrol, Tamamlandı
- Telefon formatı: 0 (xxx) xxx xx xx
- Türk Lirası formatı

## Tamamlanan Görevler

### Backend (FastAPI + MongoDB)
- [x] JWT authentication sistemi
- [x] Multi-tenant veri izolasyonu
- [x] RBAC rol ve izin sistemi
- [x] Gruplar, alt görevler, iş kalemleri CRUD
- [x] Proje oluşturma ve görev yönetimi
- [x] Kullanıcı yönetimi ve renk ataması
- [x] WebSocket bildirim sistemi
- [x] Dosya yükleme/indirme
- [x] Dashboard istatistikleri
- [x] Genişletilmiş firma bilgileri (il/ilçe, vergi dairesi, vb.)

### Frontend (React)
- [x] Login/Register sayfaları
- [x] Kurulum Sihirbazı (4 adımlı)
- [x] Dashboard (özet ve istatistikler)
- [x] Proje listesi ve detay sayfaları
- [x] Yeni proje oluşturma (iş kalemi seçimi)
- [x] Setup sayfaları (gruplar, iş kalemleri, roller, ayarlar)
- [x] Kullanıcı yönetimi
- [x] Koyu mod desteği ve tema değiştirme
- [x] Sidebar'da logo gösterimi
- [x] İl/İlçe dinamik seçimi
- [x] Vergi dairesi seçimi
- [x] Telefon numarası formatı

## Sonraki Görevler
- [ ] Proje düzenleme modalı
- [ ] Görev atama bildirimleri
- [ ] Proje filtreleme ve sıralama
- [ ] Raporlama ve analitik dashboard
- [ ] Dosya önizleme (PDF, resim)
- [ ] Toplu görev güncelleme
- [ ] Müşteri portal erişimi
- [ ] Para birimi desteği (fiyat alanları)
