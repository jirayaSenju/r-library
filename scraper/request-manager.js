const axios = require('axios');
const iconv = require('iconv-lite');

class RequestManager {
  constructor() {
    this.requestCache = new Map();
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,ru;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      responseType: 'arraybuffer'
    });
  }

  async makeRequest(url) {
    if (this.requestCache.has(url)) {
      return this.requestCache.get(url);
    }

    try {
      console.log(`📡 Fazendo request para: ${url}`);
      const response = await this.axiosInstance.get(url);

      let html;
      const contentType = response.headers['content-type'] || '';

      if (contentType.includes('windows-1251') || contentType.includes('cp1251')) {
        html = iconv.decode(response.data, 'win1251');
      } else if (contentType.includes('utf-8')) {
        html = iconv.decode(response.data, 'utf8');
      } else {
        // Tentativa conservadora: decodifica como win1251, que é comum para rutracker
        html = iconv.decode(response.data, 'win1251');
      }

      this.requestCache.set(url, html);
      return html;
    } catch (error) {
      console.error(`❌ Erro ao acessar ${url}:`, error.message);
      throw error;
    }
  }

  clearCache() {
    this.requestCache.clear();
  }

  getCacheSize() {
    return this.requestCache.size;
  }
}

module.exports = new RequestManager();
