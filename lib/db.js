
var pg = require('pg');

function DB() {
  this.connString = "postgres://yappy:yappy@ice/yappy";
}

DB.prototype.client = function(callback) {
  pg.connect(this.connString, function(err, client, done) {
    if(err) {
      throw err;
    }
    callback(client, function() {
      done();
    })
  });
}

DB.prototype.end = function() {
  // WARNING: global effect
  pg.end();
}

DB.prototype.query = function(queryString, data, callback) {
  this.client(function(client, done) {
    client.query(queryString, data, function(err, result) {
      done()db.js

      callback(err, result);
    })
  })
}

module.exports = new DB();
