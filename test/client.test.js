
var assert = require('assert')
var uuid = require('uuid')


var Client = require('../metrano.js')


describe(__filename, function() {

	var server
	var client = new Client()
	var feedName = uuid.v4()

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

})
