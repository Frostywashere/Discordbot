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
// WL TRIGGER
// ================================

client.on("messageCreate", async (message) => {

  // Ignore bots
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // Only work in the whitelist channel
  if (message.channelId !== channelId) return;

  // Only trigger on exactly "WL"
  if (message.content.trim().toLowerCase() !== "wl") return;

  try {

    // ================================
    // FIND ALLOWLISTED ROLE
    // ================================

    const role = message.guild.roles.cache.find(
      (r) =>
        r.name.toLowerCase() === roleName.toLowerCase()
    );

    if (!role) {
      console.error(`Role "${roleName}" was not found.`);

      await message.reply(
        `❌ I couldn't find the **${roleName}** role.`
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
      .setColor(0x0066FF)

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

    // ================================
    // CHANNEL CONFIRMATION
    // ================================

    await message.reply(
      `✅ ${message.author}, you've been **Allowlisted**! Check your DMs.`
    );

  } catch (error) {

    console.error("Something went wrong:", error);

    await message.reply(
      "❌ I couldn't give you the Allowlisted role. Make sure my bot role is above **Allowlisted** and has **Manage Roles** permission."
    ).catch(() => {});

  }

});

// ================================
// LOGIN
// ================================

client.login(token);