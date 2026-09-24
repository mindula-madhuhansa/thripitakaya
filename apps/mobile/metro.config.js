// Bundle SQLite databases (assets/db/core.db) as assets.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('db');
module.exports = config;
