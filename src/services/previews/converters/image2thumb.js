const im = require('node-imagemagick');

function convert(src, dest, width, height) {
    new Promise((resolve, reject) => {
        im.resize({
            srcPath: src,
            dstPath: dest,
            width:   256
          }, function(err, stdout, stderr){
            if (err) {
                reject(err);
                return
            }
            resolve();
            // console.log('resized kittens.jpg to fit within 256x256px');
          });
    })
}

module.exports = convert;