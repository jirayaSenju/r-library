const DEFAULTS = {
  pageDelayMs: 2000,
  topicDelayMs: 500,
  maxConcurrentTopics: 2
};

function getSetting(key) {
  const envKey = `SCRAPER_${key.toUpperCase()}`;
  if (process.env[envKey]) {
    const val = process.env[envKey];
    const num = Number(val);
    return isNaN(num) ? val : num;
  }
  return DEFAULTS[key];
}

module.exports = { getSetting };
