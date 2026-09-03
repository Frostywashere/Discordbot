require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");

// ================================
// SETTINGS
// ================================

const token = process.env.DISCORD_TOKEN;

const channelId =
  process.env.CHANNEL_ID || "1544875173361221632";

const roleName =
  process.env.ROLE_NAME || "Allowlisted";

const removeRoleName =
  process.env.REMOVE_ROLE_NAME || "Non Whitelisted";

// YOUR DISCORD USER ID
// Only this person can use /clear.
const ownerId = process.env.OWNER_ID;

// ================================
// CHECK TOKEN
// ================================

if (!token || token === "PASTE_YOUR_BOT_TOKEN_HERE") {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

// ================================
// CREATE BOT
// ================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ================================
// BOT ONLINE
// ================================

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Watching channel: ${channelId}`);
  console.log(`Trigger: WL`);
  console.log(`Role: ${roleName}`);
});

// ================================
// REGISTER /CLEAR
// ================================

client.once("ready", async () => {
  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel?.guild) return;

    const commands = await channel.guild.commands.fetch();

    const existing = commands.find(
      (cmd) => cmd.name === "clear"
    );

    if (existing) {
      await existing.edit({
        name: "clear",
        description: "Clear all messages in this channel.",
      });
    } else {
      await channel.guild.commands.create({
        name: "clear",
        description: "Clear all messages in this channel.",
      });
    }

    console.log("Registered /clear command.");
  } catch (error) {
    console.error("Could not register /clear:", error);
  }
});

// ================================
// /CLEAR COMMAND
// ================================

client.on("interactionCreate", async (interaction) => {
  if (
    !interaction.isChatInputCommand() ||
    interaction.commandName !== "clear"
  ) {
    return;
  }

  // ONLY OWNER CAN USE /CLEAR
  if (!ownerId || interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "❌ You are not authorized to use /clear.",
      ephemeral: true,
    });
  }

  // MUST BE IN A SERVER TEXT CHANNEL
  if (
    !interaction.inGuild() ||
    !interaction.channel?.isTextBased()
  ) {
    return interaction.reply({
      content: "❌ Use /clear inside a server text channel.",
      ephemeral: true,
    });
  }

  try {
    await interaction.deferReply({
      ephemeral: true,
    });

    let deleted = 0;

    while (true) {
      const messages =
        await interaction.channel.messages.fetch({
          limit: 100,
        });

      if (messages.size === 0) break;

      // Messages newer than 14 days
      const recent = messages.filter(
        (m) =>
          Date.now() - m.createdTimestamp <
          14 * 24 * 60 * 60 * 1000
      );

      // Messages older than 14 days
      const old = messages.filter(
        (m) =>
          Date.now() - m.createdTimestamp >=
          14 * 24 * 60 * 60 * 1000
      );

      // Bulk delete recent messages
      if (recent.size) {
        await interaction.channel.bulkDelete(
          recent,
          true
        );

        deleted += recent.size;
      }

      // Delete old messages individually
      for (const msg of old.values()) {
        try {
          await msg.delete();
          deleted++;
        } catch (error) {
          console.error(
            "Could not delete old message:",
            error
          );
        }
      }

      if (messages.size < 100) break;
    }

    await interaction.editReply(
      `✅ Cleared ${deleted} message(s) from this channel.`
    );
  } catch (error) {
    console.error("Could not clear channel:", error);

    await interaction
      .editReply(
        "❌ I couldn't clear the channel. Make sure I have **Manage Messages** permission."
      )
      .catch(() => {});
  }
});

// ================================
// WL TRIGGER
// ================================

client.on("messageCreate", async (message) => {

  // Ignore bots
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // Only work in whitelist channel
  if (message.channelId !== channelId) return;

  // Only trigger on exactly "WL"
  if (
    message.content.trim().toLowerCase() !== "wl"
  ) {
    return;
  }

  try {

    // ================================
    // FIND ALLOWLISTED ROLE
    // ================================

    const role = message.guild.roles.cache.find(
      (r) =>
        r.name.toLowerCase() ===
        roleName.toLowerCase()
    );

    if (!role) {
      console.error(
        `Role "${roleName}" was not found.`
      );

      return;
    }

    // ================================
    // GIVE ALLOWLISTED ROLE
    // ================================

    await message.member.roles.add(
      role,
      "Member said WL in the allowlist channel."
    );

    // ================================
    // REMOVE NON WHITELISTED ROLE
    // ================================

    const removeRole =
      message.guild.roles.cache.find(
        (r) =>
          r.name.toLowerCase() ===
          removeRoleName.toLowerCase()
      );

    if (
      removeRole &&
      removeRole.id !== role.id &&
      message.member.roles.cache.has(removeRole.id)
    ) {
      await message.member.roles.remove(
        removeRole,
        "Member was given the Allowlisted role."
      );
    }

    // ================================
    // LOAD BANNER
    // ================================

    const banner = new AttachmentBuilder(
      "./assets/banner.png"
    );

    // ================================
    // CREATE DM EMBED
    // ================================

    const embed = new EmbedBuilder()

      // BLUE LINE ON LEFT
      .setColor(0x0066ff)

      // TITLE
      .setTitle("You are now Allowlisted!")

      // MESSAGE
      .setDescription(
        "Welcome to The Atlanta Heights. To ensure you love the city please " +
        "go to see the news on what's happening or go check out the tebex!\n\n" +

        "**Or you can go ahead and fly right in the city!**\n\n" +

        "If you are found cheating or abusing anything **YOU WILL BE BANNED**"
      )

      // BANNER IMAGE
      .setImage("attachment://banner.png");

    // ================================
    // SEND DM
    // ================================

    try {
      await message.author.send({
        embeds: [embed],
        files: [banner],
      });

      console.log(
        `Successfully DM'd ${message.author.tag}`
      );

    } catch (dmError) {
      console.log(
        `Could not DM ${message.author.tag}. Their DMs may be closed.`
      );
    }

    // NO CHANNEL REPLY
    // The bot only sends the DM.

  } catch (error) {
    console.error(
      "Something went wrong:",
      error
    );

    // NO CHANNEL ERROR REPLY
    // Keeps the whitelist channel completely silent.
  }
});

// ================================
// LOGIN
// ================================

client.login(token);
