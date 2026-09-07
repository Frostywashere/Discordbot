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
} = require("discord.js");

// ==================================================
// SETTINGS
// ==================================================

const token = process.env.DISCORD_TOKEN;

// WL SETTINGS
const channelId =
  process.env.CHANNEL_ID || "1544875173361221632";

const roleName =
  process.env.ROLE_NAME || "Allowlisted";

const removeRoleName =
  process.env.REMOVE_ROLE_NAME || "Non Whitelisted";

// TICKET SETTINGS
const staffRoleId =
  process.env.STAFF_ROLE_ID || "1543512745922531389";

const staffRoleName =
  process.env.STAFF_ROLE_NAME || "Staff";

const ticketPanelCommand = "$ticketpanel";
const purgeCommand = ".purge";

// CUSTOM EMOJI
const ticketEmojiId = "1546224146919334040";
const ticketEmojiName = "profile";

// TRANSCRIPTS FOLDER
const transcriptsFolder = path.join(
  __dirname,
  "transcripts"
);

// ==================================================
// CHECK TOKEN
// ==================================================

if (!token || token === "PASTE_YOUR_BOT_TOKEN_HERE") {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

// Create transcripts folder automatically
if (!fs.existsSync(transcriptsFolder)) {
  fs.mkdirSync(transcriptsFolder, {
    recursive: true,
  });
}

// ==================================================
// CREATE BOT
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
    description: "Need help with anything server related",
    value: "general_support",
    channelName: "general-support",
    categoryId: "1543512897953472552",
  },

  {
    label: "Player Report",
    description: "Report a player for breaking server rules",
    value: "player_report",
    channelName: "player-report",
    categoryId: "1545229419101036566",
  },

  {
    label: "Donation Ticket",
    description: "Questions about donations or purchases",
    value: "donation_ticket",
    channelName: "donation-ticket",
    categoryId: "1543512854072926319",
  },

  {
    label: "Female Verification",
    description: "Request verification for female roles and perks",
    value: "female_verification",
    channelName: "female-verification",
    categoryId: "1545229787327369276",
  },

  {
    label: "Staff Reports",
    description: "Report a staff member's conduct",
    value: "staff_reports",
    channelName: "staff-reports",
    categoryId: "1543512857935609927",
  },

  {
    label: "Ban Appeals",
    description: "Appeal a server ban or punishment",
    value: "ban_appeals",
    channelName: "ban-appeals",
    categoryId: "1543512899597762580",
  },

  {
    label: "Contact a Developer",
    description: "Contact our development team about server issues",
    value: "contact_developer",
    channelName: "contact-developer",
    categoryId: "1543512901623480360",
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
  return Boolean(
    member &&
      (
        member.roles.cache.has(staffRoleId) ||
        member.roles.cache.some(
          (role) =>
            role.name.toLowerCase() ===
            staffRoleName.toLowerCase()
        )
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
    .replace(/\"/g, "&quot;");
}

// ==================================================
// FETCH ALL MESSAGES
// ==================================================

async function fetchAllMessages(channel) {
  const messages = [];
  let before;

  while (true) {
    const batch =
      await channel.messages.fetch({
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

    for (
      const message of old.values()
    ) {

      await message
        .delete()
        .catch(() => {});

      deletedCount += 1;
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
      "🎟️ Atlanta Heights Support Tickets"
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

            emoji: {
              id: ticketEmojiId,
              name: ticketEmojiName,
            },
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
// BOT READY
// ==================================================

client.once("ready", () => {

  console.log(
    `Logged in as ${client.user.tag}`
  );

  console.log(
    `WL channel: ${channelId}`
  );

  console.log(
    `WL trigger: WL`
  );

  console.log(
    `Allowlisted role: ${roleName}`
  );

  console.log(
    `Staff role ID: ${staffRoleId}`
  );

  console.log(
    `Ticket panel command: ${ticketPanelCommand}`
  );

  console.log(
    `Staff purge command: ${purgeCommand}`
  );

  console.log(
    `Transcript folder: ${transcriptsFolder}`
  );
});

// ==================================================
// MESSAGE CREATE
// ==================================================

client.on(
  "messageCreate",
  async (message) => {

    if (message.author.bot) {
      return;
    }

    if (!message.guild) {
      return;
    }

    try {

      const content =
        message.content.trim();

      const lowerContent =
        content.toLowerCase();

      // ==================================================
      // STAFF-ONLY PURGE
      // Works in any text channel
      // ==================================================

      if (
        lowerContent === purgeCommand
      ) {

        if (
          !isStaff(
            message.member
          )
        ) {

          await message.reply(
            "❌ Only staff can use `.purge`."
          );

          return;
        }

        if (
          message.channel.type !==
          ChannelType.GuildText
        ) {

          await message.reply(
            "❌ `.purge` can only be used in a text channel."
          );

          return;
        }

        try {

          await message
            .delete()
            .catch(() => {});

          const deletedCount =
            await purgeChannel(
              message.channel
            );

          const confirmation =
            await message.channel.send(
              `🧹 Chat cleared. Deleted **${deletedCount}** message${
                deletedCount === 1
                  ? ""
                  : "s"
              }.`
            );

          setTimeout(() => {

            confirmation
              .delete()
              .catch(() => {});

          }, 4000);

        } catch (error) {

          console.error(
            "Purge error:",
            error
          );

          await message.channel
            .send(
              "❌ I couldn't clear this chat. Make sure the bot has **Manage Messages** permission."
            )
            .catch(() => {});
        }

        return;
      }

      // ==================================================
      // TICKET PANEL
      // ==================================================

      if (
        lowerContent ===
        ticketPanelCommand.toLowerCase()
      ) {

        if (
          !message.member.permissions.has(
            PermissionFlagsBits.ManageGuild
          )
        ) {

          await message.reply(
            "❌ You don't have permission to use this command."
          );

          return;
        }

        const {
          embed,
          row,
        } = createTicketPanel();

        const banner =
          new AttachmentBuilder(
            "./assets/banner.png"
          );

        await message.channel.send({
          embeds: [embed],
          components: [row],
          files: [banner],
        });

        await message
          .delete()
          .catch(() => {});

        return;
      }

      // ==================================================
      // TICKET COMMANDS
      // ==================================================

      const command =
        lowerContent.split(/\s+/)[0];

      if (
        [
          "$close",
          "$transcript",
          "$delete",
        ].includes(command)
      ) {

        if (
          !isTicketChannel(
            message.channel
          )
        ) {

          await message.reply(
            "❌ This command can only be used inside a ticket."
          );

          return;
        }

        if (
          !isStaff(
            message.member
          )
        ) {

          await message.reply(
            "❌ Only staff can use this ticket command."
          );

          return;
        }

        // ==================================================
        // $transcript
        // ==================================================

        if (
          command === "$transcript"
        ) {

          const filePath =
            await createTranscript(
              message.channel,
              message.author.tag
            );

          await message.reply({
            content:
              "✅ Transcript saved.",
            files: [filePath],
          });

          return;
        }

        // ==================================================
        // $close
        // ==================================================

        if (
          command === "$close"
        ) {

          await createTranscript(
            message.channel,
            message.author.tag
          );

          await message.reply(
            "🔒 Transcript saved. This ticket will close in 3 seconds."
          );

          setTimeout(
            async () => {

              await message.channel
                .delete(
                  "Ticket closed by staff using $close"
                )
                .catch(() => {});

            },
            3000
          );

          return;
        }

        // ==================================================
        // $delete
        // ==================================================

        if (
          command === "$delete"
        ) {

          await message.reply(
            "🗑️ This ticket will be deleted without saving a transcript."
          );

          setTimeout(
            async () => {

              await message.channel
                .delete(
                  "Ticket deleted by staff using $delete"
                )
                .catch(() => {});

            },
            1500
          );

          return;
        }
      }

      // ==================================================
      // WL SYSTEM
      // ==================================================

      if (
        message.channelId !==
        channelId
      ) {
        return;
      }

      if (
        lowerContent !== "wl"
      ) {
        return;
      }

      const role =
        message.guild.roles.cache.find(
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

      // Give Allowlisted
      await message.member.roles.add(
        role,
        "Member said WL in the allowlist channel."
      );

      // Find Non Whitelisted
      const removeRole =
        message.guild.roles.cache.find(
          (r) =>
            r.name.toLowerCase() ===
            removeRoleName.toLowerCase()
        );

      // Remove Non Whitelisted
      if (
        removeRole &&
        removeRole.id !== role.id &&
        message.member.roles.cache.has(
          removeRole.id
        )
      ) {

        await message.member.roles.remove(
          removeRole,
          "Member was given the Allowlisted role."
        );
      }

      // ==================================================
      // WL DM
      // ==================================================

      const banner =
        new AttachmentBuilder(
          "./assets/banner.png"
        );

      const embed =
        new EmbedBuilder()

          .setColor(0x0066ff)

          .setTitle(
            "You are now Allowlisted!"
          )

          .setDescription(
            "Welcome to The Atlanta Heights. To ensure you love the city please " +
            "go to see the news on what's happening or go check out the tebex!\n\n" +

            "**Or you can go ahead and fly right in the city!**\n\n" +

            "If you are found cheating or abusing anything **YOU WILL BE BANNED**"
          )

          .setImage(
            "attachment://banner.png"
          );

      try {

        await message.author.send({
          embeds: [embed],
          files: [banner],
        });

        console.log(
          `Successfully DM'd ${message.author.tag}`
        );

      } catch (error) {

        console.log(
          `Could not DM ${message.author.tag}.`
        );
      }

      await message.reply(
        `✅ ${message.author}, you've been **Allowlisted**! Check your DMs.`
      );

    } catch (error) {

      console.error(
        "Message handling error:",
        error
      );
    }
  }
);

// ==================================================
// INTERACTIONS
// ==================================================

client.on(
  "interactionCreate",
  async (interaction) => {

    try {

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
        // EXISTING TICKET CHECK
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

        // STAFF ACCESS
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
        // CREATE TICKET
        // ==================================================

        const ticketChannel =
          await guild.channels.create({

            name:
              `${selected.channelName}-${interaction.user.username}`
                .toLowerCase()
                .replace(
                  /[^a-z0-9-]/g,
                  "-"
                )
                .slice(0, 95),

            type:
              ChannelType.GuildText,

            parent:
              selected.categoryId,

            topic:
              `ticket-owner:${interaction.user.id}`,

            permissionOverwrites,

          });

        // ==================================================
        // TICKET OPEN MESSAGE
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
        // CREATED MESSAGE
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

        await createTranscript(
          interaction.channel,
          interaction.user.tag
        );

        await interaction.update({

          content:
            "🔒 Transcript saved. This ticket will close in 3 seconds.",

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
