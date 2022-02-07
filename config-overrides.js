const path = require('path');

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    path: false,
    fs: false,
    electron: false,
  }

  return config;
}
