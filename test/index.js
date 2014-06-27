var EE = require('events').EventEmitter

var test = require('tape')

var plugin = require('../')

test('gives help text', function(t) {
  t.plan(2)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history')

  function check_output(channel, text) {
    t.equal(text, 'Usage: To get the last 10 lines of chat messages, use the ' +
    ' command `!history 10`', 'Says help command')
    t.equal(channel, 'derp', 'Says to user')
  }
})
