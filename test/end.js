var parser = require('../');
var test = require('tap').test;
var fs = require('fs');

var file = __dirname + '/files/error.js';
var source = fs.readFileSync(file).toString();

test('error', function (t) {
    t.plan(1);
    var p = parser(file)
    p.on('error', function () {});

    var rows = [];
    
    p.on('data', function (row) { rows.push(row) });
    p.on('end', function () {
        t.same(rows, [
            {
                id: file,
                source: source,
                deps: { './error2.js': __dirname + '/files/error2.js' },
                entry: true
            }
        ]);
    });
});
