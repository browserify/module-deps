var through = require('through2');

module.exports = function (file) {
    return through(function (buf, enc, next) {
        this.push(String(buf).replace(/abcdef/g, '123456'));
        next();
    });
};
