class Utils {
  cleanTitle(title) {
    if (!title) return '';

    let cleaned = title
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    cleaned = cleaned
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  extractTopicId(url) {
    const match = url.match(/t=(\d+)/);
    return match ? match[1] : `unknown_${Date.now()}`;
  }

  topicExists(existingData, topicId) {
    return existingData.some(topic => topic.topicId === topicId);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async mapLimit(items, limit, iterator) {
    if (!Array.isArray(items) || items.length === 0) return [];
    limit = Math.max(1, Number(limit) || 1);

    const results = new Array(items.length);
    let nextIndex = 0;
    let active = 0;

    return new Promise((resolve, reject) => {
      const launchNext = () => {
        if (nextIndex >= items.length && active === 0) {
          return resolve(results);
        }

        while (active < limit && nextIndex < items.length) {
          const current = nextIndex++;
          active++;
          Promise.resolve(iterator(items[current], current))
            .then(res => { results[current] = res; })
            .catch(err => { results[current] = undefined; console.error('mapLimit task error:', err?.message || err); })
            .finally(() => { active--; launchNext(); });
        }
      };
      launchNext();
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date) {
    return new Date(date).toLocaleString('pt-BR');
  }

  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new Utils();
