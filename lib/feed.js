var db = require('./db.js')
var moment = require('moment')

function saveTimeSerie(account, feed, date, value) {
  db.query('INSERT INTO ' + feed + ' ("account", "date", "value") VALUES ($1, $2, $3)',
          [account, date, value],
          function(err, result) {

    if(err) {
      throw err
    }

  })
}

function get(account, feed, granularity, from, to, callback) {

    db.query("SELECT date_trunc('" + granularity + "', date) AS date, SUM(value) AS value" +
              " FROM " + feed +
              " WHERE (date, date) OVERLAPS ($1::DATE, $2::DATE)" +
              " GROUP BY date_trunc('" + granularity + "', date)" +
              " ORDER BY date_trunc('" + granularity + "', date) ASC",
            [from, to],
            function(err, result) {

      callback(err, result)
    })
}
module.exports = {
  saveTimeSerie: saveTimeSerie,
  get: get
}
