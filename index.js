history.help = 'use "!history 100" to get a pm with the last 100 messages ' +
    ' from this channel'

var hist_rex = /^!history ([0-9]+)$/
var hist_help_rex = /^!history.*$/
var max_history = 1000

module.exports = history

function history(ziggy) {
  var messages = {}

  ziggy.on('message', parse_message)

  function parse_message(user, channel, text) {
    //if this is a history request, then we don't need to save the message
    if(hist_rex.test(text)) return send_history()
    if(hist_help_rex.test(text)) {
        ziggy.say(
            user.nick
          , 'Usage: To get the last 10 lines of chat messages, use the ' +
          'command `!history 10`'
        )
        ziggy.say(
            user.nick
          , 'History plugin by jammaloo, submit bugs to ' + 
          'https://github.com/jammaloo/ziggy-history/issues'
        )
        return
    }

    //store the messages
    if(!messages[channel]) messages[channel] = []
    messages[channel].push({'nick': user.nick, 'text': text})
    //once maximum messages for channel is reached start replacing old messages
    if(messages[channel].length > max_history) messages[channel].shift()

    function send_history() {
      var previous = messages[channel]

      if(!previous) {
          ziggy.say(user.nick, 'Sorry, I do not have any history from the ' + 
          channel + ' channel')
          return
      }

      var parts = text.match(hist_rex)

      var history = previous.slice(-parts[1])
      if(history.length != parts[1]) {
          ziggy.say(user.nick, 'Sorry, I only have ' + history.length + 
          ' line(s) of history from the ' + channel + ' channel')
      }

      //send each line of history as a pm nick: message
      history.forEach(function sendHistoryLine(message) {
        var prefix = message.nick + ': '
        var text = message.text
        //if the prefix and the message exceed the max message length
        //then split the message into two
        if(prefix.length + text.length > 512) {
          ziggy.say(
              user.nick
            , prefix
          )
          prefix = ''
        }
        ziggy.say(
            user.nick
          , prefix + text
        )
      })
    }
  }
}
