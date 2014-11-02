
Metrano is an PostgreSQL backed HTTP server for time series aggregation.

This package provide both the server an a node.js library which exposes the
server's functionality.

It is designed to scale to billions (untested) of records per server. If you
need more capacity, you can either shard your data and run more DB instances or
you can look into Hadoop.

Install
=======

```npm install metrano --save```

Server
======

start with ```node metrano.js```

APIs
----

### fetch data

```
GET /feed/<feedName>/<deviceId>/<aggrFunction>/<fromTimestamp>/<toTimestamp>
```

Where:
- ```feedName``` is the name of the feed to retrieve data from
- ```deviceId``` is the unique id of the data of the feed
- ```aggrFunction``` is the calculation function to apply to feed values when
they need to be aggregated. Can be one of ```sum```, ```avg```.
- ```fromTimestamp``` the time in milliseconds since Epoch from which data
should be retrieved
- ```toTimestamp``` the time in milliseconds since Epoch until which the data
should be retrieved

The data is automatically aggregated based on the feed configuration and the
requested time interval.


### push values

a single data point:

```
POST /feed
{
	value: 123,
	timestamp: 1414943636741
}
```

### define a new metric

```
POST /feed
{
	name: 'temperature',
	aggregateThresholds: {
		minute: 0,
		hour: (2 * 60 * 60 * 1000),
		day: (2 * 24 * 60 * 60 * 1000),
		month: (24 * 30 * 24 * 60 * 60 * 1000)
	}
}
```

The ```aggregateThresholds``` attribute contains the timestamps for which an
aggregate should kick off.
Depending on the amount of data you want to retrieve, Metrano will reduce it
based on the values in the configuration.

Available aggregates references are:
- ```minute```
- ```hour```
- ```day```
- ```month```


Client
======

var Metrano = require('metrano')

var metrano = new Metrano('http://localhost:3000/')

metrano.define({
		name: 'temperature',
		aggregates: {
			minute: 0,
			hour: (2 * 60 * 60 * 1000),
			day: (2 * 24 * 60 * 60 * 1000),
			month: (24 * 30 * 24 * 60 * 60 * 1000)
		}
	}, function(err) {
		// metric ready
})


metrano.save('temperature', 123, optionalTimestamp, function(err) {
	// metric saved
})
