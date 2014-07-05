history_plugin.help = 'use `!history 100` to get a pm with the last 100 messages ' +
    ' from this channel'

var hist_rex = /^!history ([0-9]+)$/
var hist_commands_rex = /^!history ([^ ]+) ?([^ ]+)? ?([^ ]+)?$/
var hist_help_rex = /^!history.*$/
var max_history = 1000

//replace this with your pastebin api key to enable saving files
history_plugin.pastebin_dev_key = null

module.exports = history_plugin

function history_plugin(ziggy) {
  var self = history_plugin
  self.messages = {}
  self.ziggy = ziggy
  self.ziggy.on('message', self.parseCommand)

  //a key value pair of enabled features
  self.features = {
      "save_history": true
  }

  //disable pastebin if no dev key is set
  if(self.pastebin_dev_key == null && self.features['save_history']) {
      console.log("Please set pastebin dev key to enable pastebin support")
      self.features['save_history'] = false
  }
  if(self.features['save_history']) {
      PasteBinAPI = require('pastebin-js'),
          self.pastebin = new PasteBinAPI(self.pastebin_dev_key)
  }
}

history_plugin.parseCommand = function(user, channel, text) {
    var self = history_plugin
    if(!self.messages[channel]) self.messages[channel] = []
    //if this is a history request, then we don't need to save the message
    if(hist_rex.test(text)) {
        var lines_requested = text.match(hist_rex)[1]
        if(lines_requested == 0) lines_requested = 1
        return self.sendHistory(user, channel, text, lines_requested)
    }
    if(hist_commands_rex.test(text)) return self.parseCommandType(user, channel, text)
    //if it matches the help text
    if(hist_help_rex.test(text)) return self.sendHelp(user)
    //store the messages
    self.messages[channel].push({'nick': user.nick, 'text': text})
    //once maximum messages for channel is reached start replacing old messages
    if(self.messages[channel].length > max_history) self.messages[channel].shift()
}

history_plugin.sendHistory = function(user, channel, text, lines_requested, filter) {
  var self = history_plugin
  var previous = self.messages[channel]

  if(previous.length == 0) {
      self.ziggy.say(user.nick, 'Sorry, I do not have any history from the ' +
      channel + ' channel')
      return
  }

  if(typeof lines_requested == 'undefined') lines_requested = 0

  var history = self.getHistory(channel, lines_requested, filter)
  if(history.length != lines_requested) {
      self.ziggy.say(user.nick, 'Sorry, I only have ' + history.length +
      ' line(s) of history from the ' + channel + ' channel')
  }

  //send each line of history as a pm nick: message
  history.forEach(function sendHistoryLine(message) {
    var prefix = message.nick + ': '
    var text = message.text
    //if the prefix and the message exceed the max message length
    //then split the message into two
    if(prefix.length + text.length > 512) {
      self.ziggy.say(
          user.nick
        , prefix
      )
      prefix = ''
    }
    self.ziggy.say(
        user.nick
      , prefix + text
    )
  })
}

history_plugin.sendHelp = function(user) {
  var self = history_plugin
  self.ziggy.say(
      user.nick
    , 'Usage: To get the last 10 lines of chat messages, use the ' +
    'command `!history 10`'
  )
  self.ziggy.say(
    user.nick
    , 'Usage: To get a file with chat messages in it, say ' +
        'command `!history save`'
  )
  self.ziggy.say(
    user.nick
    , 'Usage: To get 10 lines of chat messages from Jammaloo say ' +
      'command `!history nick Jammaloo 10`'
  )
  self.ziggy.say(
    user.nick
    , 'History plugin by jammaloo, submit bugs to ' +
    'https://github.com/jammaloo/ziggy-history/issues'
  )
}

history_plugin.extractMessage = function(message) {
  return message.nick + ': ' + message.text
}

//grab the needed lines of history
history_plugin.getHistory = function(channel, lines_requested, filter) {
  var self = history_plugin
  var messages = (typeof filter == 'undefined') ? self.messages[channel] : self.messages[channel].filter(filter)
  return messages.slice(-lines_requested)
}

history_plugin.saveHistory = function(user, channel, text) {
  var self = history_plugin
  if(!self.features['save_history']) {
    self.ziggy.say(user.nick, 'Saving history isn\'t enabled, ask the ' +
        'maintainer to enable it')
    return
  }

  //grab all history
  var history = self.getHistory(channel, 0)

  if(history.length == 0) {
      self.ziggy.say(user.nick, 'Sorry, I do not have any history from the ' +
          channel + ' channel')
      return
  }

  var history_string = history.map(self.extractMessage).join('\n')

  self.createHistoryFile(channel, history_string)
  .then(function(url) { self.sendSavedUrl(user, url) })
  .fail(function(err) { self.error(user, err) })
}

//this function will look at the command run, and decide what function to
//invoke
history_plugin.parseCommandType = function(user, message, text) {
  var self = history_plugin
  var command_parts = text.match(hist_commands_rex)
  if(command_parts.length == 0) return self.sendHelp(user)
  switch(command_parts[1]) {
    case 'save':
      return self.saveHistory(user, message, text)
    case 'nick':
      return self.sendHistory(user, message, text, command_parts[3] , function nickFilter(message) { return message.nick.toLowerCase() == command_parts[2].toLowerCase() })
  }
  return self.sendHelp(user)
}

//saves the text to pastebin
history_plugin.createHistoryFile = function(channel, history_string) {
  var self = history_plugin
  return self.pastebin.createPaste(history_string, 'History from ' + channel, 'text',
  1, '10M')
}

//just pastes the url
history_plugin.sendSavedUrl = function(user, url) {
  var self = history_plugin
  self.ziggy.say(user.nick, 'This URL will self destruct in 10 Minutes: ' + url)
}

//apologise for error and dump it to console
history_plugin.error = function(user, err) {
  var self = history_plugin
  self.ziggy.say(user.nick, 'Sorry ' + user.nick + ', something went wrong'
  + '. Don\'t hate me! Can you let jammaloo know something broke?')
  console.log(err)
}