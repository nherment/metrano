
var CACHE_TIMEOUT_VALUE = 5 * 60 * 1000 // in milliseconds

function fetchData(db, feed, device, granularity, from, to, aggr, callback) {

  db.query('SELECT date_trunc(\'' + granularity + '\', date) AS date, ' + aggr + '(value) AS value' +
            ' FROM "' + feed + '"' +
            ' WHERE (date, date) OVERLAPS ($1::TIMESTAMP, $2::TIMESTAMP)' +
            ' AND "device"=$3' +
            ' GROUP BY date_trunc(\'' + granularity + '\', date)' +
            ' ORDER BY date_trunc(\'' + granularity + '\', date) ASC',
          [from, to, device],
          function(err, result) {

    if(err) {

      return callback(err, undefined)

    } else {

      var data = []
      if(result && result.rows) {
        for(var i = 0 ; i < result.rows.length ; i++) {
          var row = result.rows[i]
          row.date = row.date.getTime()
          row.value = Number(row.value)
          data.push(row)
        }
      }
      
      callback(undefined, data)

    }
  })
}

var cachedConfigs = {}

function getConfig(FeedDB, feedName, callback) {

  if(cacheHasExpired(feedName)) {

    FeedDB.load({name: feedName}, function(err, feedConfig) {

      if(err) {
        return callback(err, undefined)
      }

      resetCache(feedName, feedConfig)

      callback(err, feedConfig)

    })

  } else {
    callback(undefined, cachedConfigs[feedName].config)
  }
}

function resetCache(feedName, config) {

  if(!cachedConfigs[feedName]) {
    cachedConfigs[feedName] = {}
  }

  cachedConfigs[feedName].lastFetchTimestamp = Date.now()
  cachedConfigs[feedName].config = config

}

function cacheHasExpired(feedName) {
  return !cachedConfigs[feedName] || (cachedConfigs[feedName].lastFetchTimestamp + CACHE_TIMEOUT_VALUE) <= Date.now()
}

module.exports = {
  fetchData: fetchData,
  getConfig: getConfig
}
