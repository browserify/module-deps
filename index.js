var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var browserResolve = require('browser-resolve');
var nodeResolve = require('resolve');
var detective = require('detective');
var through = require('through');
var concatStream = require('concat-stream');

module.exports = function (mains, opts) {
    if (!opts) opts = {};
    var cache = opts.cache;
    
    if (!Array.isArray(mains)) mains = [ mains ].filter(Boolean);
    mains = mains.map(function (file) {
        return path.resolve(file);
    });
    
    var visited = {};
    var pending = 0;
    
    var output = through();
    
    var transforms = [].concat(opts.transform).filter(Boolean);
    var resolve = opts.resolve || browserResolve;
    
    var top = { id: '/', filename: '/', paths: [] };
    mains.forEach(function (main) { walk(main, top) });
    
    if (mains.length === 0) {
        output.pause();
        output.queue(null);
        process.nextTick(function () { output.resume() });
    }
    
    return output;
    
    function walk (id, parent, cb) {
        pending ++;
        
        var c = opts.cache && opts.cache[parent.id];
        var resolver = c && typeof c === 'object'
        && !Buffer.isBuffer(c) && c.deps[id]
            ? function (xid, xparent, cb) {
                cb(null, opts.cache[parent.id].deps[id]);
            }
            : resolve;
        ;
        
        if (opts.packageFilter) parent.packageFilter = opts.packageFilter;
        
        resolver(id, parent, function (err, file, pkg) {
            if (err) return output.emit('error', err);
            if (!file) return output.emit('error', new Error([
                'module not found: "' + id + '" from file ',
                parent.filename
            ].join('')));
            if (cb) cb(file);
            if (visited[file]) {
                if (--pending === 0) output.queue(null);
                return;
            }
            visited[file] = true;
            
            var trx = [];
            if (opts.transformKey) {
                var n = pkg;
                opts.transformKey.forEach(function (key) {
                    if (n && typeof n === 'object') n = n[key];
                });
                trx = [].concat(n).filter(Boolean);
            }
            
            if (cache && cache[file]) {
                parseDeps(file, cache[file], pkg);
            }
            else fs.readFile(file, 'utf8', function (err, src) {
                if (err) return output.emit('error', err);
                applyTransforms(file, trx, src, pkg);
            });
        });
    }
    
    function applyTransforms (file, trx, src, pkg) {
        var isTopLevel = mains.some(function (main) {
            var m = path.relative(path.dirname(main), file);
            return m.split('/').indexOf('node_modules') < 0;
        });
        var transf = (isTopLevel ? transforms : []).concat(trx);
        if (transf.length === 0) return done();
        
        (function ap (trs) {
            if (trs.length === 0) return done();
            makeTransform(file, trs[0], function (err, s) {
                if (err) return output.emit('error', err);
                
                s.on('error', output.emit.bind(output, 'error'));
                s.pipe(concatStream(function (data) {
                    src = data;
                    ap(trs.slice(1));
                }));
                s.end(src);
            });
        })(transf);
        
        function done () {
            parseDeps(file, src, pkg);
        }
    }
    
    function parseDeps (file, src, pkg) {
        var deps;
        if (!Buffer.isBuffer(src) && typeof src === 'object') {
            deps = Object.keys(src.deps);
            src = src.source;
        }
        else if (opts.noParse && opts.noParse.indexOf(file) >= 0) {
            deps = [];
        }
        else if (/\.json$/.test(file)) {
            deps = [];
        }
        else {
            try { deps = detective(src) }
            catch (ex) {
                var message = ex && ex.message ? ex.message : ex;
                return output.emit('error', new Error(
                    'Parsing file ' + file + ': ' + message
                ));
            }
        }
        var p = deps.length;
        var current = { id: file, filename: file, paths: [], package: pkg };
        var resolved = {};
        
        deps.forEach(function (id) {
            if (opts.filter && !opts.filter(id)) {
                resolved[id] = false;
                if (--p === 0) done();
                return;
            }
            
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
    
    function makeTransform (file, tr, cb) {
        if (typeof tr === 'function') return cb(null, tr(file));
        
        var params = { basedir: path.dirname(file) };
        nodeResolve(tr, params, function nr (err, res, again) {
            if (err && again) return cb(err);
            
            if (err) {
                return fs.stat(file, function (err_, s) {
                    if (err_) return cb(err_);
                    if (!s.isFIFO()) return cb(err);
                    
                    params.basedir = process.cwd();
                    nodeResolve(tr, params, function (e, r) {
                        nr(e, r, true)
                    });
                });
            }
            
            if (!res) return cb(new Error([
                'cannot find transform module ', tr,
                ' while transforming ', file
            ].join('')));
            
            cb(null, require(res)(file));
        });
    }
};
