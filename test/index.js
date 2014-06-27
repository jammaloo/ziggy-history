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

test('gives history', function(t) {
  t.plan(4)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  var first_message = true
  ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '2')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 2')

  function check_output(channel, text) {
    var test_text = (first_message) ? "derp: 1" : "derp: 2"
    first_message = false;
    t.equal(text, test_text, 'Says correct history')
    t.equal(channel, 'derp', 'Says to user')
  }
})

test('gives partial history', function(t) {
  t.plan(3)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  var num_messages = 0

  ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 2')

  function check_output(channel, text) {
    num_messages++
    t.equal(num_messages, 1, 'Says only one line')
    t.equal(text, "derp: 1", 'Says only partial history')
    t.equal(channel, 'derp', 'Says to user')
  }
})
