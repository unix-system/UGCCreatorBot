require('dotenv').config();

const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./bot.js', { token: process.env.DISCORD_TOKEN });
const catalog = require('./newCatalog');

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/pub/api/get_json', async (req, res) => {
  res.send(JSON.stringify(await catalog.pullEntireList()));
})

app.get('/pub/api/top_50_leaderboard', async (req, res) => {
    const data = await catalog.pullEntireList();
    if (data) {
        data.sort(function(a, b){
            return b.purchaseCount - a.purchaseCount;
        });
        let output = data.slice(0, 49);
        res.send(JSON.stringify(output));
    } else {
        res.send(JSON.stringify({success: false, error: "Didn't get correct data"}));
    }
  })


async function runCatalogUpdate() {
    const resultData = await catalog.runCatalog();
    console.log(resultData.length);
}

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();
//;
setInterval(() => {
    runCatalogUpdate();
}, 1000 * 60 * 3);

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
  })
runCatalogUpdate();
