const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
  constructor() {
    this.configDir = process.env.SCRAPER_CONFIG_DIR || path.join(process.cwd(), 'config');
    this.categoriesPath = path.join(this.configDir, 'categories.json');
    this.originalConfigPath = path.join(__dirname, 'config', 'categories.json');
    this.categories = [];
    this.ensureConfigDir();
  }

  async ensureConfigDir() {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      console.log('✅ Diretório de configuração criado:', this.configDir);
    } catch (error) {
      console.error('❌ Erro ao criar diretório de configuração:', error);
    }
  }

  async loadCategories() {
    try {
      const data = await fs.readFile(this.categoriesPath, 'utf8');
      const config = JSON.parse(data);
      let categories = config.categories ? config.categories.filter(cat => cat.enabled) : config;

      let needsUpdate = false;
      categories = categories.map(cat => {
        if (cat.baseUrl && cat.baseUrl.includes('EcoHub.org')) {
          console.log(`⚠️ URL incorreta detectada em ${cat.name}, corrigindo...`);
          cat.baseUrl = cat.baseUrl.replace('EcoHub.org', 'rutracker.org');
          needsUpdate = true;
        }
        return cat;
      });

      if (needsUpdate) {
        console.log('💾 Salvando categorias corrigidas...');
        await this.saveCategories(categories);
      }

      this.categories = categories;
      console.log(`📁 ${this.categories.length} categorias carregadas do config`);
      return this.categories;
    } catch (error) {
      console.log('📁 Carregando categorias do pacote do app...');
      try {
        const configData = await fs.readFile(this.originalConfigPath, 'utf8');
        const config = JSON.parse(configData);
        this.categories = config.categories ? config.categories.filter(cat => cat.enabled) : config;

        await this.saveCategories(this.categories);
        console.log(`📁 ${this.categories.length} categorias carregadas do pacote e salvas no config dir`);
        return this.categories;
      } catch (fallbackError) {
        console.error('❌ Erro ao carregar categorias fallback:', fallbackError);
        return this.getDefaultCategories();
      }
    }
  }

  async saveCategories(categories) {
    try {
      const config = Array.isArray(categories) ? { categories } : categories;
      await fs.mkdir(path.dirname(this.categoriesPath), { recursive: true });
      await fs.writeFile(this.categoriesPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('💾 Categorias salvas em:', this.categoriesPath);
      this.categories = config.categories ? config.categories.filter(cat => cat.enabled) : config;
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar categorias:', error);
      return false;
    }
  }

  getDefaultCategories() {
    return [
        {
        "id": "switch",
        "name": "Nintendo Switch",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=1605",
        "titleSearch": "[Nintendo Switch]",
        "enabled": true,
        "priority": 1
        },
        {
        "id": "psx",
        "name": "Playstation 1",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=908",
        "titleSearch": "[PS]",
        "enabled": true,
        "priority": 2
        },
        {
        "id": "ps2",
        "name": "Playstation 2",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=357",
        "titleSearch": "[PS2]",
        "enabled": true,
        "priority": 3
        },
        {
        "id": "psp",
        "name": "Playstation Portable",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=1352",
        "titleSearch": "[PSP]",
        "enabled": true,
        "priority": 4
        },
        {
        "id": "ps3",
        "name": "Playstation 3",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=886",
        "titleSearch": "[PS3]",
        "enabled": true,
        "priority": 5
        },
        {
        "id": "ps4",
        "name": "Playstation 4",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=973",
        "titleSearch": "[PS4]",
        "enabled": true,
        "priority": 6
        },
        {
        "id": "ps5",
        "name": "Playstation 5",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=546",
        "titleSearch": "[PS5]",
        "enabled": true,
        "priority": 7
        },
        {
        "id": "psvita",
        "name": "Playstation Vita",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=595",
        "titleSearch": "[PS Vita]",
        "enabled": true,
        "priority": 8
        },
        {
        "id": "xbox360",
        "name": "Xbox 360",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=510",
        "titleSearch": "[XBOX360]",
        "enabled": true,
        "priority": 9
        },
        {
        "id": "wii",
        "name": "Nintendo Wii",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=773",
        "titleSearch": "[Nintendo Wii]",
        "enabled": true,
        "priority": 10
        },
        {
        "id": "gamecube",
        "name": "Nintendo GameCube",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=773",
        "titleSearch": "[GameCube]",
        "enabled": true,
        "priority": 11
        },
        {
        "id": "wiiu",
        "name": "Nintendo Wii U",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=773",
        "titleSearch": "[Nintendo Wii U]",
        "enabled": true,
        "priority": 12
        },
        {
        "id": "ds",
        "name": "Nintendo DS",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=774",
        "titleSearch": "[NDS]",
        "enabled": true,
        "priority": 13
        },
        {
        "id": "3ds",
        "name": "Nintendo 3DS",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=774",
        "titleSearch": "[3DS]",
        "enabled": true,
        "priority": 14
        },
        {
        "id": "dreamcast",
        "name": "Sega Dreamcast",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=968",
        "titleSearch": "[Dreamcast]",
        "enabled": true,
        "priority": 15
        },
        {
        "id": "windows-fight",
        "name": "Windows Fight Games",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=2203",
        "titleSearch": "[DL]",
        "enabled": true,
        "priority": 15
        },
        {
        "id": "windows-first-person",
        "name": "Windows First Person Games",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=647",
        "titleSearch": "[DL]",
        "enabled": true,
        "priority": 15
        },
        {
        "id": "windows-third-person",
        "name": "Windows Third Person Games",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=646",
        "titleSearch": "[DL]",
        "enabled": true,
        "priority": 15
        },
        {
        "id": "windows-horror",
        "name": "Windows Horror Games",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=50",
        "titleSearch": "[DL]",
        "enabled": true,
        "priority": 15
        },
        {
        "id": "windows-rpg",
        "name": "Windows RPG Games",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=52",
        "titleSearch": "[DL]",
        "enabled": true,
        "priority": 15
        },
        {
        "id": "windows-rts",
        "name": "Windows RTS Games",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=51",
        "titleSearch": "[DL]",
        "enabled": true,
        "priority": 15
        },
        {
        "id": "windows-arcade",
        "name": "Windows Arcade Games",
        "baseUrl": "https://rutracker.org/forum/viewforum.php?f=127",
        "titleSearch": "[DL]",
        "enabled": true,
        "priority": 15
        }
    ];
  }

  getCategoryById(categoryId) {
    return this.categories.find(cat => cat.id === categoryId);
  }

  getEnabledCategories() {
    return this.categories.filter(cat => cat.enabled);
  }

  async updateCategory(categoryId, updates) {
    try {
      let config;
      try {
        const data = await fs.readFile(this.categoriesPath, 'utf8');
        config = JSON.parse(data);
      } catch {
        const data = await fs.readFile(this.originalConfigPath, 'utf8');
        config = JSON.parse(data);
      }

      const categories = config.categories || config;
      const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

      if (categoryIndex !== -1) {
        categories[categoryIndex] = { ...categories[categoryIndex], ...updates };
        await this.saveCategories(categories);
        await this.loadCategories();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao atualizar categoria:', error);
      return false;
    }
  }
}

module.exports = new ConfigManager();
