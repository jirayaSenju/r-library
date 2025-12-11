const cheerio = require('cheerio');
const requestManager = require('./request-manager');
const imageProcessor = require('./image-processor');
const utils = require('./utils');
const settings = require('./settings');

class TopicProcessor {
  async processTopicDetails(topic) {
    try {
      const topicPageData = await requestManager.makeRequest(topic.url);
      const $topic = cheerio.load(topicPageData);
      const $ = $topic;
      const postBody = $('.post_body').first();

      if (!postBody.length) {
        throw new Error('Post body não encontrado');
      }

      const cover = await imageProcessor.extractFirstImage($, postBody, topic.url);
      const magnet = this.extractMagnetLink($);
      const size = this.extractFileSize($, postBody, topic.title);

      return { ...topic, cover: cover, magnet: magnet, size: size };

    } catch (error) {
      console.error(`❌ Erro ao processar detalhes do tópico ${topic.title}:`, error.message);
      throw error;
    }
  }

  extractMagnetLink($) {
    let magnet = null;
    const magnetLink = $('a.magnet-link').first();

    if (magnetLink.length) {
      magnet = magnetLink.attr('href');
    } else {
      const anyMagnet = $('a').filter((i, el) => ($(el).attr('href') || '').startsWith('magnet:')).first();
      if (anyMagnet.length) {
        magnet = anyMagnet.attr('href');
      }
    }

    return magnet;
  }

  extractFileSize($, postBody, title) {
    let size = 'N/A';
    const description = postBody.text().trim();
    const sizeMatch = description.match(/(\d+[\.,]\d+)\s*(GB|MB|KB)/i) || title.match(/(\d+[\.,]\d+)\s*(GB|MB|KB)/i);

    if (sizeMatch) {
      size = `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`;
    }

    return size;
  }

  async processTopicsBatch(topics, progressCallback = null) {
    const totalToProcess = topics.length;
    if (totalToProcess === 0) return [];

    const concurrency = settings.getSetting('maxConcurrentTopics') || 2;
    const perTopicDelay = settings.getSetting('topicDelayMs') ?? 0;

    let completed = 0;

    const iterator = async (topic) => {
      try {
        const detailed = await this.processTopicDetails(topic);
        console.log(`✅ Tópico processado: ${detailed.title}`);
        return detailed;
      } catch (error) {
        console.error(`❌ Erro ao processar tópico ${topic.title}:`, error.message);
        return topic;
      } finally {
        completed++;
        if (progressCallback) {
          const progress = Math.round((completed / totalToProcess) * 100);
          progressCallback(progress, `Processando tópicos ${completed}/${totalToProcess}`);
        }
        if (perTopicDelay > 0) {
          await utils.delay(perTopicDelay);
        }
      }
    };

    const processed = await utils.mapLimit(topics, concurrency, iterator);
    return processed.filter(Boolean);
  }
}

module.exports = new TopicProcessor();
