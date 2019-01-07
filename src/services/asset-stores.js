const configLoader = require('../utils/config-loader');
const path = require('path');

const defaultStoresConfigPath = './config/stores';

class AssetStoresService {

    getStores() {
        return this.context.services['configuration'].getStores();
    }

    getStore(name) {
        return this.context.services['configuration'].getStore(name);
    }

    init(context) {
        this.context = context;
        
        return Promise.resolve(this);
        // const scope = this;
        // const storesConfigPath = path.resolve(defaultStoresConfigPath);
        // console.log('DEBUG', 'loading stores from ' + storesConfigPath);
        
        // return configLoader.loadConfig(storesConfigPath)
        //     .then((stores) => {
        //         scope.stores = stores;
        //         return scope;
        //     }).then((stores) => {
        //         const storeNames = Object.keys(scope.stores);
        //         storeNames.forEach((storeName) => {
        //             scope.stores[storeName].name = storeName;
        //         });
        //         return stores;
        //     })
    }        
}

module.exports = AssetStoresService;

