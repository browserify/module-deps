var mdeps = require('../');
var test = require('tap').test;
var path = require('path');
var through = require('through2');

var files = {
    fop: path.join(__dirname, '/files/fop.js'),
    bat: path.join(__dirname, '/files/bat.js')
};

var sources = {
    fop: 'require("./bat"); var tongs;',
    bat: 'notreal tongs'
};

var fileCache = {};
fileCache[files.fop] = sources.fop;
fileCache[files.bat] = sources.bat;

var specialReplace = function(input) {
    return input.replace(/tongs/g, 'tangs');
};

test('uses file cache', function (t) {
    t.plan(1);
    var p = mdeps({
        fileCache: fileCache,
        transform: function (file) {
            return through(function (buf, enc, next) {
                this.push(specialReplace(String(buf)));
                next();
            });
        },
        transformKey: [ 'browserify', 'transform' ]
    });
    p.end({ id: 'fop', file: files.fop, entry: false });

    var rows = [];
    p.on('data', function (row) { rows.push(row) });
    p.on('end', function () {
        t.same(rows.sort(cmp), [
            {
                id: 'fop',
                file: files.fop,
                source: specialReplace(sources.fop),
                deps: { './bat': files.bat }
            },
            {
                id: files.bat,
                file: files.bat,
                source: specialReplace(sources.bat),
                deps: {}
            }
        ].sort(cmp));
    });
});

function cmp (a, b) { return a.id < b.id ? -1 : 1 }
