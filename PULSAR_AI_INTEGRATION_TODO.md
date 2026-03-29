# 🚀 Pulsar & Pulsar AI Entegrasyon Görev Listesi (Full Recipe)

Bu liste, iki farklı projenin (Main System ve AI Assistant) birbiriyle nasıl konuşacağını ve AI'nın gerçek sistem kontrolüyle nasıl birleştirileceğini adım adım açıklar.

## 📌 Proje 1: `pulsar/dashboard` (Ana Sistem)
### Amacı: Dahili "AssistantView" sekmeklerini temizlemek ve AI'yı dış bir sekme olarak bağlamak.

1. **[ ] src/App.jsx Temizliği:**
   - `import AssistantView from './AssistantView';` satırını kaldır.
   - `AssistantView` bileşenini (JS/JSX) projeden tamamen sil (dosyayı komple silebilirsin).
   - `viewMode === 'assistant'` kontrolünü ve render edildiği kısmı sil.

2. **[ ] Navigasyon Güncellemesi:**
   - Navigasyon barındaki "AI ASISTAN" butonuna tıklandığında `setViewMode('assistant')` yerine şunu yaz: 
     `onClick={() => window.open('http://localhost:5173', '_blank')}`
   - *Not: `http://localhost:5173`, pulsarai projesinin varsayılan portudur.*

---

## 📌 Proje 2: `pulsarai` (Yapay Zeka Asistanı)
### Amacı: Ana sistemin verilerini dinlemek (WebSocket) ve ana sisteme komut göndermek (API).

1. **[ ] Yeni Hook: usePulsarSync.ts Olustur:**
   - `ws://localhost:8000/ws` adresine bağlanulan bir WebSocket istemcisi yaz.
   - Gelen JSON verilerini parse et (`trust_score`, `tick`, `active_attack`, `threat_level`).
   - Bu verileri global bir `PulsarContext` veya `App.tsx`'deki `state`'lere aktar.

2. **[ ] src/App.tsx Gerçek Veri Bağlantısı:**
   - Mevcut sahte (Math.random) simülasyonları kaldır.
   - 3D Eva modelinin renklerini ve HUD metriklerini (CPU, Güven Skoru vb.) WebSocket'ten gelen **gerçek** verilerle besle.

3. **[ ] Gemini Prompt (Bağlam) Enjeksiyonu:**
   - `src/lib/gemini.ts` içindeki `askPulsarAI` fonksiyonuna her mesajda sistem durumunu gönder:
     `System context: Current Trust Score is ${trustScore}, Active Attack is ${activeAttack}.`

4. **[ ] Sesli Komut Köprüsü (useVoiceCommands.ts):**
   - **Tetikleyici Ekle:** "Jamming başlat", "Spoofing testi yap", "Saldırıyı durdur" gibi sesli komutları `matchCommand` fonksiyonuna ekle.
   - **API Çağrısı:** `processCommand` içinde bir komut algılandığında:
     - `axios.post('http://localhost:8000/api/attack/start', { attack_name: 'jamming' })`
     - `axios.post('http://localhost:8000/api/attack/stop', { attack_name: 'jamming' })` 
     gibi API çağrılarını tetikle.

---

## 🛠 Teknik Gereksinimler & İpuçları
- **CORS:** Pulsar backend tarafında (Python/FastAPI genelde) `localhost:5173`'e CORS izni verilmiş olmalı.
- **Portlar:** 
  - Backend: `8000`
  - Dashboard: `3000` (veya sizin portunuz)
  - AI Assistant: `5173`
- **Yapay Zeka Mantığı:** Gemini'nin sistem verilerini bilmesi için "System Instruction" bölümü her sorguda güncel veriyle beslenmelidir.

---
*Hazırlayan: Antigravity AI Assistant*
