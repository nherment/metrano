
var moment = require('moment')
var express = require('express')
var compression = require('compression')
var bodyParser = require('body-parser')
var cluster = require('cluster')
var EventEmitter = require('events').EventEmitter


var app = express()

var port = process.env.PORT || 3000

var ORM = require('postgresql-orm')

if(!process.env.POSTGRESQL_CONNECTION_STRING) {
  throw new Error('Missing environment variable "POSTGRESQL_CONNECTION_STRING" in the form "postgres://<username>:<password>@<hostName>/<dbName>"')
}

ORM.setup(process.env.POSTGRESQL_CONNECTION_STRING)

var FeedDB = ORM.define(require('../config/feeds.config.js'))

var workers = require('os').cpus().length

if (cluster.isMaster) {
  var clusterStatus = new EventEmitter()

  cluster.setupMaster({
    exec : __filename,
    silent : false
  })

  for (var i = 0; i < workers; i++) {
    cluster.fork()
  }

  cluster.on('exit', function(worker, code, signal) {
    console.warn('worker ' + worker.process.pid + ' died')
  })

  var workersListeningCount = 0
  cluster.on('listening', function(worker, address) {
    workersListeningCount ++
    if(workersListeningCount === workers) {
      clusterStatus.emit('start', port)
    }
  })

  module.exports = clusterStatus

} else if(cluster.isWorker) {

  var d = require('domain').create();

  // d.on('error', function(err) {
  //   console.error(err)
  //   process.exit(1)
  // });

  d.run(function(){
    console.info('Starting worker #', cluster.worker.id)

    app.enable('trust proxy')
    app.use(compression())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())

    var httpApi = express.Router({
      caseSensitive: true,
      strict: true
    })

    app.use('/api', httpApi)
    var dataFeed = require('./feed.js')
    // api(httpApi, seneca)

    var config = require('../test/config/feed.config.js')

    httpApi.get('/feed/:feed/:deviceId/:aggrFunction/:fromTimestamp/:toTimestamp', function(req, res) {

      var feed = req.param('feed')

      var deviceId = req.param('deviceId')
      var aggrFunction = req.param('aggrFunction')

      try {
        var from = new Date(Number(req.param('fromTimestamp')))
        var to = new Date(Number(req.param('toTimestamp')))
      } catch(err) {
        console.warn('messing with URLs', req.url)
        from = new Date()
        from.setHours(0)
        to = new Date()
        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)
        to.setMilliseconds(999)
      }

      dataFeed.getConfig(FeedDB, feed, function(err, feedConfig) {

        if(err) return res.send(err)

        var interval = Math.abs(to - from);

        var granularity = getAggregateGranularity(interval)

        dataFeed.get(ORM.db(), feed, deviceId, granularity, from, to, aggrFunction, function(err, result) {
          if(err) {
            res.send(err)
          } else {
            res.send(result.rows)
          }
        })

      })

    })

    var server = app.listen(port, '127.0.0.1', function() {
      console.info('Worker #' + cluster.worker.id + ' listening on port', server.address().port)
    })
  });


}

function getAggregateGranularity(interval, feedConfig) {
  var granularity = 'year'
  var aggregateThresholds = feedConfig.aggregateThresholds
  if(aggregateThresholds.year && interval > aggregateThresholds.year) {
    // years
    granularity = 'year'
  } else if(aggregateThresholds.month && interval > aggregateThresholds.month) {
    granularity = 'month'
  } else if(aggregateThresholds.day && interval > aggregateThresholds.day) {
    granularity = 'day'
  } else if(aggregateThresholds.hour && interval > aggregateThresholds.hour) {
    granularity = 'hour'
  } else {
    granularity = 'minute'
  }
  return granularity
}
