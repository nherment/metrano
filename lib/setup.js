
var db = require('./db.js')
var fs = require('fs')
var SerialRunner = require('serial').SerialRunner

function setup(configFilePath) {
  var config = require(configFilePath)
  var r = new SerialRunner()
  for(var i = 0 ; i < config.feeds.length ; i++) {

  }
}

function createFeedTable(feed, callback) {
  db.query('DROP TABLE IF EXISTS ' + feed + ';', function(err) {
    if(err) return callback(err)
    var createTableQuery = 'CREATE TABLE ' + feed + ' ( account character varying, "date" timestamp with time zone, value integer );'
    db.query(createTableQuery, function(err) {
      callback(err)
    })
  })
}
