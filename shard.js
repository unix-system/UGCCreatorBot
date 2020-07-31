const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./bot.js', { token: process.env.DISCORD_TOKEN });
const catalog = require('./catalog');

async function runCatalogUpdate() {
    const resultData = await catalog();
}

manager.spawn();
manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

setInterval(() => {
    runCatalogUpdate();
}, 1000 * 60 * 10);
runCatalogUpdate();