var test = require('blue-tape');
var ServicifyServer = require('servicify-server');
var ServicifyService = require('servicify-service');
var ServicifyClient = require('..');

var Promise = require('bluebird');

var rpc = require('node-json-rpc');
var uniqid = require('uniqid');

test('can be created without a server to connect to yet', function (t) {
  var pc = new ServicifyClient();
  t.ok(pc instanceof ServicifyClient);
  t.end();
});

test('endpoints give load', function (t) {
  return withServer().then(function (server) {
    var ps = new ServicifyService({heartbeat: 10});
    var identity = require('async-identity');

    return ps.offer(identity, {name: 'async-identity', version: '1.2.3'}).then(function (service) {
      return new ServicifyClient().resolve('async-identity', '^1.0.0').then(function(fn) {
        t.equal(typeof fn, 'function');

        return Promise.fromNode(function(cb) {
          fn(10, cb);
        });
      }).then(function() {
        return Promise.delay(15);
      }).then(function() {
        return server.resolve('async-identity', '^1.0.0');
      }).then(function(resolutions) {
        t.equal(resolutions.length, 1, 'only 1 resolution');
        t.ok(resolutions[0].load > 0, 'load went up');
        return service.stop();
      })
    }).then(function () {
      return server.stop();
    });
  });
});

test('supports finding an enpoint by spec', function (t) {
  return withServer().then(function (server) {
    var ps = new ServicifyService();
    var identity = require('async-identity');

    return ps.offer(identity, {name: 'async-identity', version: '1.2.3'}).then(function (service) {
      var pc = new ServicifyClient();

      return pc.resolve('async-identity', '^1.0.0').then(function(fn) {
        t.equal(typeof fn, 'function');

        return Promise.fromNode(function(cb) {
          fn(10, cb);
        });
      }).then(function(result) {
        t.equal(result, 10);
        return service.stop();
      });
    }).then(function () {
      return server.stop();
    });
  });
});

test('supports finding an enpoint by package name', function (t) {
  return withServer().then(function (server) {
    var ps = new ServicifyService();
    var identity = require('async-identity');

    return ps.offer(identity, {name: 'async-identity', version: '1.2.3'}).then(function (service) {
      var pc = new ServicifyClient();

      return pc.resolve('async-identity').then(function(fn) {
        t.equal(typeof fn, 'function');

        return Promise.fromNode(function(cb) {
          fn(10, cb);
        });
      }).then(function(result) {
        t.equal(result, 10);
        return service.stop();
      });
    }).then(function () {
      return server.stop();
    });
  });
});

function withServer() {
  var server = new ServicifyServer();
  return server.listen();
}

function callRpc(client, method, params) {
  return Promise.fromNode(function (cb) {
    client.call({
      'jsonrpc': "2.0",
      'method': method,
      'params': params,
      'id': uniqid()
    }, cb);
  }).then(function (res) {
    return res.result;
  });
}
