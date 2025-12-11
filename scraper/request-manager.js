const axios = require('axios');
const iconv = require('iconv-lite');
const { HttpsProxyAgent } = require('https-proxy-agent');

class RequestManager {
  constructor() {
    this.requestCache = new Map();
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
    const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,ru;q=0.7',
        // axios will automatically set encoding, but include common headers to mimic a browser
        'Connection': 'keep-alive'
      },
      responseType: 'arraybuffer',
      // when using a custom agent, disable axios proxy support
      ...(agent ? { httpAgent: agent, httpsAgent: agent, proxy: false } : {})
    });
  }

  async makeRequest(url) {
    if (this.requestCache.has(url)) {
      return this.requestCache.get(url);
    }

    try {
      console.log(`📡 Fazendo request para: ${url}`);
      let response = await this.axiosInstance.get(url);

      // Se o site respondeu 403, tentamos novamente com headers adicionais (Referer, fetch headers)
      if (response && response.status === 403) {
        console.warn(`⚠️ Recebido 403 para ${url}, tentando com headers alternativos...`);
        response = await this.axiosInstance.get(url, {
          headers: {
            'Referer': 'https://rutracker.org/',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document'
          }
        });
      }

      let html;
      const contentType = (response.headers && response.headers['content-type']) || '';

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
      // Se houver resposta com status 403, torne a mensagem mais explícita
      const status = error.response && error.response.status;
      if (status === 403) {
        console.error(`❌ Erro 403 ao acessar ${url}: possivelmente o host está bloqueando o runner do CI.`);
      } else {
        console.error(`❌ Erro ao acessar ${url}:`, error.message);
      }
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
