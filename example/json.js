var parser = require('../');
var JSONStream = require('JSONStream');

var stringify = JSONStream.stringify();
stringify.pipe(process.stdout);

parser(process.argv.slice(2)).pipe(stringify)
