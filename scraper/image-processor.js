const requestManager = require('./request-manager');
const cheerio = require('cheerio');
const utils = require('./utils');

class ImageProcessor {
  constructor() {
    this.baseUrl = 'https://rutracker.org';
  }

  async extractFirstImage($, postBody, baseReference = null) {
    let cover = null;

    try {
      console.log("🔍 Procurando primeira imagem...");

      const foundImages = [];
      this.extractFromVarElements($, postBody, foundImages, baseReference);
      this.extractFromImgElements($, postBody, foundImages, baseReference);

      console.log(`📸 Encontradas ${foundImages.length} imagens no post`);

      if (foundImages.length > 0) {
        console.log(`🔗 Resolvendo URLs diretas...`);
        cover = await this.resolveDirectImageUrl(foundImages);
      }

      if (!cover) {
        console.log('❌ Nenhuma imagem direta válida encontrada');
      }

    } catch (error) {
      console.error('❌ Erro na extração da imagem:', error);
    }

    return cover;
  }

  extractFromVarElements($, postBody, foundImages, baseReference) {
    let origin = this.baseUrl;
    try {
      if (baseReference) {
        origin = new URL(baseReference).origin;
      }
    } catch (e) {
      origin = this.baseUrl;
    }

    postBody.find('var').each((i, el) => {
      const $var = $(el);
      const title = $var.attr('title');

      if (title && (title.includes('fastpic') || title.includes('imageban') || title.includes('.jpg') || title.includes('.png') || title.includes('.jpeg'))) {
        let src = title.startsWith('http') ? title : `${origin}${title.startsWith('/') ? '' : '/'}${title}`;
        src = src.split('?')[0];

        if (this.isIrrelevantImage(src)) return;
        src = this.convertThumbToBig(src);
        if (!foundImages.includes(src)) foundImages.push(src);
      }
    });
  }

  extractFromImgElements($, postBody, foundImages, baseReference) {
    let origin = this.baseUrl;
    try {
      if (baseReference) origin = new URL(baseReference).origin;
    } catch (e) { origin = this.baseUrl; }

    postBody.find('img').each((i, el) => {
      const $img = $(el);
      let src = $img.attr('src') || $img.attr('data-src');
      if (!src) return;

      src = src.split('?')[0];
      if (this.isIrrelevantImage(src)) return;

      if (!src.startsWith('http')) {
        src = `${origin}${src.startsWith('/') ? '' : '/'}${src}`;
      }

      src = this.convertThumbToBig(src);
      if (src.startsWith('http://')) src = src.replace('http://', 'https://');
      if (!foundImages.includes(src)) foundImages.push(src);
    });
  }

  async resolveDirectImageUrl(foundImages) {
    for (let i = 0; i < Math.min(foundImages.length, 3); i++) {
      const imgUrl = foundImages[i];
      console.log(`   ${i + 1}/${Math.min(foundImages.length, 3)}: ${imgUrl}`);

      const directUrl = await this.getDirectImageUrl(imgUrl);

      if (directUrl && directUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i)) {
        const normalized = this.normalizeUrl(directUrl)
        console.log(`✅ URL direta válida encontrada: ${normalized}`);
        return normalized;
      } else {
        console.log(`   ⚠️ URL não é direta: ${directUrl}`);
      }

      await utils.delay(500);
    }

    return null;
  }

  async getDirectImageUrl(imageUrl) {
    if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i)) return imageUrl;

    if (imageUrl.includes('fastpic.ru') || imageUrl.includes('fastpic.org')) {
      return await this.getFastPicDirectUrl(imageUrl);
    }

    if (imageUrl.includes('imageban.ru') || imageUrl.includes('imgur.com')) {
      try {
        console.log(`   🔄 Resolvendo: ${imageUrl}`);
        const response = await requestManager.makeRequest(imageUrl);
        const $ = cheerio.load(response);

        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) {
          const normalized = this.normalizeUrl(ogImage)
          console.log(`   ✅ URL direta encontrada: ${normalized}`);
          return normalized;
        }

        const mainImage = $('img').first().attr('src');
        if (mainImage && mainImage.match(/\.(jpg|jpeg|png|gif)/i)) {
          let finalUrl = mainImage;
          if (mainImage.startsWith('//')) finalUrl = 'https:' + mainImage;
          else if (mainImage.startsWith('/')) {
            const urlObj = new URL(imageUrl);
            finalUrl = urlObj.origin + mainImage;
          }
          const normalized = this.normalizeUrl(finalUrl)
          console.log(`   ✅ URL direta encontrada: ${normalized}`);
          return normalized;
        }
      } catch (error) {
        console.log(`   ❌ Erro ao resolver ${imageUrl}: ${error.message}`);
      }
    }

    return imageUrl;
  }

  async getFastPicDirectUrl(fastpicUrl) {
    try {
      console.log(`   🔄 Resolvendo FastPic: ${fastpicUrl}`);
      const response = await requestManager.makeRequest(fastpicUrl);
      const $ = cheerio.load(response);

      const directImage = $('#image');
      if (directImage.length && directImage.attr('src')) {
        const directUrl = this.normalizeUrl(directImage.attr('src'));
        console.log(`   ✅ URL direta encontrada: ${directUrl}`);
        return directUrl;
      }

      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        const normalized = this.normalizeUrl(ogImage)
        console.log(`   ✅ URL direta (OG): ${normalized}`);
        return normalized;
      }

      const imageLinks = $('a[href*=".jpg"], a[href*=".png"], a[href*=".jpeg"]');
      if (imageLinks.length) {
        const directUrl = this.normalizeUrl(imageLinks.first().attr('href'))
        console.log(`   ✅ URL direta (link): ${directUrl}`);
        return directUrl;
      }

      console.log(`   ❌ Não foi possível obter URL direta`);
      return fastpicUrl;

    } catch (error) {
      console.log(`   ❌ Erro ao resolver FastPic: ${error.message}`);
      return fastpicUrl;
    }
  }

  isIrrelevantImage(src) {
    return src.includes('/icons/') || src.includes('/smiles/') || src.includes('magnet') || src.includes('rating') || src.includes('spacer');
  }

  normalizeUrl(u){
    if(!u) return u
    try{
      if(u.startsWith('//')) return 'https:' + u
      if(u.startsWith('http://')) return u.replace('http://','https://')
      return u
    }catch(e){ return u }
  }

  convertThumbToBig(src) {
    if (src.includes('/thumb/')) {
      return src.replace('/thumb/', '/big/').replace('_thumb', '');
    }
    return src;
  }
}

module.exports = new ImageProcessor();
