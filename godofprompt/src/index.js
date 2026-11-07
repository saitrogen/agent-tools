const api = require('./api');
const cache = require('./cache');
const categories = require('./categories');

module.exports = {
  ...api,
  ...cache,
  ...categories
};
