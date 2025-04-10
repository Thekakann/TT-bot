const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Loop through each guild in the config file
  config.guilds.forEach(async (guildConfig) => {
    const guild = await client.guilds.fetch(guildConfig.guildId);
    const ticketButton = new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('🐯 Click to open.')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(ticketButton);

    const embed = new EmbedBuilder()
      .setTitle('Open a private inquiry!')
      .setDescription('By clicking the button below, a ticket will be opened for you where you can privately reach out to our Staff.')
      .setImage('https://media.discordapp.net/attachments/1077817513997520986/1359929931332583555/IMG_9892.png?ex=67f944f1&is=67f7f371&hm=b04373a8bc2b926ffd389f1cbcccbf017070b1da788de34554c22b0f5df3417d&=&format=webp&quality=lossless&width=2784&height=656')
      .setThumbnail('https://media.discordapp.net/attachments/704018646917316629/1359808072612053074/TTlogo.png')
      .setFooter({ text: 'Sponsored by your mom 💪', iconURL: 'https://media.discordapp.net/attachments/704018646917316629/1359808072612053074/TTlogo.png' })
      .setColor(0xdb8860);

    const channel = guild.channels.cache.get(guildConfig.ticketChannelId);
    if (channel) {
      channel.send({
        embeds: [embed],
        components: [row],
      });
    }
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const guild = interaction.guild;

  // Fetch the guild-specific config
  const guildConfig = config.guilds.find(g => g.guildId === guild.id);

  if (!guildConfig) {
    return interaction.reply({ content: 'This server is not configured properly!', ephemeral: true });
  }

  if (interaction.customId === 'open_ticket') {
    const existingChannel = guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
    if (existingChannel) {
      await interaction.reply({ content: 'You have already opened a ticket!', ephemeral: true });
      return;
    }

    let category = guild.channels.cache.find(c => c.name === guildConfig.ticketCategoryName && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await guild.channels.create({
        name: guildConfig.ticketCategoryName,
        type: ChannelType.GuildCategory,
      });
    }

    const ticketChannel = await guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: guildConfig.modRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ],
    });

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({
      content: `Thank you ${interaction.user} for opening a ticket, please describe your question or issue below and we will get back to you as soon as possible.`,
      components: [row],
    });

    const ticketEmbed = new EmbedBuilder()
      .setTitle('Ticket Created')
      .setDescription(`Your ticket has been opened: ${ticketChannel}`)
      .setColor(0x00b0f4);

    await interaction.reply({
      embeds: [ticketEmbed],
      ephemeral: true,
    });
  }

  if (interaction.customId === 'close_ticket') {
    await interaction.channel.send('The ticket is closing...');
    setTimeout(() => {
      interaction.channel.delete();
    }, 3000);
  }
});

client.login(config.token);
