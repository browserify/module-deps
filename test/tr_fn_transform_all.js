var mdeps = require('../');
var test = require('tap').test;
var JSONStream = require('JSONStream');
var packer = require('browser-pack');
var through = require('through');

test('transform', function (t) {
    t.plan(1);
    var p = mdeps(__dirname + '/files/tr_sh/tr_transform_all.js', {
        transformAll: true,
        transform: function (file) {
            return through(function (buf) {
                this.queue(String(buf)
                    .replace(/GGG/g, '5')
                );
            });
        },
        transformKey: [ 'browserify', 'transform' ]
    });
    var pack = packer();

    p.pipe(JSONStream.stringify()).pipe(pack);

    var src = '';
    pack.on('data', function (buf) { src += buf });
    pack.on('end', function () {
        Function('t', src)(t);
    });
});
