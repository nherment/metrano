module.exports = {
	name: 'feeds',
	attributes: {
		name: {
			type: 'character varying',
			unique: true
		},
		aggregateThresholds: {
			type: 'json'
		}
	}
}
