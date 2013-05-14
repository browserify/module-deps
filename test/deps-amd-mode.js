var parser = require('../');
var test = require('tap').test;
var fs = require('fs');

var files = {
    main: __dirname + '/files/main-amd.js',
    foo: __dirname + '/files/foo.js',
    bar: __dirname + '/files/bar.js',
    baz: __dirname + '/files/baz.js'
};

var sources = Object.keys(files).reduce(function (acc, file) {
    acc[file] = fs.readFileSync(files[file], 'utf8');
    return acc;
}, {});

test('deps', function (t) {
    t.plan(1);
    var p = parser(files.main, {amdMode: true});
    var rows = [];
    
    p.on('data', function (row) { rows.push(row) });
    p.on('end', function () {
        t.same(rows, [
            {
                id: files.main,
                source: sources.main,
                entry: true,
                format: 'amd',
                deps: { './baz': files.baz }
            },
            {
                id: files.baz,
                source: sources.baz,
                format: 'amd',
                deps: { 
                  './bar': files.bar,
                  './foo': files.foo
                }
            },
            {
                id: files.bar,
                source: sources.bar,
                format: 'commonJS',
                deps: {}
            },
            {
                id: files.foo,
                source: sources.foo,
                format: 'commonJS',
                deps: { './bar': files.bar }
            }
        ]);
    });
});
