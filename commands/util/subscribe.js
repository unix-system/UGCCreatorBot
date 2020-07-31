const stripIndents = require('common-tags').stripIndents;
const commando = require('discord.js-commando');

module.exports = class UserInfoCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: 'user-info',
      aliases: ['user', '🗒'],
      group: 'util',
      memberName: 'user-info',
      description: 'Gets information about a user.',
      examples: ['user-info @Crawl#3208', 'user-info Crawl'],
      guildOnly: true,

      args: [
        {
          key: 'member',
          label: 'user',
          prompt: 'What user would you like to snoop on?',
          type: 'member'
        }
      ]
    });
  }

  async run(msg, args) {

  }
};
