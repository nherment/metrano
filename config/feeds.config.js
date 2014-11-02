module.exports = [{
	name: 'feeds',
	attributes: {
		name: {
			type: 'string'
			unique: true,
		},
		aggregateThresholds: {
			type: 'json'
		}
	}
}]
