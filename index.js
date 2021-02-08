const tmi = require('tmi.js');
const MongoClient = require('mongodb').MongoClient;
const formatNumber = require('./utils/formatNumber').formatNumber;
const TimedQeueue = require('./utils/TimedQueue').timedQueue;
const { clearPlayersInMap, findPlayer, deployInMap, } = require('./utils/Player');
require('dotenv/config');
const uri = process.env.CONNECTION_STRING;
const mongo = new MongoClient(uri, { useUnifiedTopology: true });
const options = {
  options: {
    debug: true,
  },
  connection: {
    cluster: 'aws',
    reconnect: true,
  },
  identity: {
    username: process.env.BOT_NAME,
    password: process.env.OAUTH_TOKEN,
  },
  channels: ['AsmodeiosX'],
};

const tmiClient = new tmi.client(options);
tmiClient.connect();

let timedQueue = TimedQeueue((1000 / 3));

const maps = [
  {
    entry: 250000,    
    min: 50000,
    max: 1000000,
    name: 'Labaratory'
  },
  {
    entry: 0,
    min: 0,
    max: 600000,
    name: 'Interchange'
  },
  {
    entry: 0,
    min: 0,
    max: 400000,
    name: 'Shoreline'
  },
  {
    entry: 0,
    min: 0,
    max: 300000,
    name: 'Woods'
  },
  {
    entry: 0,
    min: 0,
    max: 100000,
    name: 'Factory'
  },
  {
    entry: 0,
    min: 0,
    max: 500000,
    name: 'Reserve'
  },
];

async function run() {
  try {
    await mongo.connect();
    const database = mongo.db();
    const playersCollection = database.collection('players');
    let playersInMap = database.collection('playersInMap');
    let currentMap = 1;

    const changeMap = async () => {
      await clearPlayersInMap(playersInMap);
      if (currentMap >= maps.length) {
        currentMap = 0;
      } else {
        currentMap++;
      }
      let map = maps[currentMap];
      options.channels.forEach((channel) => {
        send(`Map has been changed. Current map: ${map.name}.${map.entry ? ' Entry cost: ' + formatNumber(map.entry) : ''}`, channel);
      })
    };

    const listTop5 = async () => {
      const top5 = await playersCollection.find({ }, { name: 1, stonks: 1}).sort({ stonks: -1 }).limit(5).toArray();
      let result = '';
      top5.forEach(player => {
        result += `${player.name}: ${formatNumber(player.stonks)} RUB \n`
      });
      return result
    }

    const gamble = async (user, value) => {
      const { 'display-name': name  } = user;
      const player = await findPlayer(name, playersCollection);
      const isPercentage = /^(\d{1,3})%$/.exec(value);
      const isConstant = /^\d+$/.exec(value);
      const playerStonks = player?.stonks;
      const isWin = Math.random() >= 0.5;
      if (!player) {
        playersCollection.insertOne({
          name,
          stonks: 0,
        })
        return;
      }
      let reward = 0;
      if (name.toLowerCase() === 'aynzz') {
        return 'Stop gambling you doombass';
      }
      if (!playerStonks || playerStonks < 10000) {
        return `${name} minimum entry for ScavCasino is 10000RUB.`;
      }
      if (value === 'all') {
        reward = isWin ? playerStonks * 2 : 0;
        playersCollection.updateOne({ name }, {
          $set: {
            ...player,
            stonks: reward,
          }
        })
        return `${isWin ? `${name} won ${formatNumber(reward)} RUB and now has ${formatNumber(reward)}` : `${name} lost all his money`}`;
      } else if (isPercentage) {
        const percentage = +isPercentage[1] / 100;
        reward = isWin ? Math.round(playerStonks * percentage) : -Math.round(playerStonks * percentage);
      } else if (isConstant && +isConstant[0] >= 10000) {
        reward = isWin ? +isConstant[0] * 2 : -isConstant[0];
      } else {
        return `Specify correct amount -> !gamble 1-100% , !gamble 10000-1000000 or !gamble all`;
      }
      let totalStonks = playerStonks + reward;
      
      playersCollection.updateOne({ name }, {
        $set: {
          ...player,
          stonks: totalStonks,
        }
      })
      

      return `${name} ${isWin ? 'won' : 'lost'} ${formatNumber(Math.abs(reward))} RUB and now has ${formatNumber(totalStonks)} RUB`

    }
  
    const play = async (user) => {
      const { 'display-name': name  } = user;
      const player = await findPlayer(name, playersCollection);
      const current = maps[currentMap];
      const reward = Math.round(Math.random() * (current.max - current.min) + current.min) - current.entry;
      const isInMap = await playersInMap.findOne({ name },);
      console.log('player', player);
      let totalStonks = 0
      if ((player?.stonks || 0 ) < current.entry) {
        return `${name}, you are to poor to deploy on ${current.name}. Maybe get some stonks before`
      }

      if (player) {
        
        if(isInMap) {
          return `${name}, you already raided this map, you have to wait for the map to change.`
        } else {
          totalStonks = player.stonks + reward;
          await playersCollection.updateOne({ name }, { 
            $set: {
              ...player,
              stonks: totalStonks,
            }
          })
        }
      } else {
        totalStonks = (player?.stonks || 0) + reward;
        await playersCollection.insertOne({
          name,
          stonks: totalStonks,
        })
      }
      await deployInMap(name, playersInMap);

      return `${user['display-name']} escaped from ${maps[currentMap].name} with ${formatNumber(reward)} RUB and now has ${formatNumber(totalStonks)}`;
    }
  
    const checkStonks = async (user) => {
      const { 'display-name': name  } = user;
      const player = await playersCollection.findOne({ name },);
      if (!player) {
        await playersCollection.insertOne({
          name,
          stonks: 0,
        });
        return `${name}, you have ${0} RUB.`
      }
      return `${name}, you have ${formatNumber(player.stonks)} RUB.`
    }
  
    const send = (msg, channel) => {
      // const throttled = throttle(() => {
      //   tmiClient.say(channel, msg)
      // }, 300, { leading: false })
      // throttled();
      let func = () => {
        tmiClient.say(channel, msg);
      }
      timedQueue.push(func);
    }

  
  
    tmiClient.on('connected', (address, port) => {
      setInterval(changeMap, 60 * 1000 * 10)
      clearPlayersInMap(playersInMap);
    });
  
    tmiClient.on('chat', async (channel, user, message, self) => {

      if (self || !message.startsWith('!')) {
        return
      };
      const args = message.split(' ');
      const [command, secondParam] = args;

      switch (command.toLowerCase()) {
        case '!currentmap':
          send(`Current map is: ${maps[currentMap].name}`, channel);
          break;
        case '!play':
          let playResponse = await play(user);
          send(playResponse, channel);
          break;
        case '!stonks':
          let stonksResponse = await checkStonks(user);
          send(stonksResponse, channel);
          break;
        case '!gamble':
          let gambleResponse = await gamble(user, secondParam);
          send(gambleResponse, channel);
          break;
        case '!top5':
          let top5Response = await listTop5();
          send(top5Response, channel);
          break;
        default:
          break;
      }
    });

  } catch (error) {
    await mongo.close();
  } finally {
    // await mongo.close();
  }

};

run().catch();