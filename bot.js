/* eslint-disable no-console */
require('dotenv').config();
const commando = require('discord.js-commando');
const path = require('path');
const oneLine = require('common-tags').oneLine;
const token = process.env.DISCORD_TOKEN;

const db = require('./database');

const client = new commando.Client({
  owner: '128171859245006848',
  commandPrefix: '~ugc'
});

client
  .on('error', console.error)
  .on('ready', async () => {
    console.log(`Client ready; logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`);
    db.get('UGCServerSettings', {
      server_id: '123'
    }).then(function(data) {
      console.log(data);
    }).catch(console.error);
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
  .registerTypesIn(path.join(__dirname, 'types'))
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.login(token);
