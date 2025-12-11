const configManager = require('./config-manager');
const categoryManager = require('./category-manager');
const pageProcessor = require('./page-processor');
const topicProcessor = require('./topic-processor');
const requestManager = require('./request-manager');
const utils = require('./utils');
const settings = require('./settings');

class Scraper {
  constructor() {
    this.baseUrl = 'https://rutracker.org';
  }

  async startScraping(progressCallback = null, maxPages = 133) {
    console.log('🎯 Iniciando scraping multi-categoria...');

    try {
      const enabledCategories = await configManager.loadCategories();
      console.log(`📋 Categorias habilitadas: ${enabledCategories.map(c => c.name).join(', ')}`);

      const results = { success: true, message: 'Scraping multi-categoria concluído!', categories: {} };
      const totalCategories = enabledCategories.length;

      for (const [index, category] of enabledCategories.entries()) {
        console.log(`\n🎮 PROCESSANDO CATEGORIA: ${category.name} (${index + 1}/${totalCategories})`);

        try {
          const categoryProgress = progressCallback
            ? ((current, total, stage, message) => progressCallback(category, current, total, stage, message))
            : null;

          const categoryResult = await this.processCategory(category, categoryProgress, maxPages);
          results.categories[category.id] = categoryResult;
        } catch (error) {
          console.error(`❌ Erro na categoria ${category.name}:`, error);
          results.categories[category.id] = { success: false, error: error.message };
        }
      }

      requestManager.clearCache();
      return results;
    } catch (error) {
      console.error('❌ Erro crítico no scraping:', error.message);
      requestManager.clearCache();
      return { success: false, error: error.message, message: 'Erro durante o scraping multi-categoria' };
    }
  }

  async processCategory(category, progressCallback, maxPages) {
    const existingData = await categoryManager.loadCategoryData(category.id);

    const allNewTopics = [];
    let pageCount = 0;
    let hasMorePages = true;
    let totalNewTopics = 0;
    let totalDuplicateTopics = 0;

    while (hasMorePages && pageCount < maxPages) {
      pageCount++;
      const pageUrl = pageProcessor.generatePageUrl(category, pageCount);
      console.log(`\n📖 ${category.name} - PÁGINA ${pageCount}`);

      if (progressCallback) {
        progressCallback(pageCount, maxPages, `${category.name}: Página ${pageCount}/${maxPages}...`, `${category.name}: Página ${pageCount}/${maxPages}`);
      }

      const pageResult = await pageProcessor.processCategoryPage(pageUrl, category, existingData);

      if (pageResult.isLastPage) {
        console.log(`🏁 Última página encontrada para ${category.name}`);
        hasMorePages = false;
        break;
      }

      if (pageResult.error) {
        console.log(`⚠️ Erro na página ${pageCount}, continuando...`);
      } else {
        allNewTopics.push(...pageResult.topics);

        if (pageResult.stats) {
          totalNewTopics += pageResult.stats.new;
          totalDuplicateTopics += pageResult.stats.duplicates;
        }

        console.log(`✅ Página ${pageCount} processada: ${pageResult.topics.length} novos tópicos`);

        if (pageResult.topics.length > 0) {
          try {
            const processedTopics = await topicProcessor.processTopicsBatch(pageResult.topics);
            if (processedTopics.length > 0) {
              await categoryManager.saveCategoryData(category.id, existingData, processedTopics);
              existingData.push(...processedTopics);
              console.log(`💾 ${processedTopics.length} tópicos adicionados a ${category.id}.json`);
            }
          } catch (error) {
            console.error('❌ Erro ao salvar progresso:', error);
          }
        }
      }

      if (pageProcessor.hasReachedMaxStart(pageCount)) {
        console.log(`🏁 Limite máximo de páginas atingido para ${category.name}`);
        hasMorePages = false;
        break;
      }

      const pageDelay = settings.getSetting('pageDelayMs') ?? 2000;
      if (pageDelay > 0) await utils.delay(pageDelay);
    }

    const finalData = await categoryManager.loadCategoryData(category.id);
    const newItems = finalData.length - (existingData.length - totalNewTopics);

    console.log(`\n📚 RESUMO DA CATEGORIA ${category.name}:`);
    console.log(`   • Páginas processadas: ${pageCount}`);
    console.log(`   • Tópicos novos encontrados: ${totalNewTopics}`);
    console.log(`   • Tópicos duplicados ignorados: ${totalDuplicateTopics}`);
    console.log(`   • Novos itens adicionados: ${newItems}`);
    console.log(`   • Total no arquivo: ${finalData.length}`);

    return { success: true, message: `Categoria ${category.name} processada com sucesso`, stats: { pagesProcessed: pageCount, newTopicsFound: totalNewTopics, duplicatesSkipped: totalDuplicateTopics, newItems: newItems, totalInFile: finalData.length }, data: finalData };
  }

  async startCategoryScraping(categoryId, progressCallback = null, maxPages = 133) {
    console.log(`🎯 Iniciando scraping para categoria: ${categoryId}`);
    try {
      const categories = await configManager.loadCategories();
      const category = configManager.getCategoryById(categoryId);
      if (!category) throw new Error(`Categoria ${categoryId} não encontrada ou desabilitada`);
      const result = await this.processCategory(category, progressCallback, maxPages);
      return result;
    } catch (error) {
      console.error(`❌ Erro no scraping da categoria ${categoryId}:`, error);
      return { success: false, error: error.message, message: `Erro no scraping da categoria ${categoryId}` };
    }
  }

  async testConnection() {
    try {
      console.log('🔗 Testando conexão...');
      const html = await requestManager.makeRequest(this.baseUrl);
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);
      const title = $('title').text();
      console.log(`✅ Conexão bem-sucedida! Título: ${title}`);
      return { success: true, title };
    } catch (error) {
      console.error('❌ Falha na conexão:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new Scraper();
