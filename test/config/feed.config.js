
module.exports = {
  feeds: [{
    name: 'temperature',
    aggregates: {
      minute: 0,
      hour: (2 * 60 * 60 * 1000),
      day: (2 * 24 * 60 * 60 * 1000),
      month: (24 * 30 * 24 * 60 * 60 * 1000)
    }
  }, {
    name: 'visitors',
    aggregates: {
      minute: 0,
      hour: (2 * 60 * 60 * 1000),
      day: (2 * 24 * 60 * 60 * 1000),
      month: (24 * 30 * 24 * 60 * 60 * 1000)
    }
  }]
}
