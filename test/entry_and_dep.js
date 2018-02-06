var parser = require('../');
var test = require('tap').test;
var fs = require('fs');
var path = require('path');

var files = {
    foo: path.join(__dirname, '/entry_and_dep/foo.js'),
    bar: path.join(__dirname, '/entry_and_dep/lib/bar.js')
};

test('requiring a file that is also an entry point', function (t) {
    t.plan(1);
    var p = parser();
    p.write({ file: files.foo, entry: true });
    p.end({ file: files.bar, entry: true });
    
    var rows = [];
    p.on('data', function (row) { rows.push(row) });
    p.on('end', function () {
        t.pass();
    });
});
