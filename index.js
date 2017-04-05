'use strict';

var changes = require('vinyl-changes-stream');
var micromatch = require('micromatch');
var extend = require('extend-shallow');
var through = require('through2');
var koalas = require('koalas');
var Sarge = require('sarge');
var File = require('vinyl');

var defaults = {
  db: 'https://skimdb.npmjs.com/registry'
};

module.exports = function(config) {
  config = extend({}, defaults, config);
  var indexer = config.indexer;
  if (!indexer) {
    throw new Error('expected a search indexer to be specified');
  }

  var sarge = new Sarge({
    clear: true,
    indexers: {
      default: indexer
    }
  });

  var keywords = arrayify(config.keywords);
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

  return changes(config)
    .on('error', console.error)
    .pipe(through.obj(function(file, enc, next) {
      var haystack = [file.id].concat(arrayify(file.json.doc.keywords));
      var searches = haystack.map(function(str) {
        return isMatch(str);
      });

      if (koalas.apply(koalas, searches)) {
        return next(null, toPackage(file));
      }
      next();
    }))
    .pipe(sarge.collect())
    .on('error', console.error)
    // pull the data through so the stream doesn't stop
    .on('data', function() {
      sarge.index(function(err) {
        if (err) console.error(err);
      })
    })
    .on('end', function() {
      console.log('done');
    });
};

function arrayify(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
}

function toPackage(file) {
  var pkg = new File({
    key: file.id,
    base: file.base,
    path: file.path,
    contents: new Buffer(JSON.stringify(file.json.doc, null, 2)),
    pkg: file.json.doc
  });
  return pkg;
}
