var mdeps = require('../');
var test = require('tap').test;
var JSONStream = require('JSONStream');
var packer = require('browser-pack');
var path = require('path');

test('transform', function (t) {
    t.plan(2);
    var p = mdeps({
        transform: [ 'findme-transform' ],
        paths: [ path.join(__dirname, '/files/findme') ]
    });
    p.end(path.join(__dirname, '/files/findme/main.js'));
    var pack = packer();

    p.pipe(JSONStream.stringify()).pipe(pack);

    var src = '';
    pack.on('data', function (buf) { src += buf });
    pack.on('end', function () {
        t.ok(src.indexOf('abcdef') === -1, 'contains un-transformed output');
        t.ok(src.indexOf('123456') > -1, 'missing transformed output');
    });
});
