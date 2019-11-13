var parser = require('../');
var test = require('tap').test;
var fs = require('fs');
var path = require('path');

var files = {
    main: path.join(__dirname, '/files/esm_type/main.js'),
    esm: path.join(__dirname, '/files/esm_type/esm.js'),
    cjs: path.join(__dirname, '/files/esm_type/cjs.cjs')
};

var sources = Object.keys(files).reduce(function (acc, file) {
    acc[file] = fs.readFileSync(files[file], 'utf8');
    return acc;
}, {});

test('package.json type: "module"', function (t) {
    t.plan(1);
    var p = parser({ esm: true });
    p.end({ file: files.main, entry: true });
    
    var rows = [];
    p.on('data', function (row) { rows.push(row) });
    p.on('end', function () {
        t.same(rows.sort(cmp), [
            {
                id: files.main,
                file: files.main,
                source: sources.main,
                entry: true,
                deps: { './esm.js': files.esm, './cjs.cjs': files.cjs },
                esm: {
                    imports: [
                        { from: './esm.js', import: 'default', as: 'esm' },
                        { from: './cjs.cjs', import: 'default', as: 'cjs' }
                    ],
                    exports: [
                        { export: 'esm', as: 'esm' },
                        { export: 'cjs', as: 'cjs' }
                    ]
                }
            },
            {
                id: files.esm,
                file: files.esm,
                source: sources.esm,
                deps: {},
                esm: {
                    imports: [],
                    exports: [
                        { export: null, as: 'default' }
                    ]
                }
            },
            {
                id: files.cjs,
                file: files.cjs,
                source: sources.cjs,
                deps: {}
            }
        ].sort(cmp));
    });
});

function cmp (a, b) { return a.id < b.id ? -1 : 1 }
