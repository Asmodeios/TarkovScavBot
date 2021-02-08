const { 
  clearPlayersInMap, 
  findPlayer, 
  deployInMap,
  updatePlayer,
  createNewPlayer,
} = require('../utils/Player');
const {
  numberWithCommas: formatNumber,
  formatSeconds,
} = require('../utils/formatNumber');

const changeMap = async (db, channels, maps, currentMap) => {
  const playersInMap = db.collection('playersInMap')
  await clearPlayersInMap(playersInMap);
  if (currentMap >= maps.length) {
    currentMap = 0;
  } else {
    currentMap++;
  }
  let map = maps[currentMap];
  channels.forEach((channel) => {
    send(`Map has been changed. Current map: ${map.name}.${map.entry ? ' Entry cost: ' + formatNumber(map.entry) + ' RUB' : ''}`, channel);
  })
};

const listTop5 = async (db) => {
  const playersCollection = db.collection('players')
  const top5 = await playersCollection.find({ }, { name: 1, stonks: 1}).sort({ stonks: -1 }).limit(5).toArray();
  let result = '';
  top5.forEach((player, index) => {
    result += `| ${index + 1} -> ${player.name}: ${formatNumber(player.stonks)} RUB `
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
  if (!player) {
    await createNewPlayer(playersCollection, name);
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
    await updatePlayer({ name }, {
      stonks: reward,
    }, playersCollection)
    
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
  
  await updatePlayer({ name }, {
    stonks: totalStonks,
  }, playersCollection)
  

  return `${name} ${isWin ? 'won' : 'lost'} ${formatNumber(Math.abs(reward))} RUB and now has ${formatNumber(totalStonks)} RUB`

}

const play = async (db, user, maps, currentMap) => {
  const playersCollection = db.collection('players');
  const playersInMap = db.collection('playersInMap');
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
      await updatePlayer({ name }, { stonks: totalStonks }, playersCollection);
    }
  } else {
    totalStonks = (player?.stonks || 0) + reward;
    await createNewPlayer(playersCollection,{
      name,
      stonks: totalStonks,
    })
  }
  await deployInMap(name, playersInMap);

  return `${user['display-name']} escaped from ${maps[currentMap].name} with ${formatNumber(reward)} RUB and now has ${formatNumber(totalStonks)}`;
}

const checkStonks = async (db, user) => {
  const { 'display-name': name  } = user;
  const playersCollection = db.collection('players')
  const player = await playersCollection.findOne({ name },);
  if (!player) {
    createNewPlayer(playersCollection, { name, stonks: 0 });
    return `${name}, you have ${0} RUB.`
  }
  return `${name}, you have ${formatNumber(player.stonks)} RUB.`
}

const fetchMaps = async (db) => {
  const maps = await db.collection('maps').toArray();
  return maps
}


module.exports = {
  play,
  gamble,
  changeMap,
  listTop5,
  checkStonks,
  fetchMaps
}