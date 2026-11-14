// Sitenin ayarları.
// Canlı abone sayısı için YouTube Data API v3 anahtarını tırnakların arasına yapıştır.
// (Anahtar sitede herkese görünür; bu normaldir. Google Cloud'da sadece
//  https://aslan-cr.github.io/* adresine ve YouTube Data API v3'e kısıtlaman yeterli.)
window.RSA_CONFIG = {
  youtubeApiKey: "",
  // Abone sayısı kaç saniyede bir kontrol edilsin
  refreshSeconds: 30,
};
