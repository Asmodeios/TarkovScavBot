const {
  stats,
  play,
  gamble,
  listTop5,
  changeMap,
  search,
} = require('./actions');
const { 
  clearPlayersInMap, findPlayer, createNewPlayer, 
} = require('../utils/Player');
const TimedQeueue = require('../utils/TimedQueue').timedQueue;
const {
  formatSeconds,
} = require('../utils/formatNumber');
const isEmpty = require('lodash/isEmpty');

const commands = [
  '!map',
  '!play',
  '!gamble',
  '!stats',
  '!top5',
  '!search'
]

const twitchHandler = async (database, tmiClient, options) => {
  let commandsQueue = TimedQeueue(333);
  const maps = await database.collection('maps').find().toArray();
  
  let currentMap = 1;
  let mapTimeLeft = 0;

  const mapTimer = (time) => {
    let seconds = time / 1000;
    setInterval(async () => {
      mapTimeLeft = seconds--;
      if (mapTimeLeft <= 0) {
        currentMap = await changeMap(database, options.channels, maps, currentMap, send);
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
      if (self || !message.startsWith('!') || !isEmpty(commandsQueue.getQueue())) {
        return
      };
      let player = await findPlayer(user['display-name'], database.collection('players'));
      if (!player) {
        await createNewPlayer(database.collection('players'), user['display-name']);
      }
      const commandReg = /(?<command>!\w+)\s*(?<param>.*)/i;
      const args = commandReg.exec(message)
      const { command, param } = args.groups;
      console.log(args.groups);
      switch (command.toLowerCase()) {
        case '!map':
          send(`Current map is: ${maps[currentMap].name}. Time left: ${formatSeconds(mapTimeLeft)}`, channel);
          break;
        case '!play':
          let playResponse = await play(database, user, maps, currentMap);
          send(playResponse, channel);
          break;
        case '!stats':
          let statsResponse = await stats(database, user);
          send(statsResponse, channel);
          break;
        case '!gamble':
          let gambleResponse = await gamble(database, user, param);
          send(gambleResponse, channel);
          break;
        case '!top5':
          let top5Response = await listTop5(database);
          send(top5Response, channel);
          break;
        case '!scavcommands':
          send(`List of commands: ${commands.join(' | ')}`, channel);
        case '!search':
          let item = await search(param);
          return send(`"${item.enName}" price is ${item.avgDayPrice} ₽.`, channel);
        default:
          break;
      }
    },
    connected: async () => {
      await clearPlayersInMap(database.collection('playersInMap'));
      mapTimer(60 * 1000 * 10)
    },
  }
}

module.exports = twitchHandler;