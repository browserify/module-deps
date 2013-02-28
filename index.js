var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var parseShell = require('shell-quote').parse;
var duplexer = require('duplexer');

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
    var transforms = [].concat(opts.transform).filter(Boolean);
    
    var resolve = opts.resolve || browserResolve;
    
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
            if (opts.packageFilter) pkg = opts.packageFilter(pkg);
            
            if (opts.transformKey) {
                var n = pkg;
                opts.transformKey.forEach(function (key) {
                    if (n && typeof n === 'object') n = n[key];
                });
                trx = [].concat(n).filter(Boolean);
            }
            return pkg;
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
            var s = makeTransform(file, trs[0]);
            s.on('error', output.emit.bind(output, 'error'));
            
            var data = '';
            s.on('data', function (buf) { data += buf });
            s.on('end', function () {
                src = data;
                ap(trs.slice(1));
            });
            s.end(src);
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
    
    function makeTransform (file, tr) {
        if (/\s/.test(tr)) return cmdTransform(file, tr);
        
        var tout = through(), tin = through();
        tin.pause();
        
        var parent = { id: file, filename: file, paths: [] };
        resolve(tr, parent, function (err, res) {
            if (err) return output.emit('error', err);
            var t = res
                ? require(res)(file)
                : cmdTransform(file, tr)
            ;
            t.pipe(tout);
            tin.pipe(t);
            tin.resume();
        });
        return duplexer(tin, tout);
    }
    
    function cmdTransform (file, tr) {
        var cmd = parseShell(tr);
        var env = Object.create(process.env);
        env._ = tr;
        env.FILENAME = file;
        var current = { id: file, filename: file, paths: [] };
        
        var ps = spawn(cmd[0], cmd.slice(1), {
            cwd: path.dirname(file),
            env: env
        });
        var error = '';
        ps.stderr.on('data', function (buf) { error += buf });
        ps.on('close', function (code) {
            if (code !== 0) {
                return output.emit('error', [
                    'process ' + tr + ' exited with code ' + code,
                    ' while parsing ' + file + '\n',
                    error.split('\n').join('\n    ')
                ].join(''));
            }
        });
        return duplexer(ps.stdin, ps.stdout);
    }
};
