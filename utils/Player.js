const clearPlayersInMap = async (collection) => {
  await collection.deleteMany({});
}

const deployInMap = async (name, collection) => {
  await collection.insertOne({name})
}

const findPlayer = async (name, collection) => {
  const response = await collection.findOne({ name }, );
  return response;
}

const createNewPlayer = async (collection, name) => {
  await collection.insertOne({ 
    name,
    stonks: 0,
    raids: 0,
    survived: 0,
  });
}

const updatePlayer = async (query, data, collection) => {
  await collection.updateOne(query, {
    $set: data,
  })
}

module.exports = {
  clearPlayersInMap,
  deployInMap,
  findPlayer,
  updatePlayer,
  createNewPlayer,
}