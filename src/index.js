const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

const express = require('express');
const cors = require('cors');
// const bodyParser = require('body-parser');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const fileUpload = require('express-fileupload');
const BearerStrategy = require('@passport-next/passport-http-bearer');
const GitHubStrategy = require('passport-github').Strategy;

const passport = require('passport');

const port = 3000;

const context = {
    services: {},
    webServices: {}
};

function findUser(token, callback) {

    let error = null;
    let user = {
        email: 'some.user@superlocal.local'
    };

    if (callback) {
        callback(error, user);
    } else {
        return new Promise((resolve, reject) => {
            if (error) {
                reject(error);
            } else {
                resolve(user);
            }
        });
    }
}

function loadServices() {
    return fs.readdirAsync(path.join(__dirname, 'services'))
        .then((services) => {
            return Promise.each(services, (serviceName) => {
                if (serviceName.lastIndexOf('.') > -1) {
                    serviceName = serviceName.substring(0, serviceName.lastIndexOf('.'));
                }

                console.log('DEBUG', 'loading service ' + serviceName);

                const ServiceClass = require('./services/' + serviceName);
                const service = new ServiceClass();
                if (service.init) {
                    return service.init(context)
                        .then(() => {
                            context.services[serviceName] = service;
                            return context;
                        });
                }

                return Promise.resolve(context);
            })
        })

}

function loadWebServices(context, app) {
    return fs.readdirAsync(path.join(__dirname, 'web-services'))
        .then((services) => {
            return Promise.each(services, (serviceName) => {
                if (serviceName.lastIndexOf('.') > -1) {
                    serviceName = serviceName.substring(0, serviceName.lastIndexOf('.'));
                }
                
                console.log('DEBUG', 'loading web service ' + serviceName);

                const ServiceClass = require('./web-services/' + serviceName);
                const service = new ServiceClass(context);

                if (service.initEndpoints) {
                    const response = service.initEndpoints(app);
                    context.webServices[serviceName] = service;
                }

                return Promise.resolve();
            })
        })
}


const app = express();

// Configure Express application.
app.use(require('morgan')('combined'));

app.use(fileUpload({
    //limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles : true,
    tempFileDir : '/tmp/'    
  }));

app.use(cors());

passport.use(new BearerStrategy({}, (token, done) => {
    console.log('>>>', token)
    done(null, {
        user: "some.user@somedomain.local"
    });
}
    //  findUser({ token: token }, function (err, user) {
    //     if (err) {
    //         return done(err);
    //     }
    //     if (!user) { 
    //         return done(null, false);
    //     }
    //     return done(null, user, { scope: 'read' });
    //   });
    // }
  ));

//   passport.use(new GitHubStrategy({}, (accessToken, refreshToken, profile, cb) => {

//     const err = null;
//     const user = {
//         user: "some.user@somedomain.local"
//     };

//     cb(err, user)
//   }));

// passport.serializeUser(function (user, done) {
//     done(user.Id); // the user id that you have in the session
// });

// passport.deserializeUser(function (id, done) {
//     done({id: Id}); // generally this is done against user database as validation
// });

app.use(passport.initialize());
// app.use(passport.session());

loadServices()
    .then(() => {
        return loadWebServices(context, app);
    })
    .then(() => {
        console.log(context)
    })
    .then(() => {
        app.listen(port, () => console.log(`Example app listening on port ${port}!`))
    })
    .catch((err) => {
        console.error('Error', err);
    });
