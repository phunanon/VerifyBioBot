import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  GatewayIntentBits,
  IntentsBitField,
  Partials,
} from 'discord.js';
import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();
const verifyChannelSf = process.env.VERIFY_CHANNEL_SF;
const roleSf = process.env.ROLE_SF;
const discordToken = process.env.DISCORD_TOKEN;
assert(verifyChannelSf);
assert(roleSf);
assert(discordToken);

export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
  closeTimeout: 6_000,
});

client.on('ready', () => console.log('Ready!'));
client.on('messageCreate', async message => {
  if (message.channel.id !== verifyChannelSf) return;
  if (message.author.bot) return;
  const member = message.member;
  const meMember = await message.guild?.members.fetch(message.client.user.id);
  if (!member || !meMember) return;
  if (member.roles.highest.position >= meMember.roles.highest.position) return;
  if (member.roles.cache.has(roleSf)) return;
  //Send message with button that only people with roles higher than mine can click
  const button = new ButtonBuilder()
    .setLabel('Renew')
    .setStyle(ButtonStyle.Primary)
    .setCustomId('renew');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  await message.reply({
    content: `Mods, please check their bio and click the button below to renew their <@&${roleSf}> role.`,
    components: [row],
    allowedMentions: { roles: [] },
  });
});
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'renew') return;
  const user = interaction.member?.user;
  if (!user) return;
  const member = await interaction.guild?.members.fetch(user.id);
  const meMember = await interaction.guild?.members.fetch(
    interaction.client.user.id,
  );
  if (!member || !meMember) return;
  if (member.roles.highest.position <= meMember.roles.highest.position) {
    return await interaction.reply({
      content: `You don't have a high enough role in the server.`,
      ephemeral: true,
    });
  }
  const messageId = interaction.message.reference?.messageId;
  const message =
    messageId && (await interaction.channel?.messages.fetch(messageId));
  if (!message) {
    await interaction.reply({
      content: `There was a problem - message not found.`,
      ephemeral: true,
    });
    await interaction.message.delete();
    return;
  }
  try {
    await message.member!.roles.add(roleSf);
    await message.reply({ content: '👍', failIfNotExists: true });
  } catch {
    await interaction.reply({
      content: `There was a problem adding the role.`,
      ephemeral: true,
    });
    await interaction.message.delete();
    return;
  }
  await interaction.reply({
    content: `Successfully added the role.`,
    ephemeral: true,
  });
  await interaction.message.delete();
});

client.login(discordToken);
