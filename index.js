history_plugin.help = 'use `!history 100` to get a pm with the last 100 messages ' +
  ' from this channel'

history_plugin.max_history = 1000

//replace this with your pastebin api key to enable saving files
history_plugin.pastebin_dev_key = null

history_plugin.history_command_prefix = '!history'

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

//this function routes the messages to the right place, either storing them or
//running the requested command
history_plugin.parseCommand = function(user, channel, text) {
  var self = history_plugin
  if(!self.messages[channel]) self.messages[channel] = []

  var message_parts = text.split(' ')

  //not a history command, so just save the message
  if(message_parts.shift() != self.history_command_prefix) {
    //store the messages
    self.messages[channel].push({'nick': user.nick, 'text': text})
    //once maximum messages for channel is reached start replacing old messages
    if(self.messages[channel].length > self.max_history) self.messages[channel].shift()
    return
  }

  //edge case, if they just said !history
  if(message_parts.length == 0) return self.sendHelp(user)

  var command = message_parts.shift()

  //standard !history <number> command
  var lines_requested = self.filterNumberInput(command)
  if(lines_requested !== false) {
    return self.sendHistory(user, channel, lines_requested)
  }

  switch(command) {
    case 'save':
      return self.saveHistory(user, channel)
    case 'nick':
      //make sure there are at least 2 parameters
      if(message_parts.length != 2) break
      var nick = message_parts.shift()
      //make sure requested lines is a valid number
      lines_requested = self.filterNumberInput(message_parts.shift())
      if(lines_requested === false) break

      return self.sendHistory(user, channel, lines_requested, function nickFilter(message) { return message.nick.toLowerCase() == nick.toLowerCase() })
  }

  //if it isn't caught above, then it goes to help
  return self.sendHelp(user)
}

//returns a parsed number, forcing it to be 1 or higher, or false if invalid
history_plugin.filterNumberInput = function(text) {
  var number = parseInt(text)
  return isNaN(number) ? false : Math.max(number, 1)
}

history_plugin.sendHistory = function(user, channel, lines_requested, filter) {
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

history_plugin.saveHistory = function(user, channel) {
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