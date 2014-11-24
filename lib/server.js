
var moment = require('moment')
var express = require('express')
var compression = require('compression')
var bodyParser = require('body-parser')
var serveStatic = require('serve-static')
var cluster = require('cluster')
var EventEmitter = require('events').EventEmitter
var argv = require('optimist').argv

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

  if(argv.cleanup) {
    // TODO: clean data
    console.log('Cleaning up existing feed table')
    FeedDB.dropTable(function(err) {
      FeedDB.createTable(function(err) {
        if(err) console.log(err)
      })
    })
  }

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
    app.use(serveStatic('public', {'index': ['index.html']}))
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())

    var httpApi = express.Router({
      caseSensitive: true,
      strict: true
    })

    app.use('/api', httpApi)
    var dataFeed = require('./feed.js')
    // api(httpApi, seneca)

    var config = require('../test/config/feed.config.js')

    // TODO: get this from DB
    var feedsCache = {}

    function getFeedDB(feedName, callback) { // async because we may want to validate if the table exists
      if(feedsCache[feedName]) {
        setImmediate(function() {
          callback(undefined, feedsCache[feedName])
        })
      } else {
        feedsCache[feedName] = defineFeedDB(feedName)
        setImmediate(function() {
          callback(undefined, feedsCache[feedName])
        })
      }
    }

    function defineFeedDB(feedName) {
      return ORM.define({
        name: feedName,
        attributes: {
          device: {
            type: 'character varying'
          },
          value: {
            type: 'numeric'
          },
          date: {
            type: 'timestamp with time zone'
          }
        }
      })
    }

    function createFeedDB(feedName, callback) {
      feedsCache[feedName] = defineFeedDB(feedName)
      console.log('storing feed in memory', feedName)
      feedsCache[feedName].createTable(function(err) {
        callback(err, feedsCache[feedName])
      })
    }

    httpApi.use( function( req, res, next ) {
      var originalSend = res.send
      res.send = function(result) {
        if(result instanceof Error) {

          console.log(req.url, '--->', result)

          var jsonReadyError = {}
          for(var attr in result) {
            if(result.hasOwnProperty(attr)) {
              jsonReadyError[attr] = result
            }
          }
          jsonReadyError.message = result.message
          jsonReadyError.stack = result.stack
          if(jsonReadyError.stack) {
            jsonReadyError.stack = jsonReadyError.stack.split('\n')
          }
          originalSend.call(res, jsonReadyError)
        } else {
          originalSend.apply(res, arguments)
        }
      }
      next()
    })

    httpApi.get('/feeds', function(req, res) {
      var offset = 0;
      var limit = 10;
      if(req.query) {
        if(req.query.offset) {
          try {
            offset = parseInt(req.query.offset);
          } catch(err) {
            console.error(err)
          }
        }
        if(req.query.limit) {
          try {
            limit = parseInt(req.query.limit);
          } catch(err) {
            console.error(err)
          }
        }
      }
      FeedDB.list({limit: limit, offset: offset}, function(err, feeds) {
        if(err) {
          res.status(500).send(err)
        } else {
          res.send(feeds)
        }
      })
    });

    httpApi.get('/feeds/:name', function(req, res) {

      FeedDB.load({name: req.param('name')}, function(err, feed) {
        if(err) {
          res.status(500).send(err)
        } else {
          res.send(feed)
        }
      })
    });

    httpApi.post('/feeds', function(req, res) {
      var feedConfig = req.body
      console.log('Defining new feed', JSON.stringify(feedConfig))
      FeedDB.save(feedConfig, function(err, savedFeed) {
        if(err) {
          res.status(500).send(err)
        } else {
          createFeedDB(savedFeed.name, function(err) {
            if(err) {
              res.status(500).send(err)
            } else {
              res.send(savedFeed)
            }
          })
        }
      })
    })


    httpApi.delete('/feeds/:feed', function(req, res) {
      var feedName = req.param('feed')
      // TODO: drop table feedName
      FeedDB.delete({name: feedName}, function(err, result) {
        if(err) {
          res.status(500).send(err)
        } else {
          // WTF !? stringify the result (deleteCount) so that expressjs does
          // not interpret it as a http status.
          res.status(200).send(JSON.stringify(result))
        }
      })
    })


    httpApi.post('/feeds/:feed/:deviceId', function(req, res) {
      var feedName = req.param('feed')
      var deviceId = req.param('deviceId')
      getFeedDB(feedName, function(err, feedDB) {
        if(err) {
          return res.status(500).send(err)
        }
        var data = {
          device: deviceId,
          value: req.body.value,
          date: new Date(Number(req.body.timestamp))
        }

        // console.log('inserting new data', feedName, deviceId, data.date.getTime(), data.value)
        feedDB.save(data, function(err, result) {
          if(err) {
            res.status(500).send(err)
          } else {
            res.send({})
          }
        })
      })
    })


    httpApi.get('/feeds/:feed/:deviceId/:aggrFunction/:fromTimestamp/:toTimestamp', function(req, res) {

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

        var granularity = getAggregateGranularity(interval, feedConfig)

        dataFeed.fetchData(ORM.db(), feed, deviceId, granularity, from, to, aggrFunction, function(err, data) {
          if(err) {
            res.status(500).send(err)
          } else {
            res.send(data)
          }
        })

      })

    })

    var server = app.listen(port, '::', function() {
      console.info('Worker #' + cluster.worker.id + ' listening on port', server.address().port)
    })
  })


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
