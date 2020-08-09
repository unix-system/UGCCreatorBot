/* eslint-disable no-console */
const commando = require('discord.js-commando');
const path = require('path');
const oneLine = require('common-tags').oneLine;

const db = require('./database');


const client = new commando.Client({
  owner: '128171859245006848',
  commandPrefix: '~'
});

client
  .on('error', console.error)
  .on('ready', async () => {
    console.log(`Client ready; logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`);
  })
  .on('disconnect', () => { console.warn('Disconnected!'); })
  .on('reconnecting', () => { console.warn('Reconnecting...'); })
  .on('commandError', (cmd, err) => {
    if (err instanceof commando.FriendlyError) return;
    console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
  })
  .on('commandBlocked', (msg, reason) => {
    console.log(oneLine`
			Command ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''}
			blocked; ${reason}
		`);
  })

client.registry
  .registerGroup('util', 'Utility')
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, 'commands'));
  //.registerTypesIn(path.join(__dirname, 'types'))
  

client.login(process.env.DISCORD_TOKEN);
