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

const createNewPlayer = async (collection, ...data) => {
  const response = await collection.insertOne(data);
}

const updatePlayer = async (query, data, collection) => {
  const response = await collection.updateOne(query, {
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