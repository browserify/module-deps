var mdeps = require('../');
var test = require('tap').test;
var JSONStream = require('JSONStream');
var packer = require('browser-pack');
var through = require('through');

test('transform non streaming', function (t) {
    t.plan(3);
    var p = mdeps(__dirname + '/files/tr_sh/main.js', {
        transform: function (file, source) {
            return source.replace(/AAA/g, '5').replace(/BBB/g, '50')
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
