# module-deps

walk the dependency graph to generate json output that can be fed into
[browser-pack](https://github.com/substack/browser-build)

# example

``` js
var mdeps = require('module-deps');
var JSONStream = require('JSONStream');

var stringify = JSONStream.stringify();
stringify.pipe(process.stdout);

var file = __dirname + '/files/main.js';
mdeps(file).pipe(stringify);
```

output:

```
$ node example/deps.js
[
{"id":"/home/substack/projects/module-deps/example/files/main.js","source":"var foo = require('./foo');\nconsole.log('main: ' + foo(5));\n","entry":true,"deps":{"./foo":"/home/substack/projects/module-deps/example/files/foo.js"}}
,
{"id":"/home/substack/projects/module-deps/example/files/foo.js","source":"var bar = require('./bar');\n\nmodule.exports = function (n) {\n    return n * 111 + bar(n);\n};\n","deps":{"./bar":"/home/substack/projects/module-deps/example/files/bar.js"}}
,
{"id":"/home/substack/projects/module-deps/example/files/bar.js","source":"module.exports = function (n) {\n    return n * 100;\n};\n","deps":{}}
]
```

and you can feed this json data into
[browser-pack](https://github.com/substack/browser-build):

```
$ node example/deps.js | browser-pack | node
main: 1055
```

# usage

```
usage: module-deps [files]

  generate json output from each entry file

```

# methods

``` js
var mdeps = require('module-deps')
```

## mdeps(files)

Return a readable stream of javascript objects from an array of filenames
`files`.

# install

With [npm](http://npmjs.org), to get the module do:

```
npm install module-deps
```

and to get the `module-deps` command do:

```
npm install -g module-deps
```

# license

MIT
