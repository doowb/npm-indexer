'use strict';

var extend = require('extend-shallow');
var algolia = require('search-indexer-algolia');
var npmIndexer = require('./');

/**
 * Simple indexer that just transforms and writes information to console.log
 */

var indexer = {
  // transform `file` into the `package.json` object from npm and remove `.versions` for easier reading
  collect: function(file, next) {
    var pkg = extend({}, file.pkg);
    pkg.objectID = file.key;
    delete pkg.versions;

    console.log('collect', pkg.name);
    next(null, pkg);
  },
  // log out `files` to show that `index` is called multiple times with only current files
  index: function(files, options, cb) {
    console.log('index', files);
    cb();
  }
};

/**
 * Setup options using the simple indexer and starting at a specific sequence number and only looking at 20 files.
 * The `keywords` will attempt to match keywords in the files, and only index matching keywords.
 * Add `includeName: true` to also attempt matching against the package name.
 */

var options = {
  indexer: indexer,
  since: 1283832,
  limit: 20,
  keywords: ['chrome']
};

/**
 * Start the stream. The indexer will be called when keywords match. Only matching files will come through the stream.
 */

npmIndexer(options)
  .on('data', function(file) {
    // console.log('npmIndexer file', file);
  })
  .on('end', function() {
    console.log('npmIndexer end');
  });

