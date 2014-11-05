
if(require.main === module) {
  module.exports = require('./lib/server.js')
} else {
  module.exports = require('./lib/client.js')
}
