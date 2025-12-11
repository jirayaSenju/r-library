const cheerio = require('cheerio');
const requestManager = require('./request-manager');
const utils = require('./utils');

class PageProcessor {
  constructor() {
    this.baseUrl = 'https://rutracker.org';
  }

  async processCategoryPage(pageUrl, category, existingData) {
    try {
      console.log(`📄 Processando página da categoria ${category.name}: ${pageUrl}`);

      const listPageData = await requestManager.makeRequest(pageUrl);
      const $list = cheerio.load(listPageData);

      if (this.isLastPage($list)) {
        console.log(`⏹️ Última página atingida para ${category.name}`);
        return { topics: [], isLastPage: true };
      }

      const topics = [];
      let newTopicsCount = 0;
      let duplicateTopicsCount = 0;

      $list('a.torTopic').each((i, el) => {
        const $link = $list(el);
        const title = $link.text().trim();
        const relativeUrl = $link.attr('href');

        if (title && title.includes(category.titleSearch) && relativeUrl) {
          const topicId = utils.extractTopicId(relativeUrl);

          let url;
          if (relativeUrl.startsWith('http')) {
            url = relativeUrl;
          } else {
            try {
              const correctedBaseUrl = (category.baseUrl || this.baseUrl).replace('EcoHub.org', 'rutracker.org');
              const categoryOrigin = new URL(correctedBaseUrl).origin;
              if (relativeUrl.startsWith('/')) {
                url = `${categoryOrigin}${relativeUrl}`;
              } else {
                url = `${categoryOrigin}/forum/${relativeUrl}`;
              }
            } catch (e) {
              url = `${this.baseUrl}/forum/${relativeUrl}`;
            }
          }

          if (utils.topicExists(existingData, topicId)) {
            duplicateTopicsCount++;
            console.log(`   ⏭️ Tópico já existe: ${utils.cleanTitle(title)}`);
            return;
          }

          const cleanedTitle = utils.cleanTitle(title);

          topics.push({
            id: `topic_${topicId}`,
            topicId,
            title: cleanedTitle,
            url,
            category: category.id,
            scrapedAt: new Date().toISOString()
          });

          newTopicsCount++;
          console.log(`   ✅ Novo tópico: ${cleanedTitle}`);
        }
      });

      console.log(`📊 Página processada (${category.name}): ${newTopicsCount} novos, ${duplicateTopicsCount} duplicados`);
      return {
        topics: topics,
        isLastPage: false,
        stats: { new: newTopicsCount, duplicates: duplicateTopicsCount }
      };

    } catch (error) {
      console.error(`❌ Erro ao processar página ${pageUrl}:`, error.message);
      return { topics: [], isLastPage: false, error: error.message };
    }
  }

  isLastPage($) {
    const infoMessage = $('table.forumline.message th:contains("Информация")');
    const notFoundMessage = $('div:contains("Подходящих тем или сообщений не найдено")');

    return infoMessage.length > 0 && notFoundMessage.length > 0;
  }

  generatePageUrl(category, pageNumber) {
    const start = (pageNumber - 1) * 50;
    const baseUrl = (category.baseUrl || this.baseUrl).replace('EcoHub.org', 'rutracker.org');
    return start === 0 ? baseUrl : `${baseUrl}&start=${start}`;
  }

  hasReachedMaxStart(pageNumber) {
    const start = (pageNumber - 1) * 50;
    return start >= 6450;
  }
}

module.exports = new PageProcessor();
