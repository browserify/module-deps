var parser = require('../');
var test = require('tape');
var fs = require('fs');
var path = require('path');

var files = {
    main: path.join(__dirname, '/files/main.js'),
    foo: path.join(__dirname, '/files/foo.js'),
    bar: path.join(__dirname, '/files/bar.js')
};

var sources = Object.keys(files).reduce(function (acc, file) {
    acc[file] = fs.readFileSync(files[file], 'utf8');
    return acc;
}, {});

test('deps resolve to id', function (t) {
    t.plan(1);
    var p = parser();
    var fooID = path.relative(process.cwd(), files.foo);
    p.write({ file: files.main, entry: true });
    p.end({ file: files.foo, id: fooID, entry: true });
    
    var rows = [];
    p.on('data', function (row) { rows.push(row) });
    p.on('end', function () {
        t.same(rows.sort(cmp), [
            {
                id: files.main,
                file: files.main,
                source: sources.main,
                entry: true,
                deps: { './foo': fooID }
            },
            {
                id: fooID,
                file: files.foo,
                source: sources.foo,
                entry: true,
                deps: { './bar': files.bar }
            },
            {
                id: files.bar,
                file: files.bar,
                source: sources.bar,
                deps: {}
            }
        ].sort(cmp));
    });
});

function cmp (a, b) { return a.id < b.id ? -1 : 1 }

