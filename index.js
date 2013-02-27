var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var parseShell = require('shell-quote').parse;

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
    var transforms = [].concat(opts.transform).filter(Boolean);
    
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
        
        var trx = [];
        parent.packageFilter = function (pkg) {
            if (pkg.browserify && typeof pkg.browserify === 'object'
            && pkg.browserify.transform) {
                trx = [].concat(pkg.browserify.transform);
            }
            return opts.packageFilter ? opts.packageFilter(pkg) : pkg;
        };
        
        resolve(id, parent, function (err, file) {
            if (err) return output.emit('error', err);
            if (cb) cb(file);
            if (visited[file]) { --pending; return };
            visited[file] = true;
            
            fs.readFile(file, 'utf8', function (err, src) {
                if (err) return output.emit('error', err);
                applyTransforms(file, trx, src);
            });
        });
    }
    
    function applyTransforms (file, trx, src) {
        var isTopLevel = mains.some(function (main) {
            var m = path.relative(path.dirname(main), file);
            return m.split('/').indexOf('node_modules') < 0;
        });
        var transf = (isTopLevel ? transforms : []).concat(trx);
        if (transf.length === 0) return done();
        
        (function ap (trs) {
            if (trs.length === 0) return done();
            var tr = trs[0];
            var cmd = parseShell(tr);
            
            var ps = spawn(cmd[0], cmd.slice(1), {
                cwd: path.dirname(file)
            });
            var data = '';
            ps.stdout.on('data', function (buf) { data += buf });
            ps.on('close', function (code) {
                if (code !== 0) {
                    return output.emit('error',
                        'process ' + tr + ' exited with code ' + code
                    );
                }
                src = data;
                ap(trs.slice(1));
            });
            ps.stdin.end(src);
        })(transf);
        
        function done () {
            parseDeps(file, src);
        }
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
            if (--pending === 0) output.queue(null);
        }
    }
};
