'use strict';

require('mocha');
var assert = require('assert');
var npmIndexer = require('./');

describe('npm-indexer', function() {
  this.timeout(10000);

  var indexer = {
    collect: function(file, next) {
      next(null, file);
    },
    index: function(files, options, cb) {
      cb();
    }
  };

  it('should export a function', function() {
    assert.equal(typeof npmIndexer, 'function');
  });

  it('should throw an error when invalid args are passed', function(cb) {
    try {
      npmIndexer();
      cb(new Error('expected an error'));
    } catch (err) {
      assert(err);
      assert.equal(err.message, 'expected a search indexer to be specified');
      cb();
    }
  });

  it('should take options', function(cb) {
    npmIndexer({indexer: indexer, keywords: ['*']})
      .once('error', cb)
      .once('data', function(file) {
        assert.equal(typeof file, 'object');
        assert.equal(typeof file.key, 'string');
        assert.equal(typeof file.seq, 'number');
        assert.equal(typeof file.pkg, 'object');
        this.emit('end');
      })
      .once('end', cb);
  });

  it('should start from the specified seq', function(cb) {
    npmIndexer({indexer: indexer, keywords: ['*'], since: 123456})
      .once('error', cb)
      .once('data', function(file) {
        assert.equal(typeof file, 'object');
        assert.equal(typeof file.key, 'string');
        assert.equal(typeof file.seq, 'number');
        assert.equal(typeof file.pkg, 'object');
        assert(file.seq > 123456, 'expected file.seq to be greater than 123456');
        this.emit('end');
      })
      .once('end', cb);
  });

  it('should limit the amount of files returned', function(cb) {
    var count = 0;
    npmIndexer({
      includeName: true,
      indexer: indexer,
      keywords: ['*'],
      since: 123456,
      limit: 3,
    })
    .once('error', cb)
    .on('data', function(file) {
      count++;
    })
    .on('end', function() {
      assert.equal(count, 3);
      cb();
    });
  });
});
