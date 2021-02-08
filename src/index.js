const tmi = require('tmi.js');
const MongoClient = require('mongodb').MongoClient;
const twitchHandler = require('./twitchHandler');
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
    secure: true,
  },
  identity: {
    username: process.env.BOT_NAME,
    password: process.env.OAUTH_TOKEN,
  },
  channels: ['AsmodeiosX'],
};

const tmiClient = new tmi.client(options);
tmiClient.connect();


async function run() {
  try {
    await mongo.connect();
    const database = mongo.db();
    const twitchChatHandler = await twitchHandler(database, tmiClient, options);
  
    tmiClient.on('connected', (address, port) => {
      twitchChatHandler.connected();
    });
  
    tmiClient.on('chat', async (channel, user, message, self) => {
      twitchChatHandler.chat(channel, user, message, self);
    });

  } catch (error) {
    await mongo.close();
  } finally {
    // await mongo.close();
  }

};

run().catch();