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

module.exports = {
  clearPlayersInMap,
  deployInMap,
  findPlayer,
}