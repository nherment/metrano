
var moment = require('moment')
var express = require('express')
var compression = require('compression')
var bodyParser = require('body-parser')
var cluster = require('cluster')
var EventEmitter = require('events').EventEmitter


var app = express()

var port = process.env.PORT || 3000

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


    httpApi.get('/water_feed/:from/:to', function(req, res) {
      try {
        var from = new Date(Number(req.param('from')))
        var to = new Date(Number(req.param('to')))
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
      var interval = Math.abs(to - from);
      var granularity = 'year'
      if(interval > (24 * 30 * 24 * 60 * 60 * 1000)) {
        // years
        granularity = 'month'
      } else if(interval > (2 * 24 * 60 * 60 * 1000)) {
        granularity = 'day'
      } else if(interval > (2 * 60 * 60 * 1000)) {
        granularity = 'hour'
      } else {
        granularity = 'minute'
      }
      console.log('INTERVAL', interval, granularity)
      dataFeed.get('nherment', 'water_feed', granularity, from, to, function(err, result) {
        if(err) {
          res.send(err)
        } else {
          res.send(result.rows)
        }
      })

    })

    var server = app.listen(port, '127.0.0.1', function() {
      console.info('Worker #' + cluster.worker.id + ' listening on port', server.address().port)
    })
  });


}
