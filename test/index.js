var EE = require('events').EventEmitter

var test = require('tape')

var plugin = require('../')

var q = require('q')

test('send help text', function(t) {
    t.plan(3)

    var ziggy = new EE()

    ziggy.say = function noop() {}

    var getHistory = plugin.sendHelp

    plugin.sendHelp = check_help
    plugin(ziggy)

    ziggy.emit('message', {nick: 'derp'}, 'herp', '!history')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '!history fasdfdsaf')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '!historyfasdfd')

    //reset getHistory function
    plugin.sendHelp = getHistory

    function check_help() {
        t.pass('Send help')
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

test('gives 1 line to !history 0 command', function(t) {
  t.plan(2)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin(ziggy)

  ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '2')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 0')

  function check_output(channel, text) {
    t.equal(text, "derp: 2", 'Says correct history')
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
    if(num_messages == 1) {
      var message_text = 'Sorry, I only have 1 line(s) of history from the ' +
      'herp channel'
    }
    else {
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
    for(var i = 0; i < message_size; i++) {
      message += i % 10
    }
    return message
  }
})

test('Warns if no history', function(t) {
  t.plan(4)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin.pastebin_dev_key = 'test'
  plugin(ziggy)

  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 1')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history save')

  function check_output(channel, text) {

    t.equal(text, "Sorry, I do not have any history from the herp channel", 'Warns about no history')
    t.equal(channel, 'derp', 'Says to user')
  }
})

test('Warns saving history is disabled if no dev key set', function(t) {
  t.plan(2)

  var ziggy = new EE()

  ziggy.say = check_output

  plugin.pastebin_dev_key = null
  plugin(ziggy)

  ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history save')

  function check_output(channel, text) {
      t.equal(text, "Saving history isn't enabled, ask the maintainer to enable it", 'Warns that history is disabled')
      t.equal(channel, 'derp', 'Says to user')
  }
})

test('Saves history correctly', function(t) {
  t.plan(4)

  var ziggy = new EE()

  ziggy.say = check_output

  var create_history = plugin.createHistoryFile
  plugin.createHistoryFile = check_history

  plugin.pastebin_dev_key = 'test'
  plugin(ziggy)

  ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '2')
  ziggy.emit('message', {nick: 'derp'}, 'herp', '!history save')

  plugin.createHistoryFile = create_history

  function check_history(channel, text) {
    t.equal(text, 'derp: 1\nderp: 2', 'Warns that history is disabled')
    t.equal(channel, 'herp', 'Saves for correct channel')
    var promise = q.defer()
    promise.resolve('test url')
    return promise.promise
  }

  function check_output(user, url) {
    t.equal(url, 'This URL will self destruct in 10 Minutes: test url', 'Sends correct URL')
    t.equal(user, 'derp', 'Sends to correct user')
  }
})

test('getHistory filters messages correctly', function(t) {
    t.plan(1)

    var ziggy = new EE()

    ziggy.say = function noop() {}

    var getHistory = plugin.getHistory

    plugin.getHistory = function testFilter(channel, lines_requested, filter) {
        var filtered_messages = getHistory(channel, lines_requested, function filterMessages(message) {
            return message['text'] == '1'
        })
        check_filter(filtered_messages)
        return filtered_messages
    }
    plugin(ziggy)

    ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '2')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '3')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '!history 2')

    //reset getHistory function
    plugin.getHistory = getHistory

    function check_filter(messages) {
        t.equal(JSON.stringify(messages), JSON.stringify([{'nick': 'derp', 'text': '1'}, {'nick': 'derp', 'text': '1'}]), 'Filters messages correctly')
    }
})

test('can request by nick', function(t) {
    t.plan(4)

    var ziggy = new EE()

    ziggy.say = check_output

    plugin(ziggy)

    ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
    ziggy.emit('message', {nick: 'derp2'}, 'herp', '2')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
    ziggy.emit('message', {nick: 'derp2'}, 'herp', '2')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '1')
    ziggy.emit('message', {nick: 'derp2'}, 'herp', '2')
    ziggy.emit('message', {nick: 'derp'}, 'herp', '!history nick derp 2')

    function check_output(channel, text) {
        t.equal(text, 'derp: 1', 'Says correct history')
        t.equal(channel, 'derp', 'Says to user')
    }
})