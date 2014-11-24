
var util = require('util')
var request = require('request')


function Client() {
	this._remoteURL = 'http://localhost:3000/'
}

Client.prototype.setRemoteURL = function(remoteURL) {
	this._remoteURL = remoteURL
}

Client.prototype.define = function(feedConfig, callback) {
	request({
			method: 'POST',
			url: this._remoteURL + '/api/feeds',
			headers: {
        'Accept': 'application/json'
    	},
			json: feedConfig,
			pool: {maxSockets: Infinity},
			timeout: 5000
	}, function (err, response, body) {
		if(err) {
			callback(err)
		} else if(response.statusCode !== 200) {
			err = new Error('Server responded with HTTP-' + response.statusCode +'\n' + JSON.stringify(body))
			callback(err)
		} else {
			callback(undefined)
		}
	})
}

Client.prototype.delete = function(feedName, callback) {
	request({
			method: 'DELETE',
			url: this._remoteURL + '/api/feeds/' + feedName,
			headers: {
				'Accept': 'application/json'
			},
			pool: {maxSockets: Infinity},
			timeout: 5000
	}, function (err, response, body) {
		if(err) {
			callback(err)
		} else if(response.statusCode !== 200) {
			err = new Error('Server responded with HTTP-' + response.statusCode +'\n' + JSON.stringify(body))
			callback(err)
		} else {
			callback(undefined)
		}
	})
}


Client.prototype.push = function(feed, deviceId, value, timestamp, callback) {
	if(timestamp instanceof Date) {
		timestamp = timestamp.getTime()
	}
	var url = this._remoteURL + '/api/feeds/' + feed + '/' + deviceId
	request({
			method: 'POST',
			url: url,
			headers: {
				'Accept': 'application/json'
			},
			json: {
				value: Number(value),
				timestamp: Number(timestamp)
			},
			pool: {maxSockets: Infinity},
			timeout: 5000
	}, function (err, response, body) {
		if(err) {
			callback(err)
		} else if(response.statusCode !== 200) {
			if(body.message && body.stack) {
				err = new ServerError(url, response.statusCode, body)
			} else {
				err = new Error('Server responded with HTTP-' + response.statusCode + '\n' + JSON.stringify(body))
			}
			callback(err)
		} else {
			callback(undefined)
		}
	})
}


Client.prototype.fetch = function(feed, deviceId, aggrFunction, fromTimestamp, toTimestamp, callback) {
	if(fromTimestamp instanceof Date) {
		fromTimestamp = fromTimestamp.getTime()
	}
	if(toTimestamp instanceof Date) {
		toTimestamp = toTimestamp.getTime()
	}

	var url = this._remoteURL +
		'/api/feeds' +
		'/' + feed +
		'/' + deviceId +
		'/' + aggrFunction +
		'/' + Number(fromTimestamp) +
		'/' + Number(toTimestamp)

	request({
			method: 'GET',
			url: url,
			headers: {
				'Accept': 'application/json'
			},
			pool: {maxSockets: Infinity},
			timeout: 5000
	}, function (err, response, body) {
		if(err) {
			callback(err, undefined)
		} else if(response.statusCode !== 200) {
			if(body.message && body.stack) {
				err = new ServerError(url, response.statusCode, body)
			} else {
				err = new Error('Server responded with HTTP-' + response.statusCode + '\n' + JSON.stringify(body))
			}
			callback(err, undefined)
		} else {
			try {
				body = JSON.parse(body)
			} catch(err) {
				return callback(new Error('Failed to parse fetched data as a JSON response: ' + body), undefined)
			}
			callback(undefined, body)
		}
	})
}

function ServerError(url, httpStatus, serverResponse) {
	var message = 'HTTP-' + httpStatus + ': ' + serverResponse.message

	Error.call(this, message)
	this.httpStatusCode = httpStatus
	this._stack = serverResponse.stack || []
	this._stack.unshift('Remote server error HTTP-' + httpStatus + ' at ' + url)
}

util.inherits(ServerError, Error)

Object.defineProperty(ServerError.prototype, 'stack', {
	get: function() {
		return this._stack.join('\n')
	}
})



module.exports = Client
