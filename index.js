'use strict';

var changes = require('vinyl-changes-stream');
var micromatch = require('micromatch');
var extend = require('extend-shallow');
var through = require('through2');
var koalas = require('koalas');
var Sarge = require('sarge');
var File = require('vinyl');

var defaults = {
  includeName: false,
  db: 'https://skimdb.npmjs.com/registry'
};

/**
 * Create a stream of matching npm packages. Use the provided `indexer` to collect and index
 * the matching npm packages to create search indexes.
 *
 * ```js
 * npmIndexer({
 *   indexer: require('search-indexer-algolia')(algoliaOptions),
 *   keywords: ['assembleplugin']
 * })
 * .on('data', console.log)
 * .on('end', console.log.bind(console, 'done'));
 * ```
 * @param  {Object} `options` Options specifying the indexer to use and additional options for the [changes stream](https://github.com/doowb/vinyl-changes-stream).
 * @param  {Object} `options.indexer` Specify the indexer to use for creating a search index. Example: [search-indexer-algolia][].
 * @param  {Boolean} `options.includeName` Include the package name when determining if the package should be indexed. Defaults to `false`.
 * @param  {Array} `options.keywords` Array of keywords to use to determine if the package should be indexed. These are matched against the package keywords and the package name if `includeName` is `true`.
 * @param  {Number} `options.since` Sequence number passed to changes stream that will indicate which sequence number to start with.
 * @param  {Number} `options.limit` Limit the number of packages returned from the changes stream. Defaults to -1 which will be continuous.
 * @param  {String} `options.db` CouchDB URI to pull the changes stream from. Defaults to the NPM registry.
 * @return {Stream} Returns a stream that will have matching packages.
 * @api public
 */

module.exports = function npmIndexer(options) {
  var opts = extend({}, defaults, options);
  var indexer = opts.indexer;
  if (!indexer) {
    throw new Error('expected a search indexer to be specified');
  }

  var sarge = new Sarge({
    indexers: {default: indexer},
    clear: true
  });

  var keywords = arrayify(opts.keywords);
  var matchers = keywords.map(function(keyword) {
    return function(str) {
      return micromatch.contains(str, keyword);
    };
  });

  var isMatch = micromatch.matcher(function(str) {
    var fns = matchers.map(function(fn) {
      if (fn(str)) return true;
    });
    return koalas.apply(koalas, fns);
  });

  return changes(opts)
    .pipe(through.obj(function(file, enc, next) {
      var haystack = arrayify(opts.includeName ? file.id : null)
        .concat(arrayify(file.json.doc.keywords));

      var searches = haystack.map(function(str) {
        return isMatch(str);
      });

      if (koalas.apply(koalas, searches)) {
        return next(null, toPackage(file));
      }
      next();
    }))
    .pipe(sarge.collect())
    .on('data', function() {
      sarge.index(function(err) {
        if (err) console.error(err);
      })
    });
};

function arrayify(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
}

function toPackage(file) {
  var pkg = new File({
    seq: file.seq,
    key: file.id,
    base: file.base,
    path: file.path,
    contents: new Buffer(JSON.stringify(file.json.doc, null, 2)),
    pkg: file.json.doc
  });
  return pkg;
}
