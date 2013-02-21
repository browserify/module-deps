var fs = require('fs');
var path = require('path');

var required = require('required');
var through = require('through');

module.exports = function (mains, opts) {
    if (!Array.isArray(mains)) mains = [ mains ].filter(Boolean);
    mains = mains.map(function (file) {
        return path.resolve(file);
    });
    
    var files = {};
    var cache = {};
    var pending = 0;
    
    var output = through();
    
    if (!opts) opts = {};
    if (opts.cache === undefined) opts.cache = cache;
    opts.includeSource = true;
    
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
                output.queue(files[file]);
            };
            
            walk(rows);
            if (--pending === 0) output.queue(null);
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
    
    if (pending === 0) process.nextTick(function () {
        output.queue(null);
    });
    
    return output;
    
    function walk (rows) {
        rows.forEach(function (row) {
            if (files[row.filename]) return;
            var r = files[row.filename] = {
                id: row.filename,
                source: row.source,
                deps: (row.deps || []).reduce(function (acc, dep) {
                    acc[dep.id] = dep.filename;
                    return acc;
                }, {})
            };
            if (mains.indexOf(row.filename) >= 0) {
                r.entry = true;
            }
            output.queue(r);
            
            walk(row.deps || []);
        });
    }
};
