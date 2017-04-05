'use strict';

var extend = require('extend-shallow');
var algolia = require('search-indexer-algolia');
var npm = require('./');

var indexer = {
  collect: function(file, next) {
    var pkg = extend({}, file.pkg);
    pkg.objectID = file.key;
    delete pkg.versions;

    console.log('collect', pkg);
    next(null, pkg);
  },
  index: function(files, options, cb) {
    console.log('index', files);
    cb();
  }
};

var options = {
  indexer: indexer,
  since: 1283832,
  limit: 20,
  keywords: ['lint']
};

npm(options)
  .on('data', function(file) {
    console.log('npm file', file);
  })
  .on('end', function() {
    console.log('npm end');
  });

