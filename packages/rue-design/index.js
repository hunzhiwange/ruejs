'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/design.cjs.prod.js')
} else {
  module.exports = require('./dist/design.cjs.js')
}
