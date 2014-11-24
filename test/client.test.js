
var assert = require('assert')
var uuid = require('uuid')


var Client = require('../metrano.js')


describe(__filename, function() {

	var server
	var client = new Client()

	// postgreSQL does not like dashes in table names
	var feedName = uuid.v4().replace(/-/g, '_')

	after(function(done) {
		console.log('cleaning up test feed')
		client.delete(feedName, function(err, result) {
			done(err)
		})
	})

	it('start server', function(done) {
		server = require('../lib/server.js')
		server.on('start', function(port) {
			client.setRemoteURL('http://localhost:'+port)
			done()
		})

	})

	it('create test feed', function(done) {
		client.define({
			name: feedName,
			aggregateThresholds: {
				minute: 0,
				hour: (2 * 60 * 60 * 1000),
				day: (2 * 24 * 60 * 60 * 1000),
				month: (24 * 30 * 24 * 60 * 60 * 1000)
			}
		}, function(err) {
			done(err)
		})
	})

	var memoryUsage;
	var valueDate;
	it('add data', function(done) {
		memoryUsage = process.memoryUsage().rss
		valueDate = new Date()
		client.push(feedName, 'device1', memoryUsage, valueDate, function(err) {
			done(err)
		})
	})

	it('read feed', function(done) {
		client.fetch(feedName, 'device1', 'AVG', new Date(valueDate.getTime() - 1000), new Date(valueDate.getTime() + 1000), function(err, data) {

			assert.ok(!err, err)

			assert.ok(data)
			assert.equal(data.length, 1)
			assert.equal(data[0].value, memoryUsage)
			done(err)
		})
	})

})
