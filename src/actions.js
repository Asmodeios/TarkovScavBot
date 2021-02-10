const { 
  clearPlayersInMap, 
  findPlayer, 
  deployInMap,
  updatePlayer,
  createNewPlayer,
} = require('../utils/Player');
const {
  numberWithCommas: formatNumber,
} = require('../utils/formatNumber');
const fetch = require('cross-fetch');
const isEmpty = require('lodash/isEmpty');

const ripMessage = () => {
  const messages = [
    'buckshot scav (Head,eyes)',
    'Huya/douyu chineese gamer',
    'TTV gamer',
    'super chad gamer',
    'got ratted on',
    'check your corners',
    'exfil camper',
  ]
  return messages[Math.floor(Math.random() * Math.floor(messages.length))]
};

const changeMap = async (db, channels, maps, currentMap, send) => {
  const playersInMap = db.collection('playersInMap')
  await clearPlayersInMap(playersInMap);
  if (currentMap >= maps.length - 1) {
    currentMap = 0;
  } else {
    currentMap++;
  }
  let map = maps[currentMap];
  channels.forEach((channel) => {
    send(`Map has been changed. Current map: ${map.name}.${map.entry ? ' Entry cost: ' + formatNumber(map.entry) + ' ₽' : ''}`, channel);
  })
  return currentMap;
};

const listTop5 = async (db) => {
  const playersCollection = db.collection('players')
  const top5 = await playersCollection.find({ }, { name: 1, stonks: 1}).sort({ stonks: -1 }).limit(5).toArray();
  let result = '';
  top5.forEach((player, index) => {
    result += `| ${index + 1} -> ${player.name}: ${formatNumber(player.stonks)} ₽ `
  });
  return result
}

const gamble = async (db, user, value) => {
  const playersCollection = db.collection('players')
  const { 'display-name': name  } = user;
  const player = await findPlayer(name, playersCollection);
  const isPercentage = /^(\d{1,3})%$/.exec(value);
  const isConstant = /^\d+$/.exec(value);
  const playerStonks = player?.stonks;
  const isWin = Math.random() >= 0.5;
  let reward = 0;

  if (!playerStonks || playerStonks < 10000) {
    return `${name} minimum entry for ScavCasino is 10000₽.`;
  }
  if (value === 'all') {
    reward = isWin ? playerStonks * 2 : 0;
    await updatePlayer({ name }, {
      stonks: reward,
    }, playersCollection)
    
    return `${isWin ? `${name} won ${formatNumber(reward)} ₽ and now has ${formatNumber(reward)}` : `${name} lost all his money`}`;
  } else if (isPercentage) {
    const percentage = +isPercentage[1] / 100;
    reward = isWin ? Math.round(playerStonks * percentage) : -Math.round(playerStonks * percentage);
  } else if (isConstant && +isConstant[0] >= 10000) {
    reward = isWin ? +isConstant[0] * 2 : -isConstant[0];
  } else {
    return `Specify correct amount -> !gamble 1-100% , !gamble 10000-1000000 or !gamble all`;
  }
  let totalStonks = playerStonks + reward;
  
  await updatePlayer({ name }, {
    stonks: totalStonks,
  }, playersCollection)
  

  return `${name} ${isWin ? 'won' : 'lost'} ${formatNumber(Math.abs(reward))} ₽ and now has ${formatNumber(totalStonks)} ₽`

}

const play = async (db, user, maps, currentMap) => {
  const playersCollection = db.collection('players');
  const playersInMap = db.collection('playersInMap');
  const { 'display-name': name  } = user;
  const player = await findPlayer(name, playersCollection);
  const current = maps[currentMap];
  const reward = Math.round(Math.random() * (current.max - current.min) + current.min) - current.entry;
  const isInMap = await playersInMap.findOne({ name },);
  const survived = Math.random() >= 0.33;
  console.log('player', player);
  let totalStonks = 0
  if ((player?.stonks || 0 ) < current.entry) {
    return `${name}, you are to poor to deploy on ${current.name}. Maybe get some stonks before`
  }
  if(isInMap) {
    return `${name}, you already raided this map, you have to wait for the map to change.`
  }

  totalStonks = survived ? player.stonks + reward : player.stonks;
  await updatePlayer({ name }, { 
    stonks: totalStonks,
    raids: (player?.raids || 0) + 1,
    survived: (player?.survived || 0) + (+survived),
  }, playersCollection);
  
  await deployInMap(name, playersInMap);

  if (!survived) {
    return `${name}, didn't escape from ${maps[currentMap].name}. Reason: ${ripMessage()}.`
  }

  return `${name} escaped from ${maps[currentMap].name} with ${formatNumber(reward)} ₽ and now has ${formatNumber(totalStonks)}`;
}

const stats = async (db, user) => {
  const { 'display-name': name  } = user;
  const playersCollection = db.collection('players')
  const player = await playersCollection.findOne({ name },);

  return `${name}, you have ${formatNumber(player.stonks)} ₽. 
  You have raided ${player.raids} times with ${((player.survived / player.raids) * 100).toFixed(2)}% survival rate.`
}

const fetchMaps = async (db) => {
  const maps = await db.collection('maps').toArray();
  return maps
}

const search = async (name) => {
  let data = null;
  if (isEmpty(name)) {
    return 'Provide correct item name e.g. !search Slick';
  }
  try {
    const response = await fetch(`https://tarkov-market.com/api/items?lang=en&search=${name}&tag=&sort=change24&sort_direction=desc&skip=0&limit=1`);

    if (response.status >= 400) {
      throw new Error('Bad response');
    }

    data = await response.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
  const item = data?.items[0];
  if (!item) {
    return `Item "${name}" was not found.`
  }
  return item;
}

module.exports = {
  play,
  gamble,
  changeMap,
  listTop5,
  stats,
  fetchMaps,
  search,
}