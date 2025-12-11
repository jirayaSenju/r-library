const fs = require('fs').promises;
const path = require('path');

class CategoryManager {
  constructor() {
    this.dataDir = process.env.SCRAPER_DATA_DIR || path.join(process.cwd(), 'data');
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('✅ Diretório de dados criado:', this.dataDir);
    } catch (error) {
      console.error('❌ Erro ao criar diretório de dados:', error);
      throw error;
    }
  }

  async ensureCategoryFile(categoryId) {
    try {
      await this.ensureDataDir();
      const filePath = this.getCategoryFilePath(categoryId);

      try {
        await fs.access(filePath);
        console.log(`📁 Arquivo ${categoryId}.json já existe`);
      } catch {
        await fs.writeFile(filePath, '[]', 'utf8');
        console.log(`📁 Arquivo ${categoryId}.json criado com sucesso`);
      }

      return filePath;
    } catch (error) {
      console.error(`❌ Erro ao criar ${categoryId}.json:`, error);
      throw error;
    }
  }

  async loadCategoryData(categoryId) {
    try {
      await this.ensureCategoryFile(categoryId);
      const filePath = this.getCategoryFilePath(categoryId);
      const data = await fs.readFile(filePath, 'utf8');
      const cleanData = data.replace(/^\uFEFF/, '');
      const parsedData = JSON.parse(cleanData);

      console.log(`📚 ${parsedData.length} tópicos existentes em ${categoryId}.json`);
      return parsedData;
    } catch (error) {
      console.log(`📝 Criando novo arquivo ${categoryId}.json...`);
      return [];
    }
  }

  async saveCategoryData(categoryId, existingData, newData = []) {
    try {
      const filePath = await this.ensureCategoryFile(categoryId);

      const allData = [...existingData, ...newData];
      const uniqueData = this.removeDuplicatesById(allData);

      const jsonString = JSON.stringify(uniqueData, null, 2);
      await fs.writeFile(filePath, jsonString, 'utf8');

      console.log(`💾 Dados salvos em ${categoryId}.json: ${uniqueData.length} tópicos`);
      return filePath;
    } catch (error) {
      console.error(`❌ Erro ao salvar ${categoryId}.json:`, error);
      throw error;
    }
  }

  removeDuplicatesById(data) {
    const map = new Map();

    data.forEach(item => {
      const key = item.topicId || item.id;
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.scrapedAt || Date.now()) - new Date(a.scrapedAt || Date.now()));
  }

  getCategoryFilePath(categoryId) {
    return path.join(this.dataDir, `${categoryId}.json`);
  }

  topicExists(existingData, topicId) {
    return existingData.some(topic => topic.topicId === topicId);
  }

  async getAllCategoryFiles() {
    await this.ensureDataDir();
    const files = await fs.readdir(this.dataDir);
    return files.filter(file => file.endsWith('.json') && file !== 'results.json');
  }
}

module.exports = new CategoryManager();
