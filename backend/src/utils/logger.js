const logger = {
  info: (msg, ...meta) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, meta.length ? meta : '');
  },
  warn: (msg, ...meta) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, meta.length ? meta : '');
  },
  error: (msg, ...meta) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, meta.length ? meta : '');
  }
};

module.exports = logger;
