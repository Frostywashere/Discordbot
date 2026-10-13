require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");

// ==================================================
// SETTINGS
// ==================================================

const token = process.env.DISCORD_TOKEN;

// WL SETTINGS
const channelId =
  process.env.CHANNEL_ID || "1559369861602353172";

const roleName =
  process.env.ROLE_NAME || "Allowlisted";

const removeRoleName =
  process.env.REMOVE_ROLE_NAME || "Non Whitelisted";

// STAFF ROLE
const staffRoleId =
  process.env.STAFF_ROLE_ID || "1559019871763955792";

const staffRoleName =
  process.env.STAFF_ROLE_NAME || "Staff";

// All bot commands are registered as Discord slash commands.

// Only this Discord user can use /ticketpanel
const TICKET_PANEL_OWNER_ID = "967553808223858699";

// CUSTOM EMOJI
const ticketEmojiId = "1546224146919334040";
const ticketEmojiName = "profile";

// TRANSCRIPT FOLDER
const transcriptsFolder = path.join(
  __dirname,
  "transcripts"
);

// TRANSCRIPT CHANNEL
const transcriptChannelId = "1559371004403392643";

// ==================================================
// CHECK TOKEN
// ==================================================

if (!token || token === "PASTE_YOUR_BOT_TOKEN_HERE") {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

// Create transcript folder
if (!fs.existsSync(transcriptsFolder)) {
  fs.mkdirSync(transcriptsFolder, {
    recursive: true,
  });
}

// ==================================================
// CREATE CLIENT
// ==================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ==================================================
// TICKET CATEGORIES
// ==================================================

const ticketCategories = [
  {
    label: "General Support",
    description: "Open a ticket in this category for General Support",
    value: "general_support",
    channelName: "ticket",
    categoryId: "1559020076643127296",
  },

  {
    label: "Player Report",
    description: "Open a ticket in this category too Report a player for breaking server rules",
    value: "player_report",
    channelName: "ticket",
    categoryId: "1559020067331772528",
  },

  {
    label: "Donation Support",
    description: "Open a ticket in this category for Donation Support",
    value: "donation_ticket",
    channelName: "ticket",
    categoryId: "1559020069646893096",
  },

  {
    label: "Female Verification",
    description: "Open a ticket in this category to Request verification for female roles and perks",
    value: "female_verification",
    channelName: "ticket",
    categoryId: "1559020071865548820",
  },

  {
    label: "Staff Reports",
    description: "Open a ticket in this category too report a staff member",
    value: "staff_reports",
    channelName: "ticket",
    categoryId: "1559020027427029133",
  },

  {
    label: "Ban Appeals",
    description: "Open a ticket in this category for an ban appeal, or for an false ban ticket",
    value: "ban_appeals",
    channelName: "ticket",
    categoryId: "1559019984875683870",
  },

  {
    label: "Contact a Developer",
    description: "Open a ticket in this category too Contact our development team about server issues",
    value: "contact_developer",
    channelName: "ticket",
    categoryId: "1559019989162401802",
  },

  {
    label: "Gang Support",
    description: "Open a ticket in this category too Get help with gang related issues.",
    value: "gang_support",
    channelName: "ticket",
    categoryId: "1559371512203583508",
  },

  {
    label: "Clothing Development",
    description: "Open this ticket if you have questions about clothing or need help with clothing-related matters.",
    value: "clothing_development",
    channelName: "ticket",
    categoryId: "1559020025774612581",
  },
];

// ==================================================
// HELPER FUNCTIONS
// ==================================================

function findStaffRole(guild) {
  const roleById = guild.roles.cache.get(staffRoleId);

  if (roleById) {
    return roleById;
  }

  return guild.roles.cache.find(
    (role) =>
      role.name.toLowerCase() ===
      staffRoleName.toLowerCase()
  );
}

function isStaff(member) {
  if (!member) {
    return false;
  }

  return Boolean(
    member.roles.cache.has(staffRoleId) ||
    member.roles.cache.some(
      (role) =>
        role.name.toLowerCase() ===
        staffRoleName.toLowerCase()
    )
  );
}

function isTicketChannel(channel) {
  return Boolean(
    channel &&
      channel.type === ChannelType.GuildText &&
      typeof channel.topic === "string" &&
      channel.topic.startsWith("ticket-owner:")
  );
}

function safeFileName(name) {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 80);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomTicketNumber() {
  return Math.floor(1000 + Math.random() * 9000);
}

// ==================================================
// FETCH ALL MESSAGES
// ==================================================

async function fetchAllMessages(channel) {
  const messages = [];
  let before;

  while (true) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (!batch.size) {
      break;
    }

    messages.push(...batch.values());

    if (batch.size < 100) {
      break;
    }

    before = batch.last().id;
  }

  return messages.sort(
    (a, b) =>
      a.createdTimestamp -
      b.createdTimestamp
  );
}

// ==================================================
// CREATE TRANSCRIPT
// ==================================================

async function createTranscript(
  channel,
  closedBy = "Unknown"
) {
  const messages =
    await fetchAllMessages(channel);

  const guildName =
    channel.guild?.name ||
    "Discord Server";

  const ownerId = channel.topic
    ? channel.topic.replace(
        "ticket-owner:",
        ""
      )
    : "Unknown";

  const messageHtml = messages
    .map((message) => {
      const timestamp =
        new Date(
          message.createdTimestamp
        ).toLocaleString();

      const author = escapeHtml(
        message.author?.tag ||
          message.author?.username ||
          "Unknown"
      );

      const avatar =
        message.author?.displayAvatarURL({
          extension: "png",
          size: 64,
        }) || "";

      const content = escapeHtml(
        message.content || ""
      ).replace(/\n/g, "<br>");

      const attachments =
        Array.from(
          message.attachments.values()
        )
          .map(
            (attachment) =>
              `<div><a href="${escapeHtml(
                attachment.url
              )}" target="_blank">${escapeHtml(
                attachment.name ||
                  attachment.url
              )}</a></div>`
          )
          .join("");

      return `
        <div class="message">
          <img
            class="avatar"
            src="${escapeHtml(avatar)}"
            alt="avatar"
          >

          <div class="message-body">

            <div class="message-header">
              <strong>${author}</strong>
              <span>${escapeHtml(timestamp)}</span>
            </div>

            <div class="content">
              ${
                content ||
                "<i>No text content</i>"
              }
            </div>

            ${attachments}

          </div>
        </div>
      `;
    })
    .join("\n");

  const now = new Date();

  const stamp =
    now.toISOString().replace(
      /[:.]/g,
      "-"
    );

  const fileName =
    `${safeFileName(channel.name)}-${stamp}.html`;

  const filePath =
    path.join(
      transcriptsFolder,
      fileName
    );

  const html = `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
Transcript - ${escapeHtml(
  channel.name
)}
</title>

<style>

body {
  margin: 0;
  padding: 24px;
  background: #111318;
  color: #e7e9ee;
  font-family: Arial, Helvetica, sans-serif;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  background: #191c24;
  border: 1px solid #2b2f3a;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

h1 {
  margin: 0 0 10px;
  font-size: 24px;
}

.meta {
  color: #9aa1ae;
  font-size: 14px;
  line-height: 1.7;
}

.message {
  display: flex;
  gap: 12px;
  background: #181b22;
  border-bottom: 1px solid #272b35;
  padding: 14px 16px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2a2e38;
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 5px;
}

.message-header span {
  color: #7f8795;
  font-size: 12px;
}

.content {
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

a {
  color: #66aaff;
}

</style>

</head>

<body>

<div class="container">

  <div class="header">

    <h1>
      Atlanta Heights Ticket Transcript
    </h1>

    <div class="meta">

      <div>
        <strong>Server:</strong>
        ${escapeHtml(guildName)}
      </div>

      <div>
        <strong>Channel:</strong>
        #${escapeHtml(channel.name)}
      </div>

      <div>
        <strong>Ticket Owner ID:</strong>
        ${escapeHtml(ownerId)}
      </div>

      <div>
        <strong>Closed/Saved By:</strong>
        ${escapeHtml(closedBy)}
      </div>

      <div>
        <strong>Saved:</strong>
        ${escapeHtml(
          now.toLocaleString()
        )}
      </div>

      <div>
        <strong>Messages:</strong>
        ${messages.length}
      </div>

    </div>

  </div>

  <div>
    ${
      messageHtml ||
      '<div class="header">No messages found.</div>'
    }
  </div>

</div>

</body>

</html>`;

  fs.writeFileSync(
    filePath,
    html,
    "utf8"
  );

  return filePath;
}

// ==================================================
// SEND TRANSCRIPT TO TRANSCRIPT CHANNEL
// ==================================================

async function sendTranscriptToChannel(
  guild,
  filePath,
  ticketName,
  savedBy
) {
  try {
    const transcriptChannel =
      guild.channels.cache.get(
        transcriptChannelId
      );

    if (!transcriptChannel) {
      console.error(
        `Transcript channel ${transcriptChannelId} was not found.`
      );
      return;
    }

    await transcriptChannel.send({
      content:
        `📄 **Ticket Transcript**\n**Ticket:** ${ticketName}\n**Saved By:** ${savedBy}`,
      files: [filePath],
    });

    console.log(
      `Transcript sent to #${transcriptChannel.name}`
    );
  } catch (error) {
    console.error(
      "Failed to send transcript to transcript channel:",
      error
    );
  }
}

// ==================================================
// PURGE CHANNEL
// ==================================================

async function purgeChannel(channel) {
  let deletedCount = 0;

  while (true) {
    const batch =
      await channel.messages.fetch({
        limit: 100,
      });

    if (!batch.size) {
      break;
    }

    const recent =
      batch.filter(
        (message) =>
          Date.now() -
            message.createdTimestamp <
          14 *
            24 *
            60 *
            60 *
            1000
      );

    const old =
      batch.filter(
        (message) =>
          Date.now() -
            message.createdTimestamp >=
          14 *
            24 *
            60 *
            60 *
            1000
      );

    if (recent.size) {
      const deleted =
        await channel.bulkDelete(
          recent,
          true
        );

      deletedCount += deleted.size;
    }

    for (const message of old.values()) {
      await message
        .delete()
        .catch(() => {});

      deletedCount++;
    }

    if (batch.size < 100) {
      break;
    }
  }

  return deletedCount;
}

// ==================================================
// CREATE TICKET PANEL
// ==================================================

function createTicketPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x0066ff)
    .setTitle(
      `<:profile:${ticketEmojiId}> Atlanta Heights Support Tickets`
    )
    .setDescription(
      "Welcome to Atlanta Heights Support. To ensure your issue is handled as quickly as possible, please select the most relevant category below.\n\n" +
      "Our staff team will respond as soon as possible — please be patient and provide clear, detailed information so we can assist you efficiently.\n\n" +
      "*If you are found spamming tickets/abusing our ticket system — You will be banned.*"
    )
    .setImage(
      "attachment://banner.png"
    );

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "ticket_category"
      )
      .setPlaceholder(
        "Press here to open a ticket."
      )
      .addOptions(
        ticketCategories.map(
          (ticket) => ({
            label: ticket.label,
            description:
              ticket.description,
            value: ticket.value,
            emoji: { id: ticketEmojiId, name: ticketEmojiName },
          })
        )
      );

  const row =
    new ActionRowBuilder()
      .addComponents(menu);

  return {
    embed,
    row,
  };
}

// ==================================================
// SLASH COMMAND DEFINITIONS
// ==================================================

const slashCommands = [
  new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Post the Atlanta Heights support ticket panel"),
  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Clear messages in this channel"),
  new SlashCommandBuilder()
    .setName("alert")
    .setDescription("Send a direct-message alert to a member")
    .addUserOption(option => option.setName("user").setDescription("Member to alert").setRequired(true))
    .addStringOption(option => option.setName("message").setDescription("Alert message").setRequired(true)),
  new SlashCommandBuilder()
    .setName("transcript")
    .setDescription("Save and send this ticket transcript"),
  new SlashCommandBuilder()
    .setName("close")
    .setDescription("Save transcript and close this ticket"),
  new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Delete this ticket without a transcript"),
  new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename this ticket channel")
    .addStringOption(option => option.setName("name").setDescription("New channel name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a member or role to this ticket")
    .addSubcommand(sub => sub.setName("user").setDescription("Add a member to this ticket")
      .addUserOption(option => option.setName("member").setDescription("Member to add").setRequired(true)))
    .addSubcommand(sub => sub.setName("role").setDescription("Add a role to this ticket")
      .addRoleOption(option => option.setName("role").setDescription("Role to add").setRequired(true))),
  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a member or role from this ticket")
    .addSubcommand(sub => sub.setName("user").setDescription("Remove a member from this ticket")
      .addUserOption(option => option.setName("member").setDescription("Member to remove").setRequired(true)))
    .addSubcommand(sub => sub.setName("role").setDescription("Remove a role from this ticket")
      .addRoleOption(option => option.setName("role").setDescription("Role to remove").setRequired(true))),
].map(command => command.toJSON());

// ==================================================
// BOT READY + REGISTER SLASH COMMANDS
// ==================================================

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`WL channel: ${channelId}`);
  console.log(`Custom ticket emoji: <:profile:${ticketEmojiId}>`);

  try {
    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommands }
    );
    console.log("Registered slash commands.");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
});

// ==================================================
// MESSAGE CREATE — WL trigger only (all commands are slash commands)
// ==================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.channelId !== channelId) return;
  if (message.content.trim().toLowerCase() !== "wl") return;

  try {
    const member = message.member;
    const role = message.guild.roles.cache.find(
      r => r.name.toLowerCase() === roleName.toLowerCase()
    );
    if (!role) {
      console.error(`Role "${roleName}" was not found.`);
      return;
    }

    await member.roles.add(role, "Member said WL in the allowlist channel.");

    const removeRole = message.guild.roles.cache.find(
      r => r.name.toLowerCase() === removeRoleName.toLowerCase()
    );
    if (removeRole && removeRole.id !== role.id && member.roles.cache.has(removeRole.id)) {
      await member.roles.remove(removeRole, "Member was given the Allowlisted role.");
    }

    const banner = new AttachmentBuilder("./assets/banner.png");
    const embed = new EmbedBuilder()
      .setColor(0x0066ff)
      .setTitle("You are now Allowlisted!")
      .setDescription(
        "Welcome to The Atlanta Heights. To ensure you love the city please " +
        "go to see the news on what's happening or go check out the tebex!\n\n" +
        "**Or you can go ahead and fly right in the city!**\n\n" +
        "If you are found cheating or abusing anything **YOU WILL BE BANNED**"
      )
      .setImage("attachment://banner.png");

    await message.author.send({ embeds: [embed], files: [banner] }).catch(error => {
      console.log(`Could not DM ${message.author.tag}: ${error.message}`);
    });
    // No public reply in the WL channel.
  } catch (error) {
    console.error("WL handling error:", error);
  }
});

// ==================================================
// INTERACTIONS
// ==================================================

client.on(
  "interactionCreate",
  async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const { commandName, guild, member, channel } = interaction;
        const ephemeral = { ephemeral: true };

        if (!guild) {
          await interaction.reply({ content: "This command only works in the server.", ...ephemeral });
          return;
        }

        if (commandName === "ticketpanel") {
          if (interaction.user.id !== TICKET_PANEL_OWNER_ID) {
            await interaction.reply({ content: "❌ Only the designated owner can use this command.", ...ephemeral });
            return;
          }
          const { embed, row } = createTicketPanel();
          const banner = new AttachmentBuilder("./assets/banner.png");
          await interaction.channel.send({ embeds: [embed], components: [row], files: [banner] });
          await interaction.reply({ content: "✅ Ticket panel posted.", ...ephemeral });
          return;
        }

        if (commandName === "purge") {
          if (!isStaff(member)) {
            await interaction.reply({ content: "❌ Only staff can use `/purge`.", ...ephemeral });
            return;
          }
          if (channel.type !== ChannelType.GuildText) {
            await interaction.reply({ content: "❌ Use this in a text channel.", ...ephemeral });
            return;
          }
          await interaction.deferReply(ephemeral);
          const deletedCount = await purgeChannel(channel);
          await interaction.editReply(`🧹 Chat cleared. Deleted **${deletedCount}** message${deletedCount === 1 ? "" : "s"}.`);
          return;
        }

        if (commandName === "alert") {
          if (!isStaff(member)) {
            await interaction.reply({ content: "❌ Only staff can use `/alert`.", ...ephemeral });
            return;
          }
          const target = interaction.options.getUser("user", true);
          const alertMessage = interaction.options.getString("message", true);
          try {
            await target.send({
              embeds: [new EmbedBuilder().setColor(0x0066ff).setTitle("Atlanta Heights Alert").setDescription(alertMessage)]
            });
            await interaction.reply({ content: `✅ Alert sent to ${target.tag}.`, ...ephemeral });
          } catch {
            await interaction.reply({ content: "❌ I couldn't DM that member. They may have DMs disabled.", ...ephemeral });
          }
          return;
        }

        if (["transcript", "close", "delete", "rename", "add", "remove"].includes(commandName)) {
          if (!isTicketChannel(channel)) {
            await interaction.reply({ content: "❌ This command can only be used inside a ticket.", ...ephemeral });
            return;
          }
          if (!isStaff(member)) {
            await interaction.reply({ content: `❌ Only staff can use \`/${commandName}\` in tickets.`, ...ephemeral });
            return;
          }

          if (commandName === "transcript") {
            await interaction.deferReply(ephemeral);
            const filePath = await createTranscript(channel, interaction.user.tag);
            await sendTranscriptToChannel(guild, filePath, channel.name, interaction.user.tag);
            await interaction.editReply({ content: "✅ Transcript saved and sent to the transcript channel.", files: [filePath] });
            return;
          }

          if (commandName === "close") {
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("ticket_close_confirm").setLabel("Yes").setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("No").setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ content: "🔒 Are you sure you want to close this ticket? A transcript will be saved.", components: [row], ...ephemeral });
            return;
          }

          if (commandName === "delete") {
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("ticket_delete_confirm").setLabel("Yes, delete").setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ content: "🗑️ Delete this ticket without saving a transcript?", components: [row], ...ephemeral });
            return;
          }

          if (commandName === "rename") {
            const newName = interaction.options.getString("name", true).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 90);
            await channel.setName(newName || `ticket-${randomTicketNumber()}`);
            await interaction.reply({ content: `✅ Ticket renamed to **${channel.name}**.`, ...ephemeral });
            return;
          }

          const subcommand = interaction.options.getSubcommand();
          if (commandName === "add" && subcommand === "user") {
            const target = interaction.options.getUser("member", true);
            await channel.permissionOverwrites.edit(target.id, {
              ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true
            });
            await interaction.reply({ content: `✅ Added ${target} to this ticket.`, ...ephemeral });
            return;
          }
          if (commandName === "add" && subcommand === "role") {
            const targetRole = interaction.options.getRole("role", true);
            await channel.permissionOverwrites.edit(targetRole.id, {
              ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true
            });
            await interaction.reply({ content: `✅ Added **${targetRole.name}** to this ticket.`, ...ephemeral });
            return;
          }
          if (commandName === "remove" && subcommand === "user") {
            const target = interaction.options.getUser("member", true);
            await channel.permissionOverwrites.delete(target.id);
            await interaction.reply({ content: `✅ Removed ${target} from this ticket.`, ...ephemeral });
            return;
          }
          if (commandName === "remove" && subcommand === "role") {
            const targetRole = interaction.options.getRole("role", true);
            await channel.permissionOverwrites.delete(targetRole.id);
            await interaction.reply({ content: `✅ Removed **${targetRole.name}** from this ticket.`, ...ephemeral });
            return;
          }
        }
      }

      // ==================================================
      // TICKET DROPDOWN
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "ticket_category"
      ) {
        const guild =
          interaction.guild;

        if (!guild) {
          return;
        }

        const selected =
          ticketCategories.find(
            (ticket) =>
              ticket.value ===
              interaction.values[0]
          );

        if (!selected) {
          await interaction.reply({
            content:
              "❌ That ticket category is invalid.",
            ephemeral: true,
          });

          return;
        }

        // ==================================================
        // CHECK EXISTING TICKET
        // ==================================================

        const existingTicket =
          guild.channels.cache.find(
            (channel) =>
              channel.type ===
                ChannelType.GuildText &&
              channel.topic ===
                `ticket-owner:${interaction.user.id}`
          );

        if (existingTicket) {
          await interaction.reply({
            content:
              `❌ You already have an open ticket: ${existingTicket}`,
            ephemeral: true,
          });

          return;
        }

        // ==================================================
        // STAFF ROLE
        // ==================================================

        const staffRole =
          findStaffRole(guild);

        // ==================================================
        // PERMISSIONS
        // ==================================================

        const permissionOverwrites = [
          {
            id:
              guild.roles.everyone.id,

            deny: [
              PermissionFlagsBits.ViewChannel,
            ],
          },

          {
            id:
              interaction.user.id,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },

          {
            id:
              guild.members.me.id,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ];

        // Staff
        if (staffRole) {
          permissionOverwrites.push({
            id:
              staffRole.id,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          });
        }

        // ==================================================
        // RANDOM TICKET NUMBER
        // ==================================================

        let ticketNumber;
        let ticketName;

        do {
          ticketNumber =
            randomTicketNumber();

          ticketName =
            `ticket-${ticketNumber}`;

        } while (
          guild.channels.cache.some(
            (channel) =>
              channel.name ===
              ticketName
          )
        );

        // ==================================================
        // CREATE TICKET
        // ==================================================

        const ticketChannel =
          await guild.channels.create({
            name:
              ticketName,

            type:
              ChannelType.GuildText,

            parent:
              selected.categoryId,

            topic:
              `ticket-owner:${interaction.user.id}`,

            permissionOverwrites,
          });

        // ==================================================
        // TICKET OPEN EMBED
        // ==================================================

        const ticketEmbed =
          new EmbedBuilder()
            .setColor(0x0066ff)
            .setDescription(
              "Please provide a detailed explanation of your issue along with any screenshots or video evidence.\n" +
              "If your issue is resolved before staff responds, you may close this ticket using the **Close** button below."
            )
            .setFooter({
              text:
                "Atlanta Heights Support • Ticket System",
            });

        // ==================================================
        // CLOSE BUTTON
        // ==================================================

        const closeButton =
          new ButtonBuilder()
            .setCustomId(
              "ticket_close"
            )
            .setLabel("Close")
            .setEmoji("🔒")
            .setStyle(
              ButtonStyle.Secondary
            );

        const closeRow =
          new ActionRowBuilder()
            .addComponents(
              closeButton
            );

        // ==================================================
        // SEND TICKET MESSAGE
        // ==================================================

        await ticketChannel.send({
          content:
            staffRole
              ? `${interaction.user} ${staffRole}`
              : `${interaction.user}`,

          embeds: [
            ticketEmbed,
          ],

          components: [
            closeRow,
          ],
        });

        // ==================================================
        // TICKET CREATED
        // ==================================================

        await interaction.reply({
          content:
            `✅ Your ticket has been created: ${ticketChannel}`,
          ephemeral: true,
        });

        return;
      }

      // ==================================================
      // CLOSE BUTTON
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close"
      ) {
        if (
          !isTicketChannel(
            interaction.channel
          )
        ) {
          await interaction.reply({
            content:
              "❌ This is not a ticket channel.",
            ephemeral: true,
          });

          return;
        }

        const confirmButton =
          new ButtonBuilder()
            .setCustomId(
              "ticket_close_confirm"
            )
            .setLabel("Yes")
            .setStyle(
              ButtonStyle.Danger
            );

        const cancelButton =
          new ButtonBuilder()
            .setCustomId(
              "ticket_close_cancel"
            )
            .setLabel("No")
            .setStyle(
              ButtonStyle.Secondary
            );

        const row =
          new ActionRowBuilder()
            .addComponents(
              confirmButton,
              cancelButton
            );

        await interaction.reply({
          content:
            "🔒 Are you sure you want to close this ticket?",
          components: [
            row,
          ],
        });

        return;
      }

      // ==================================================
      // CLOSE YES
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close_confirm"
      ) {
        if (
          !isTicketChannel(
            interaction.channel
          )
        ) {
          await interaction.reply({
            content:
              "❌ This is not a ticket channel.",
            ephemeral: true,
          });

          return;
        }

        const filePath =
          await createTranscript(
            interaction.channel,
            interaction.user.tag
          );

        await sendTranscriptToChannel(
          interaction.guild,
          filePath,
          interaction.channel.name,
          interaction.user.tag
        );

        await interaction.update({
          content:
            "🔒 Transcript saved and sent to the transcript channel. This ticket will close in 3 seconds.",
          components: [],
        });

        setTimeout(
          async () => {
            await interaction.channel
              .delete(
                "Ticket closed using the Close button"
              )
              .catch(() => {});
          },
          3000
        );

        return;
      }

      // ==================================================
      // DELETE TICKET CONFIRM
      if (interaction.isButton() && interaction.customId === "ticket_delete_confirm") {
        if (!isTicketChannel(interaction.channel)) {
          await interaction.reply({ content: "❌ This is not a ticket channel.", ephemeral: true });
          return;
        }
        if (!isStaff(interaction.member)) {
          await interaction.reply({ content: "❌ Only staff can delete tickets.", ephemeral: true });
          return;
        }
        await interaction.update({ content: "🗑️ Ticket will be deleted without a transcript.", components: [] });
        setTimeout(async () => {
          await interaction.channel.delete("Ticket deleted by staff using /delete").catch(() => {});
        }, 1500);
        return;
      }

      // CLOSE NO
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close_cancel"
      ) {
        await interaction.update({
          content:
            "✅ Ticket close cancelled.",
          components: [],
        });

        return;
      }

    } catch (error) {
      console.error(
        "Interaction handling error:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction
          .reply({
            content:
              "❌ Something went wrong. Check the bot console for the error.",
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  }
);

// ==================================================
// LOGIN
// ==================================================

client.login(token);