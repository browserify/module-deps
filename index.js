var fs = require('fs');
var path = require('path');

var browserResolve = require('browser-resolve');
var detective = require('detective');
var through = require('through');

module.exports = function (mains, opts) {
    if (!Array.isArray(mains)) mains = [ mains ].filter(Boolean);
    mains = mains.map(function (file) {
        return path.resolve(file);
    });
    
    var visited = {};
    var pending = 0;
    var cache = {};
    
    var output = through();
    
    if (!opts) opts = {};
    if (opts.cache === undefined) opts.cache = cache;
    var resolve = opts.resolve || browserResolve;
    opts.includeSource = true;
    
    var top = { id: '/', filename: '/', paths: [] };
    mains.forEach(function (main) { walk(main, top) });
    
    if (mains.length === 0) {
        process.nextTick(output.queue.bind(output, null));
    }
    
    return output;
    
    function walk (id, parent, cb) {
        pending ++;
        
        resolve(id, parent, function (err, file) {
            if (err) return output.emit('error', err);
            if (cb) cb(file);
            if (visited[file]) { --pending; return };
            visited[file] = true;
            
            fs.readFile(file, 'utf8', function (err, src) {
                if (err) output.emit('error', err);
                else parseDeps(file, src);
                
                if (--pending === 0) output.queue(null);
            });
        });
    }
    
    function parseDeps (file, src) {
        var deps = detective(src);
        var p = deps.length;
        var current = { id: file, filename: file, paths: [] };
        var resolved = {};
        
        deps.forEach(function (id) {
            walk(id, current, function (r) {
                resolved[id] = r;
                if (--p === 0) done();
            });
        });
        if (deps.length === 0) done();
        
        function done () {
            var rec = {
                id: file,
                source: src,
                deps: resolved
            };
            if (mains.indexOf(file) >= 0) {
                rec.entry = true;
            }
            output.queue(rec);
        }
    }
};
