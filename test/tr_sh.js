var mdeps = require('../');
var test = require('tap').test;
var JSONStream = require('JSONStream');
var packer = require('browser-pack');

test('transform', function (t) {
    t.plan(3);
    var p = mdeps(__dirname + '/files/tr_sh/main.js', {
        transform: [ 'sed s/AAA/5/', 'sed s/BBB/50/' ],
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
