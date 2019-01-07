const configLoader = require('../../utils/config-loader');
const Promise = require('bluebird');
const path = require('path');
const fs = Promise.promisifyAll(require('fs'));

const previewsPath = '/tmp/asset-store-previews';

const walk = require('walk-folder-tree');

const image2thumb = require('./converters/image2thumb');
const video2thumb = require('./converters/video2thumb');

const converters = {
    '.mp4': {
        converter: video2thumb, 
        addSuffix: '.png'
    },
    '.m4v':  {
        converter: video2thumb, 
        addSuffix: '.png'
    },
    '.flv':  {
        converter: video2thumb, 
        addSuffix: '.png'
    },
    '.mkv':  {
        converter: video2thumb, 
        addSuffix: '.png'
    },
    '.jpg':  {
        converter: image2thumb, 
        addSuffix: ''
    },
    '.jpeg':  {
        converter: image2thumb, 
        addSuffix: ''
    },
    '.gif':  {
        converter: image2thumb, 
        addSuffix: ''
    },
    '.png':  {
        converter: image2thumb, 
        addSuffix: ''
    }
};

const acceptedSuffixes = Object.keys(converters);


// const videoSuffixes = [ '.mp4', '.m4v', '.flv', '.mkv'];
// const imageSuffixes = [ '.jpg', '.jpeg', '.gif', '.png'];


class PreviewsService {

    
    getPublicPreviewPath(storeName, filePath) {
        const stores = this.assetStoresService.getStores();

        if (stores[storeName] && stores[storeName].generatePreviews) {
            const suffix = filePath.substring(filePath.lastIndexOf('.'));
            if (acceptedSuffixes.indexOf(suffix.toLowerCase()) > -1) {
                return path.join(filePath + '.png');
            } else {
                return undefined;
            }
        }
    }

    getPreviewPath(storeName, filePath) {
        const stores = this.assetStoresService.getStores();

        if (stores[storeName] && stores[storeName].generatePreviews) {
            const suffix = filePath.substring(filePath.lastIndexOf('.'));

            const config = converters[suffix];
            if (config) {
                return path.join(previewsPath, storeName, filePath + config.addSuffix);
            } else {
                return undefined;
            }

        }
    }

    getStore(name) {
        return this.stores[name];
    }

   
    isFileExists(filePath) {
        return fs.statAsync(filePath)
            .then(() => {
                return true;
            })
            .catch((err) => {
                if(err.code === 'ENOENT') {                                        
                    return false;
                }
                return true;
            });
    }

    generatePreview(store, filePath, maxWidth, maxHeight) {


        const suffix = filePath.substring(filePath.lastIndexOf('.'));
        const src = path.join(store.path, filePath);                        
        let dest = path.join(previewsPath, store.name, filePath);

        // if (videoSuffixes.indexOf(suffix.toLowerCase()) > -1) {
        //     dest += '.png';
        // }

        return this.isFileExists(dest)
            .then((exists) => {
                 if (exists) {
                    return false;
                 } else if (converters[suffix]) {
                    fs.mkdirSync(path.dirname(dest), { recursive: true })

                    dest += converters[suffix].addSuffix;                    
                    return converters[suffix].converter(src, dest, 200, 200);
                 }                
            });
                
    }


    generatePreviews(maxWidth, maxHeight) {
        const scope = this;
        const stores = this.assetStoresService.getStores();
        const storeNames = Object.keys(stores);

        storeNames.forEach((storeName) => {
            if (stores[storeName] && stores[storeName].generatePreviews) {
                const store = stores[storeName];
                const storePath = stores[storeName].path;

                console.log('xxxx', storePath)

                    walk(storePath, { ignoreErrors: true }, function(params, cb) {
                        // console.log('Found file: ', params.name, params.directory);
                   
                        // const suffix = params.name.substring(params.name.lastIndexOf('.'));


                        if (params.directory) {
                            cb();
                            return;
                        }

    
                        try {
                        scope.generatePreview(store, params.path, maxWidth, maxHeight)
                            .then(() => {
                                cb();
                            })
                            .catch((err) => {
                                console.error(err);
                            })        
                        }  catch (err) {
                            console.log(err);
                        }         
                    }).then(function() {
                        // do something else
                    }).catch((err) => {
                        console.error(err);
                    });
            } else {
                console.warn('will not generate thumbs for store ' + storeName);
            }
            
        })

    }

    init(context) {
        this.context = context;
        this.assetStoresService = this.context.services['asset-stores'];

        this.generatePreviews(200, 200)

        return Promise.resolve();

    }        
}

module.exports = PreviewsService;

