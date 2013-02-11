var parser = require('../');
var JSONStream = require('JSONStream');

var stringify = JSONStream.stringify();
stringify.pipe(process.stdout);

var file = __dirname + '/files/main.js';
parser(file).pipe(stringify);
