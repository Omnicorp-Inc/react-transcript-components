const path = require('path');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

module.exports = { 
  webpack(config) {
    config.resolve.plugins = config.resolve.plugins.filter(plugin => !(plugin instanceof ModuleScopePlugin));
    config.resolve.alias['react'] = path.resolve(__dirname, 'node_modules/react');
    return config;
  }
};