var test = require('tap').test;
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');

var files = {
    main: path.join(__dirname, '/files/main.js'),
    foo: path.join(__dirname, '/files/foo.js'),
    bar: path.join(__dirname, '/files/bar.js')
};
var sources = {
    main: fs.readFileSync(files.main, 'utf8'),
    foo: fs.readFileSync(files.foo, 'utf8'),
    bar: fs.readFileSync(files.bar, 'utf8')
};

test('bin', function (t) {
    t.plan(3);
        
    var ps = spawn(process.execPath, [
        path.resolve(__dirname, '../bin/cmd.js'), '-',
    ], {
        cwd: __dirname + '/files'
    });
    
    var input = fs.createReadStream(files.main);
    input.pipe(ps.stdin);

    var src = '';
    var err = '';
    ps.stdout.on('data', function (buf) { src += buf });
    ps.stderr.on('data', function (buf) { err += buf });
    
    ps.on('exit', function (code) {
        t.equal(code, 0);
        t.equal(err, '');
        
        var rows = JSON.parse(src);
        t.same(rows.sort(cmp), [
            {
                id: __dirname + '/files/_stream_1.js',
                file: __dirname + '/files/_stream_1.js',
                source: sources.main,
                entry: true,
                deps: { './foo': files.foo }
            },
            {
                id: files.foo,
                file: files.foo,
                source: sources.foo,
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
