const { Command } = require('discord.js-commando');
const db = require('../../database');
const catalog = require('../../newCatalog');
const fetch = require('node-fetch');

let leaderboardMsg = {};

let leaderboardMessages = [];

let starCreators = {};

(async function() { 
	let cursor = "";
	console.log("Function invoked");
	while (cursor !== null) {
		//console.log("fetching " + cursor);
		let url = "https://groups.roblox.com/v1/groups/4199740/users?sortOrder=Asc&limit=100";
		if (cursor !== "") {
			url += "&cursor=" + cursor;
		}
		let response = await fetch(url);
		let data = await response.json();

		if (data) {
			cursor = data.nextPageCursor;
			data.data.forEach(element => {
				//console.log("Got " + element.user.username);
				starCreators[element.user.userId] = true;
			});
		} else {
			//console.log("no data");
		}
	}
  })();

setInterval(async () => {
	if (leaderboardMessages.length > 0) {
		console.log("Pulling");
		let data = await catalog.pullEntireList();
		if (data) {
			console.log("Fetching...");
			data.sort(function(a, b){
				return b.purchaseCount - a.purchaseCount;
			});
			let output = data.slice(0, 15);
			let strMessage = ``
			let c = 0;
			for (const item of output) {
				c++;
				strMessage = strMessage + `${(starCreators[item.creatorTargetId] ? "⭐" : "🔵")} **[${c}. ${item.name}](https://www.roblox.com/catalog/${item.id}/Asset)**\n(by ${item.creatorName}, ${item.purchaseCount} sales)\n`
			}
			leaderboardMsg.timestamp = Date.now();
			leaderboardMsg.message = strMessage;
			console.log("Fetched new list");
			leaderboardMessages.forEach(async (msg) => {
				if (msg && msg.channel) {
					console.log("List fetched");
					let mes = msg.channel;
					if (mes) {
						msg.edit({
							"embed": {
								"title": "Top 15 UGC Assets",
								"description": `This list shows the top 15 UGC assets, by sale:\n\n${strMessage}`,
								"color": 3318527,
								"timestamp": new Date(),
								"footer": {
								"icon_url": "https://upload.wikimedia.org/wikipedia/commons/b/b5/ROBLOX_Studio_icon.png",
								"text": "UGC Item Bot - Last Updated"
								},
								"thumbnail": {
								"url": "https://purepng.com/public/uploads/large/purepng.com-stocks-iconsymbolsiconsapple-iosiosios-8-iconsios-8-721522596121gwbl9.png"
								}
							}
						});
						return;
					} 
				}
				for (const key in leaderboardMessages) {
					const element = leaderboardMessages[key];
					if (element === msg) {
						delete leaderboardMessages[key];
					}
				}
			});
		}
	}
}, 1000 * 60);
module.exports = class LeaderboardCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'leaderboard',
			group: 'util',
			memberName: 'leaderboard',
			description: 'Replies with a leaderboard of the top 50 players',
		});
	}

	async run(message) {
		console.log("Hi");
		if (!leaderboardMsg.timestamp || (Date.now() - leaderboardMsg.timestamp >= (1000 * 60)) ) {
			console.log("A");
			delete leaderboardMsg.timestamp;
			let data = await catalog.pullEntireList();
			if (data) {
				console.log("B");
				data.sort(function(a, b){
					return b.purchaseCount - a.purchaseCount;
				});
				let output = data.slice(0, 15);
				let strMessage = ``
				let c = 0;
				for (const item of output) {
					c++;
					strMessage = strMessage + `${(starCreators[item.creatorTargetId] ? "⭐" : "🔵")} **[${c}. ${item.name}](https://www.roblox.com/catalog/${item.id}/Asset)**\n(by ${item.creatorName}, ${item.purchaseCount} sales)\n`
				}
				leaderboardMsg.timestamp = Date.now();
				leaderboardMsg.message = strMessage;
				console.log("C");
			}
		}
		if (leaderboardMsg.timestamp) {
			console.log("Pushing...");
			message.channel.send({
				"embed": {
					"title": "Top 15 UGC Assets",
					"description": `This list shows the top 15 UGC assets, by sale:\n\n${leaderboardMsg.message}`,
					"color": 3318527,
					"timestamp": new Date(),
					"footer": {
					"icon_url": "https://upload.wikimedia.org/wikipedia/commons/b/b5/ROBLOX_Studio_icon.png",
					"text": "UGC Item Bot - Last Updated"
					},
					"thumbnail": {
					"url": "https://purepng.com/public/uploads/large/purepng.com-stocks-iconsymbolsiconsapple-iosiosios-8-iconsios-8-721522596121gwbl9.png"
					}
				}
			}).then(function(msg) {
				console.log("Recieved");
				leaderboardMessages.push(msg);
				console.log(leaderboardMessages);
			}).catch(console.log);
		} else {
			console.log(leaderboardMsg);
		}
	}
};