
const path = require('path');
const genThumbnail = require('simple-thumbnail');

function convert(src, dest, width = 200, height = 200) {
    // fs.mkdirSync(path.dirname(dest), { recursive: true })
    return genThumbnail(
        src,
        dest,
        `${width}x?`, {
            seek: '00:00:20'
        }
    );
}

module.exports = convert;