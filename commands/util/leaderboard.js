const { Command } = require('discord.js-commando');
const db = require('../../database');
const catalog = require('../../newCatalog');

let leaderboardMsg = {};

let leaderboardMessages = [];

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
			let strMessage = `**Top 15:**\n`
			let c = 0;
			for (const item of output) {
				c++;
				strMessage = strMessage + `${c}. ${item.name} **(by ${item.creatorName})** - ${item.purchaseCount} sales\n`
			}
			leaderboardMsg.timestamp = Date.now();
			leaderboardMsg.message = strMessage;
			console.log("Fetched new list");
			leaderboardMessages.forEach(async (msg) => {
				if (msg && msg.channel) {
					console.log("List fetched");
					let mes = msg.channel;
					if (mes) {
						msg.edit(strMessage);
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
				let strMessage = `**Top 15:**\n`
				let c = 0;
				for (const item of output) {
					c++;
					strMessage = strMessage + `${c}. ${item.name} **(by ${item.creatorName})** - ${item.purchaseCount} sales\n`
				}
				leaderboardMsg.timestamp =  Date.now();
				leaderboardMsg.message = strMessage;
				console.log("C");
			}
		}
		if (leaderboardMsg.timestamp) {
			console.log("Pushing...");
			message.channel.send(leaderboardMsg.message).then(function(msg) {
				console.log("Recieved");
				leaderboardMessages.push(msg);
				console.log(leaderboardMessages);
			}).catch(console.log);
		} else {
			console.log(leaderboardMsg);
		}
	}
};