const passport = require('passport');

const config = {
    "oauth": {
        "github": {
            "provider": "github",
            "module": "passport-github",
            "clientID": "CLIENT_ID",
            "clientSecret": "CLIENT_SECRET",
            "authPath": "/auth/github",
            "callbackURL": "/auth/github/callback",
            "successRedirect": "/",
            "failureRedirect": "/"
          }
    }
};

class AuthorizationWebService {

    verifyAccessToken(token) {

    }
    
    authorization (req, res, next) {
        try {
            const { authorization } = req.headers;
            if (!authorization) {
                throw new Error('You must send an Authorization header');
            }

            const [authType, token] = authorization.trim().split(' ');
            if (authType !== 'Bearer') {
                throw new Error('Expected a Bearer token');
            }

            // const { claims } = await oktaJwtVerifier.verifyAccessToken(token)
            // if (!claims.scp.includes(process.env.SCOPE)) {
            //     throw new Error('Could not verify the proper scope')
            // }
            next();
        } catch (err) {
            next(err);
        }
    }

    handleAuthCallback(req, res, next) {
        const providerName = req.params.providerName;
        const provider = config.oauth[providerName];

        console.log('provider', provider);
        if (provider) {
            const strategy = passport.authenticate(provider.provider, {                 
                failureRedirect: provider.failureRedirect
            });

            if (strategy) {
                strategy(req, res, next);
            } else {
                next(new Error('404 Not Found'));
            }       
        } else {
            next(new Error('401 Unauthorized'));
        }
        // res.json({});
    }

    initEndpoints (app) {
        
        app.get('/api/auth/:providerName/callback', this.handleAuthCallback.bind(this));
    }
}

module.exports = AuthorizationWebService;