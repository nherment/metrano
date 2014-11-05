var request = require('request');


function Client() {
	this._remoteURL = 'http://localhost:3000/'
}

Client.prototype.setRemoteURL = function(remoteURL) {
	this._remoteURL = remoteURL
}

Client.prototype.define = function(feedConfig, callback) {
	request({
			method: 'POST',
			url: this._remoteURL + '/api/feed',
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
			url: this._remoteURL + '/api/feed/' + feedName,
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


Client.prototype.save = function(feed, deviceId, value, timestamp, callback) {
	request({
			method: 'POST',
			url: this._remoteURL + '/api/feed/' + feed + '/' + deviceId,
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
			err = new Error('Server responded with HTTP-' + response.statusCode + '\n' + JSON.stringify(body))
			callback(err)
		} else {
			callback(undefined)
		}
	})

}





module.exports = Client
