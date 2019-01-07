
class PreviewsWebServices {

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

    getPreview(req, res, next) {
        const storeName = req.storeName;
        const requestPath = req.params['0'];

        const previewPath = this.previewsService.getPreviewPath(storeName, requestPath);
        if (previewPath) {
            res.sendFile(previewPath);
        } else {
            res.status(404).json({
                status: 404,
                message: 'Not Found'
            })
        }

    }

    initEndpoints(app) {
        const findStore = this.findStore.bind(this);

        app.get('/api/assets/:assetStore/previews/*', findStore, this.getPreview.bind(this)); 
    }
}

module.exports = PreviewsWebServices