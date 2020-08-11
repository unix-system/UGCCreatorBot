const { Command } = require('discord.js-commando');
const db = require('../../database');
const catalog = require('../../newCatalog');
const fetch = require('node-fetch');

const stats = [
	{name: "Tesla Model 3s", price: 48990},
	{name: "Hersheys bars", price: 0.99},
	{name: "Xbox One Xs", price: 499},
	{name: "months worth of Discord Nitro", price: 4.99},
]

let cache = {};

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function funStatistic(totalProfit) {
	const chosenStat = stats[Math.floor(Math.random() * stats.length)];
	return (`${numberWithCommas(Math.floor(totalProfit / chosenStat.price))} ${chosenStat.name}`)
}
function processData(data) {
	let str = `**User Info**\n`
	let productCount = data.length;
	let totalSales = 0;
	let totalProfit = 0;

	data.sort(function(a, b){
		return b.purchaseCount - a.purchaseCount;
	});

	for (const item of data) {
		totalSales += item.purchaseCount;
		totalProfit += (item.purchaseCount * (typeof(item.price) === "number" ? item.price : 0) * 0.3);
	}

	if (data.length > 0) {
		str += `❔ Their best selling product is **'${data[0].name}'** *(with ${data[0].purchaseCount} sales)*\n`
		str += `❔ They have produced **${productCount}** UGC items, with a total of **${numberWithCommas(totalSales)}** sales *(which is **R$ ${numberWithCommas(Math.floor(totalProfit))}**), or **${numberWithCommas(Math.floor(totalProfit * 0.0035))} USD 💸***\n`
		str += `😎 With that amount of money, they have made enough to buy **${funStatistic(totalProfit)}!**`
	}

	return str;
}
module.exports = class StatsCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'stats',
			group: 'util',
			memberName: 'stats',
			description: 'Replies with a stats of the specified user',
			args: [
				{
					key: 'username',
					prompt: 'What username would you like to check out?',
					type: 'string',
				},
			],
		});
	}

	async run(message, args) {
		fetch(`https://api.roblox.com/users/get-by-username?username=${args.username}`)
		.then((resp) => resp.json())
		.then(function(data) {
			if (data) {
				message.reply("Fetching user's information ⌛").then(function(msg) {
					if (!cache[data.Id] || Date.now() - cache[data.Id].timestamp >= 1000 * 60 * 5) {
						db.query('UGCItemData', { key: 'creatorName', value: data.Username}).then(function(dbData) {
							cache[data.Id] = { 
								timestamp: Date.now(),
								data: dbData
							}
							msg.edit({
								"embed": {
									"title": `UGC Stats for ${data.Username}`,
									"description": processData(dbData),
									"color": 3318527,
									"timestamp": new Date(),
									"footer": {
									"icon_url": "https://upload.wikimedia.org/wikipedia/commons/b/b5/ROBLOX_Studio_icon.png",
									"text": "UGC Item Bot - Last Updated"
									},
									"thumbnail": {
										"url": `http://www.roblox.com/Thumbs/Avatar.ashx?x=150&y=150&Format=Png&username=${data.Username}`
									}
								}
							});
						}).catch(function(err) {
							console.log(err);
							msg.edit("😦 Had an issue pulling from the database. Try again later!")
						})
					} else {
						msg.edit({
							"embed": {
								"title": `UGC Stats for ${data.Username}`,
								"description": processData(cache[data.Id].data),
								"color": 3318527,
								"timestamp": new Date(),
								"footer": {
								"icon_url": "https://upload.wikimedia.org/wikipedia/commons/b/b5/ROBLOX_Studio_icon.png",
								"text": "UGC Item Bot - Last Updated"
								},
								"thumbnail": {
									"url": `http://www.roblox.com/Thumbs/Avatar.ashx?x=150&y=150&Format=Png&username=${data.Username}`
								}
							}
						});
					}

				})
			}
		}).catch(function() {
			message.reply("😦 Couldn't get that particular user's information. Is their username spelt correctly?");
		})
	}
};