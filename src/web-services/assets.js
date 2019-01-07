const fileMetadata = require('file-metadata');
const mmm = require('mmmagic'),
    Magic = mmm.Magic;
const Promise = require('bluebird');
const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const passport = require('passport');

const readdir = require('readdir-enhanced');
const bodyParser = require('body-parser');


class AssetsWebService {
   
    constructor(context) {
        this.context = context;
        this.assetStoresService = this.context.services['asset-stores'];
        this.previewsService = this.context.services['previews'];
    }

    findStore(req, res, next) {
        const storeName = req.params.assetStore;
        const store = this.assetStoresService.getStore(storeName);

        if (!store) {
            next(new Error(`404 No such store '${storeName}'`));
            return;
        }

        req.store = store;
        req.storeName = storeName;

        next();
    }

    listContents(req, res, next) {
        const store = req.store;
        const storeName = req.storeName;
        const scope = this;
        
        const basePath = path.resolve(store.path);
        let relativePath = req.params['0'];
        relativePath = relativePath.replace(/\/+/g, '/');
        if (!relativePath.startsWith('/')) {
            relativePath = '/' + relativePath;
        }
        const folderPath = path.join(basePath, relativePath);

        return readdir.readdirAsyncStat(folderPath, {filter: /^[^.]/})     
            .then((entries) => {

                // Don't include dot files if specified
                if (!store.permissions.allowDotFiles) {
                    entries = entries.filter((entry) => {
                        return !entry.path.startsWith('.');
                    });
                }

                if (!store.permissions.allowSymlinks) {
                    entries = entries.filter((entry) => {
                        return !entry.isSymbolicLink();
                    });                    
                }

                const compare = (entryA, entryB) => {
                    return entryA.path.localeCompare(entryB.path);
                };

                res.json({
                    store: req.params.assetStore,
                    path: relativePath,
                    entries: entries.sort(compare).map((entry) => {
                        let type = 'unsupported';
                        if (entry.isDirectory()) {
                            type = 'dir'
                        }
                        if (entry.isFile()) {
                            type = 'file'
                        }
                        return {
                            name: entry.path,
                            type: type,
                            preview: scope.previewsService.getPreviewPath(store.name, relativePath),
                            size: entry.size
                        }
                    })
                })
            });
    }

    getMimeType(filePath) {
        return new Promise((resolve, reject) => {
            const magic = new Magic(mmm.MAGIC_MIME_TYPE);
            magic.detectFile(filePath, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });

    }

    getResource(req, res, next) {
        const store = req.store;
        const storeName = req.storeName;
        
        const basePath = path.resolve(store.path);
        let filePath = req.params['0'];
        filePath = filePath.replace(/\/+/g, '/');
        if (!filePath.startsWith('/')) {
            filePath = '/' + filePath;
        }

        const absoluteFilePath = path.join(basePath, filePath);
        const filename = path.basename('absoluteFilePath');
        const scope = this;
        const showStats = req.query.info === '1';
        const showMetadata = req.query.meta === '1';
        const download = req.query.download === '1' || req.query.dl === '1';

        Promise.resolve(absoluteFilePath)
            .then((absoluteFilePath) => {                
                if (filename.startsWith('.') && !store.permissions.allowDotFiles) {
                    throw new Error('403 - Not authorized');
                }
                return fs.lstatAsync(absoluteFilePath);
            })        
            .then((stat) => {
                if (!stat) {
                    throw new Error('404 - Not Found :' + absoluteFilePath);
                } else if (stat.isSymbolicLink() && !store.permissions.allowSymlinks) {
                    throw new Error('403 - Not authorized');
                } else if (stat.isDirectory()) {
                    return scope.listContents(req, res, next);               
                } else if (stat.isFile() && showStats) {
                    if (scope.permissions.allowStats) {
                        res.json(stat);
                    } else {
                        throw new Error('404 - file stats are not available');
                    }  
                } else if (stat.isFile() && showMetadata) {
                    if (fileMetadata && store.permissions.allowMetadata) {
                        return fileMetadata(absoluteFilePath)
                            .then((metadata) => {
                                res.json(metadata);
                            });
                    } else {
                        throw new Error('metadata is not available');
                    }    
                } else if (stat.isFile() && download) {
                    res.sendFile(absoluteFilePath, {dotfiles: 'deny'});
                } else if (stat.isFile()) {
                    let previewPath = undefined;
                    if (scope.previewsService.getPreviewPath(storeName, filePath)) {
                        previewPath = `/api/assets/${storeName}/previews${filePath}`;
                    }
                    return scope.getMimeType(absoluteFilePath).then((result) => {
                        res.json({
                            name: path.basename(absoluteFilePath),
                            path: filePath,
                            size: stat.size,
                            download: path.basename(absoluteFilePath) + '?dl=1',
                            thumbnail: (absoluteFilePath.endsWith('.jpg')?path.basename(absoluteFilePath) + '?dl=1':undefined),
                            preview: previewPath,
                            publicUrl: '',
                            mimetype: result
                        })
                    });
                } else {
                    throw new Error('40X - Unsupported file type');
                }
            })
            .catch((err) => {
                if(err.code === 'ENOENT') {
                    err = new Error('404 - Not Found ENOENT'); 
                }
                next(err);                
            });        
    }

    upload(req, res, next) {
        const basePath = path.resolve('/tmp/');
        let filePath = req.params['0'];
        filePath = filePath.replace(/\/+/g, '/');
        if (!filePath.startsWith('/')) {
            filePath = '/' + filePath;
        }

        const absoluteFilePath = path.join(basePath, filePath);

        res.json({
            action: 'upload',
            data: Object.keys(req.files)
        });
    }

    uploadRaw(req, res, next) {
        const basePath = path.resolve('/tmp/');
        let filePath = req.params['0'];
        filePath = filePath.replace(/\/+/g, '/');
        if (!filePath.startsWith('/')) {
            filePath = '/' + filePath;
        }
        const fileName = req.params.name;

        const absoluteFilePath = path.join(basePath, filePath);

        if (Buffer.isBuffer(req.body)) {
            fs.writeFileAsync("/tmp/" + fileName, req.body)
                .then(() => {
            
                console.log('The file was saved!');
            })
            .catch((err) => {
                next(err);
            })
        } else {
            console.log('body is not a buffer');
        }

        res.json({
            name: req.params.name,
            action: 'upload',
            headers: req.headers,
            params: req.params
        });
    }

    deleteFile(req, res, next) {
        const basePath = path.resolve('/tmp/');
        let filePath = req.params['0'];
        filePath = filePath.replace(/\/+/g, '/');
        if (!filePath.startsWith('/')) {
            filePath = '/' + filePath;
        }
        const fileName = req.params.name;

        const absoluteFilePath = path.join(basePath, filePath); 
        
        Promise.resolve(this.config.allowDelete)
            .then((allowDelete) => {
                if (!allowDelete) {
                    throw new Error('You are not authorized to delete this file');
                }

                return fs.unlinkAsync(absoluteFilePath)
                    .then(() => {
                        res.json({
                            message: 'file removed'
                        })
                    });
            })
            .catch((err) => {
                if(err.code === 'ENOENT') {
                    err = new Error('404 - Not Found'); 
                }
                next(err);                
            });  
    }


    initEndpoints(app) {

        // Raw body parser, supporting 
        const rawParser = () => {
            const parse = bodyParser.raw({ limit: '20mb' });
            return function (req, res, next) {
                if (!req.headers['content-type']) {
                    req.headers['content-type'] = 'application/octet-stream';
                }
                parse(req, res, next);
            }
        };

        const findStore = this.findStore.bind(this);

        const authentication = (req, res, next) => {
            const options = {};
            passport.authenticate('bearer', options, (error, user, info) => {
                if (error) {
                    return next(error);
                }

                next();
            })(req, res, next);
  
        }

        // const authentication = passport.authenticate('bearer', { session: false });

        app.get('/api/assets/:assetStore/files/*', 
            authentication, findStore, this.getResource.bind(this)); 
        app.post('/api/assets/:assetStore/files/*', 
            authentication, this.upload.bind(this)); 

        // app.put('/api/assets/:assetStore/*/:name', bodyParser.raw({type: '*/*'}), this.uploadRaw.bind(this)); 
        app.put('/api/assets/:assetStore/files/*/:name', 
            authentication, rawParser(), this.uploadRaw.bind(this)); 
        app.delete('/api/assets/:assetStore/files/*',
            authentication, this.deleteFile.bind(this)); 

    }
}

module.exports = AssetsWebService;

//curl -F ‘data=@endpoints.md' http://localhost:3000/api/assets/xx/sites/demo-site/assets/img
//curl --upload-file '/Users/ajmas/Movies/VID-20171025-WA0010.mp4' http://localhost:3000/api/assets/xx/sites/demo-site/assets/img/myfile.xyz
//curl -i -X PUT -H "Content-Type: application/octet-stream" -H "X-Allowed-Downloads: 30" 'http://localhost:3000/api/assets/xx/sites/demo-site/assets/img/myfile.xyz' --data-binary @/Users/ajmas/Movies/VID-20171025-WA0010.mp4 
//curl --upload-file '/Users/ajmas/Movies/VID-20171025-WA0010.mp4' -H "Content-Type: application/octet-stream" http://localhost:3000/api/assets/xx/sites/demo-site/assets/img/myfile.xyz
