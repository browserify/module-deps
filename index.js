var fs = require('fs');
var path = require('path');

var required = require('required');
var Stream = require('stream');

module.exports = function (mains) {
    if (!Array.isArray(mains)) mains = [ mains ].filter(Boolean);
    mains = mains.map(function (file) {
        return path.resolve(file);
    });
    
    var files = {};
    var cache = {};
    var pending = 0;
    
    var output = new Stream;
    output.readable = true;
    
    var opts = { cache: cache, includeSource: true };
    
    mains.forEach(function (file) {
        pending ++;
        var p = 2, src, rows;
        
        function done () {
            if (!files[file]) {
                files[file] = {
                    id: file,
                    source: src,
                    entry: true,
                    deps: rows.reduce(function (acc, dep) {
                        acc[dep.id] = dep.filename;
                        return acc;
                    }, {})
                };
                output.emit('data', files[file]);
            };
            
            walk(rows);
            if (--pending === 0) output.emit('end');
        }
        
        fs.readFile(file, 'utf8', function (err, s) {
            if (err) return output.emit('error', err);
            src = s;
            if (--p === 0) done();
        });
        
        required(file, opts, function (err, r) {
            if (err) return output.emit('error', err);
            rows = r;
            if (--p === 0) done();
        });
    });
    
    if (pending === 0) process.nextTick(output.emit.bind(output, 'end'));
    
    return output;
    
    function walk (rows) {
        rows.forEach(function (row) {
            if (files[row.filename]) return;
            var r = files[row.filename] = {
                id: row.filename,
                source: row.source,
                deps: row.deps.reduce(function (acc, dep) {
                    acc[dep.id] = dep.filename;
                    return acc;
                }, {})
            };
            if (mains.indexOf(row.filename) >= 0) {
                r.entry = true;
            }
            output.emit('data', r);
            
            walk(row.deps);
        });
    }
};
