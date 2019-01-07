const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

function loadConfigFile(configPath) {
    console.log('DEBUG', 'reading file ' + configPath);
    return fs.readFileAsync(configPath)
        .then((data) => {
            return JSON.parse(data);
        });
}

function loadConfigFolder(configPath) {
    const filter = (entry) => {
        return (!entry.isDirectory()) && entry.name.endsWith('.json');
    }

    return fs.readdirAsync(configPath, { withFileTypes: true })
        .then((entries) => {
            return entries.filter(filter).map((entry) => {
                return path.join(configPath, entry.name);
            });
        })
        .then((items) => {
            const config = {};
            return items.reduce((promise, item) => {
                return promise.then(() => {
                    return loadConfigFile(item);
                }).then((configData) => {
                    return Object.assign(config, configData);
                });
            }, Promise.resolve());
        });
}

/**
 * Loads a configuration from a file or a folder. If it is a folder,
 * then it will scan one level deep for any json files, in the order
 * defined by 'fs.readdir', and then merges them into one JSON
 * structure.
 * 
 * If any top-level keys exist in multiple files, then the value will
 * be overwitten, by the data in the next file.
 * 
 * Promise based
 * 
 * @param {string} configPath 
 */
function loadConfig(configPath) {    
    return fs.lstatAsync(configPath).then((stats) => {
        if (stats.isDirectory()) {
            return loadConfigFolder(configPath);
        } else {
            return loadConfigFile(configPath);
        }
    })
}

module.exports = {
    loadConfig: loadConfig
}
