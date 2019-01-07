const Promise = require('bluebird');
const path = require('path');
const configLoader = require('../utils/config-loader');

const configLocations =  {
    stores: './config/stores',
    authProviders: './config/auth-providers',
    general: './config'
}

class ConfigurationService {
    
    getAuthProvider(name) {
        return this.config.authProviders[name];
    }

    getAuthProviders() {
        return this.config.authProviders;
    }

    getStore(name) {
        return this.config.stores[name];
    }

    getStores() {
        return this.config.stores;
    }

    getAppConfig() {
        return this.config.general;
    }

    init(context) {
        const scope = this;

        this.config = {};

        return Promise.each(Object.keys(configLocations), (configType) => {

            const configPath = path.resolve(configLocations[configType]);
            console.log('DEBUG', `loading ${configType} configurations from ${configPath}`);
            
            return configLoader.loadConfig(configPath)
                .then((config = {}) => {
                    scope.config[configType] = config;
                    return scope.config[configType];
                }).then((config) => {
                    const configNames = Object.keys(scope.config[configType]);
                    configNames.forEach((configName) => {
                        if (!scope.config[configType][configName].name) {
                            scope.config[configType][configName].name = configName;
                        }
                    });
                    return config;
                });
        }).then(() => {
            return scope;
        })
    }
}

module.exports = ConfigurationService;