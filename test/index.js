var EE = require('events').EventEmitter

var test = require('tape')

var plugin = require('../')

test('gives help text', function(t) {
  t.plan(18)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  var message_counter = 0;

  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!historyfkasjlsdf')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 10!iasdf')

  function check_output(channel, text) {
    message_counter++
    message_text = (message_counter % 2 == 1) ? 'Usage: To get the last 10 ' +
    'lines of chat messages, use the command `!history 10`' : 'History ' +
    'plugin by jammaloo, submit bugs to ' + 
          'https://github.com/jammaloo/ziggy-history/issues'
    t.notEqual(message_counter, 7, 'Only says 6 things')
    t.equal(text, message_text, 'Says help command')
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
  t.plan(6)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  var num_messages = 0

  ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 3')

  function check_output(channel, text) {
    num_messages++
    if(num_messages == 1)
    {
      var message_text = 'Sorry, I only have 1 line(s) of history from the ' +
      'herp channel'
    }
    else
    {
      var message_text = "derp: 1"
    }
    t.notEqual(num_messages, 3, 'Says only one line')
    t.equal(text, message_text, 'Says only partial history')
    t.equal(channel, 'derp', 'Says to user')
  }
})

test('splits long messages', function(t) {
  t.plan(6)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  var message_counter = 0

  ziggy.emit('message', {nick: 'derp'}, 'herp', build_large_message())
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 1')

  function check_output(channel, text) {
    message_counter++
    if(message_counter == 1) {
      var message_text = 'derp: '
    }
    else {
      var message_text = build_large_message()
    }

    t.notEqual(message_counter, 3, 'Only 2 lines')
    t.equal(text, message_text, 'Splits message across multiple lines')
    t.equal(channel, 'derp', 'Says to user')
  }

  function build_large_message()
  {
    var message_size = 512
    var message = ''
    for(var i = 0; i < message_size; i++)
    {
      message += i % 10
    }
    return message
  }
})

test('Warns if no history', function(t) {
  t.plan(2)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 1')

  function check_output(channel, text) {

    t.equal(text, "Sorry, I do not have any history from the herp channel", 'Warns about no history')
    t.equal(channel, 'derp', 'Says to user')
  }
})
