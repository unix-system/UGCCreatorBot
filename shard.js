require('dotenv').config();

const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./bot.js', { token: process.env.DISCORD_TOKEN });
const catalog = require('./newCatalog');

async function runCatalogUpdate() {
    const resultData = await catalog.runCatalog();
    console.log(resultData.length);
}

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();

setInterval(() => {
    runCatalogUpdate();
}, 1000 * 60 * 3);
runCatalogUpdate();