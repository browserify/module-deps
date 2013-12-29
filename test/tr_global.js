var mdeps = require('../');
var test = require('tap').test;
var JSONStream = require('JSONStream');
var packer = require('browser-pack');

test('global transforms', function (t) {
    t.plan(1);
    
    var p = mdeps(__dirname + '/files/tr_global/main.js', {
        transform: [ 'tr-c', 'tr-d' ],
        globalTransform: [
            __dirname + '/files/tr_global/tr-e',
            __dirname + '/files/tr_global/tr-f'
        ],
        transformKey: [ 'browserify', 'transform' ]
    });
    var pack = packer();
    
    p.pipe(JSONStream.stringify()).pipe(pack);
    
    var src = '';
    pack.on('data', function (buf) { src += buf });
    pack.on('end', function () {
        Function(['console','t'], src)(t, {
            log: function (msg) {
                t.equal(msg, '111111');
            }
        });
    });
});
