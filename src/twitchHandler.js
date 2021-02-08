const {
  checkStonks,
  play,
  gamble,
  listTop5,
  changeMap,
} = require('./actions');
const { 
  clearPlayersInMap, 
} = require('../utils/Player');
const TimedQeueue = require('../utils/TimedQueue').timedQueue;
const {
  formatSeconds,
} = require('../utils/formatNumber');


const twitchHandler = async (database, tmiClient, options) => {
  let commandsQueue = TimedQeueue((1000 / 3));
  const maps = await database.collection('maps').find().toArray();
  
  let currentMap = 1;
  let mapTimeLeft = 0;

  const mapTimer = (time) => {
    let seconds = time / 1000;
    setInterval(() => {
      mapTimeLeft = seconds--;
      if (mapTimeLeft <= 0) {
        changeMap(database, options.channels, maps, currentMap);
        seconds = time / 1000;
      }
    }, 1000)
  }

  const send = (msg, channel) => {
    let func = () => {
      tmiClient.say(channel, msg);
    }
    commandsQueue.push(func);
  }

  return {
    chat: async (channel, user, message, self) => {
      if (self || !message.startsWith('!')) {
        return
      };
      const args = message.split(' ');
      const [command, secondParam] = args;

      switch (command.toLowerCase()) {
        case '!currentmap':
          send(`Current map is: ${maps[currentMap].name}. Time left: ${formatSeconds(mapTimeLeft)}`, channel);
          break;
        case '!play':
          let playResponse = await play(database, user, maps, currentMap);
          send(playResponse, channel);
          break;
        case '!stonks':
          let stonksResponse = await checkStonks(database, user);
          send(stonksResponse, channel);
          break;
        case '!gamble':
          let gambleResponse = await gamble(database, user, secondParam);
          send(gambleResponse, channel);
          break;
        case '!top5':
          let top5Response = await listTop5(database);
          send(top5Response, channel);
          break;
        default:
          break;
      }
    },
    connected: () => {
      clearPlayersInMap(database.collection('playersInMap'));
      mapTimer(60 * 1000 * 10)
    },
  }
}

module.exports = twitchHandler;