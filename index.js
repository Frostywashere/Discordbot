require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");

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

// STAFF ROLE
const staffRoleId =
  process.env.STAFF_ROLE_ID || "1543512745922531389";

const staffRoleName =
  process.env.STAFF_ROLE_NAME || "Staff";

// COMMANDS
const ticketPanelCommand = "$ticketpanel";
const purgeCommand = ".purge";

// TRANSCRIPT CHANNEL
const transcriptChannelId =
  "1545249215595413564";

// CUSTOM EMOJI
const ticketEmojiId =
  "1546224146919334040";

const ticketEmojiName =
  "profile";

// PUBLIC TRANSCRIPT WEBSITE
// Put your KataBump public URL in .env as:
// PUBLIC_URL=https://your-public-url
const publicUrl =
  (process.env.PUBLIC_URL || "").replace(/\/+$/, "");

// WEB PORT
const webPort =
  Number(process.env.PORT) || 3000;

// TRANSCRIPTS FOLDER
const transcriptsFolder =
  path.join(__dirname, "transcripts");

// ==================================================
// CHECK TOKEN
// ==================================================

if (
  !token ||
  token === "PASTE_YOUR_BOT_TOKEN_HERE"
) {
  console.error(
    "Missing DISCORD_TOKEN in .env"
  );

  process.exit(1);
}

// ==================================================
// CREATE TRANSCRIPTS FOLDER
// ==================================================

if (
  !fs.existsSync(transcriptsFolder)
) {
  fs.mkdirSync(
    transcriptsFolder,
    {
      recursive: true,
    }
  );
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

  partials: [
    Partials.Channel,
  ],
});

// ==================================================
// TICKET CATEGORIES
// ==================================================

const ticketCategories = [

  {
    label: "General Support",

    description:
      "Open a ticket in this category for General Support",

    value:
      "general_support",

    channelName:
      "ticket",

    categoryId:
      "1543512897953472552",
  },

  {
    label: "Player Report",

    description:
      "Open a ticket in this category to report a player for breaking server rules",

    value:
      "player_report",

    channelName:
      "ticket",

    categoryId:
      "1545229419101036566",
  },

  {
    label: "Donation Support",

    description:
      "Open a ticket in this category for Donation Support",

    value:
      "donation_ticket",

    channelName:
      "ticket",

    categoryId:
      "1543512854072926319",
  },

  {
    label: "Female Verification",

    description:
      "Open a ticket in this category to request verification for female roles and perks",

    value:
      "female_verification",

    channelName:
      "ticket",

    categoryId:
      "1545229787327369276",
  },

  {
    label: "Staff Reports",

    description:
      "Open a ticket in this category to report a staff member",

    value:
      "staff_reports",

    channelName:
      "ticket",

    categoryId:
      "1543512857935609927",
  },

  {
    label: "Ban Appeals",

    description:
      "Open a ticket in this category for a ban appeal or false ban",

    value:
      "ban_appeals",

    channelName:
      "ticket",

    categoryId:
      "1543512899597762580",
  },

  {
    label: "Contact a Developer",

    description:
      "Open a ticket to contact our development team about server issues",

    value:
      "contact_developer",

    channelName:
      "ticket",

    categoryId:
      "1543512901623480360",
  },

  {
    label: "Gang Support",

    description:
      "Open a ticket to get help with gang related issues",

    value:
      "gang_support",

    channelName:
      "ticket",

    // Uses your General Support category
    // until a separate Gang Support category
    // is provided.
    categoryId:
      "1543512897953472552",
  },

];

// ==================================================
// HELPER FUNCTIONS
// ==================================================

function findStaffRole(guild) {

  const roleById =
    guild.roles.cache.get(
      staffRoleId
    );

  if (roleById) {
    return roleById;
  }

  return guild.roles.cache.find(
    (role) =>
      role.name.toLowerCase() ===
      staffRoleName.toLowerCase()
  );
}

// ==================================================

function isStaff(member) {

  if (!member) {
    return false;
  }

  return Boolean(
    member.roles.cache.has(
      staffRoleId
    ) ||
    member.roles.cache.some(
      (role) =>
        role.name.toLowerCase() ===
        staffRoleName.toLowerCase()
    )
  );
}

// ==================================================

function isTicketChannel(channel) {

  return Boolean(
    channel &&
    channel.type ===
      ChannelType.GuildText &&
    typeof channel.topic ===
      "string" &&
    channel.topic.startsWith(
      "ticket-owner:"
    )
  );
}

// ==================================================

function safeFileName(name) {

  return name
    .replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    )
    .slice(0, 80);
}

// ==================================================

function escapeHtml(text) {

  return String(text)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    );
}

// ==================================================

function randomTicketNumber() {

  return Math.floor(
    1000 +
    Math.random() * 9000
  );
}

// ==================================================

function makeTranscriptId() {

  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .substring(2, 12)
  );
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

        ...(before
          ? { before }
          : {}),
      });

    if (!batch.size) {
      break;
    }

    messages.push(
      ...batch.values()
    );

    if (
      batch.size < 100
    ) {
      break;
    }

    before =
      batch.last().id;
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
  savedBy = "Unknown"
) {

  const messages =
    await fetchAllMessages(
      channel
    );

  const guild =
    channel.guild;

  const guildName =
    guild?.name ||
    "Discord Server";

  const guildIcon =
    guild?.iconURL({
      extension: "png",
      size: 128,
    }) || "";

  const ownerId =
    channel.topic
      ? channel.topic.replace(
          "ticket-owner:",
          ""
        )
      : "Unknown";

  const transcriptId =
    makeTranscriptId();

  const transcriptFileName =
    `transcript-${safeFileName(
      channel.name
    )}.html`;

  const transcriptPath =
    path.join(
      transcriptsFolder,
      `${transcriptId}.html`
    );

  // ==================================================
  // BUILD MESSAGE HTML
  // ==================================================

  const messageHtml =
    messages
      .map((message) => {

        const timestamp =
          new Date(
            message.createdTimestamp
          ).toLocaleString();

        const authorName =
          escapeHtml(
            message.author?.tag ||
            message.author?.username ||
            "Unknown"
          );

        const avatar =
          message.author?.displayAvatarURL({
            extension: "png",
            size: 64,
          }) || "";

        const content =
          escapeHtml(
            message.content || ""
          ).replace(
            /\n/g,
            "<br>"
          );

        // EMBEDS
        const embedsHtml =
          message.embeds
            .map((embed) => {

              const title =
                escapeHtml(
                  embed.title || ""
                );

              const description =
                escapeHtml(
                  embed.description || ""
                ).replace(
                  /\n/g,
                  "<br>"
                );

              return `
                <div class="discord-embed">

                  ${
                    title
                      ? `<div class="embed-title">${title}</div>`
                      : ""
                  }

                  ${
                    description
                      ? `<div class="embed-description">${description}</div>`
                      : ""
                  }

                </div>
              `;

            })
            .join("");

        // ATTACHMENTS
        const attachmentsHtml =
          Array.from(
            message.attachments.values()
          )
          .map((attachment) => {

            const url =
              escapeHtml(
                attachment.url
              );

            const name =
              escapeHtml(
                attachment.name ||
                attachment.url
              );

            const isImage =
              typeof attachment.contentType ===
                "string" &&
              attachment.contentType.startsWith(
                "image/"
              );

            return `
              <div class="attachment">

                ${
                  isImage
                    ? `
                      <img
                        class="attachment-image"
                        src="${url}"
                        alt="${name}"
                      >
                    `
                    : ""
                }

                <a
                  href="${url}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${name}
                </a>

              </div>
            `;

          })
          .join("");

        return `
          <div class="message">

            <img
              class="avatar"
              src="${escapeHtml(
                avatar
              )}"
              alt="avatar"
            >

            <div class="message-body">

              <div class="message-header">

                <strong>
                  ${authorName}
                </strong>

                <span>
                  ${escapeHtml(
                    timestamp
                  )}
                </span>

              </div>

              ${
                content
                  ? `
                    <div class="message-content">
                      ${content}
                    </div>
                  `
                  : ""
              }

              ${embedsHtml}

              ${attachmentsHtml}

            </div>

          </div>
        `;

      })
      .join("\n");

  // ==================================================
  // TRANSCRIPT HTML
  // ==================================================

  const html =
`<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
${escapeHtml(
  guildName
)} - ${escapeHtml(
  channel.name
)}
</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  background:
    #1e2028;

  color:
    #dbdee1;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

}

.topbar {

  padding:
    20px 28px;

  background:
    #17191f;

  border-bottom:
    1px solid #30323a;

}

.server {

  display:
    flex;

  align-items:
    center;

  gap:
    14px;

}

.server-icon {

  width:
    72px;

  height:
    72px;

  border-radius:
    14px;

  object-fit:
    cover;

  background:
    #30343b;

}

.server-name {

  font-size:
    22px;

  font-weight:
    700;

  color:
    #ffffff;

}

.ticket-name {

  font-size:
    19px;

  color:
    #ffffff;

  margin-top:
    3px;

}

.message-count {

  font-size:
    14px;

  color:
    #949ba4;

  margin-top:
    4px;

}

.container {

  max-width:
    1000px;

  margin:
    0 auto;

  padding:
    22px 18px 60px;

}

.info-card {

  background:
    #2b2d35;

  border-radius:
    8px;

  padding:
    18px;

  margin-bottom:
    18px;

  border-left:
    4px solid #0066ff;

}

.info-grid {

  display:
    grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap:
    12px;

}

.info-item {

  background:
    #22242b;

  padding:
    12px;

  border-radius:
    6px;

}

.info-label {

  font-size:
    12px;

  color:
    #949ba4;

  margin-bottom:
    4px;

}

.info-value {

  font-size:
    14px;

  color:
    #ffffff;

  word-break:
    break-word;

}

.message {

  display:
    flex;

  gap:
    13px;

  padding:
    13px 5px;

}

.avatar {

  width:
    42px;

  height:
    42px;

  border-radius:
    50%;

  object-fit:
    cover;

  background:
    #30343b;

  flex-shrink:
    0;

}

.message-body {

  min-width:
    0;

  flex:
    1;

}

.message-header {

  display:
    flex;

  align-items:
    baseline;

  gap:
    10px;

  margin-bottom:
    4px;

}

.message-header strong {

  color:
    #ffffff;

  font-size:
    15px;

}

.message-header span {

  color:
    #777e89;

  font-size:
    12px;

}

.message-content {

  font-size:
    15px;

  line-height:
    1.55;

  white-space:
    normal;

  word-break:
    break-word;

}

.discord-embed {

  margin-top:
    8px;

  padding:
    10px 12px;

  background:
    #25272e;

  border-left:
    4px solid #0066ff;

  border-radius:
    4px;

}

.embed-title {

  color:
    #ffffff;

  font-weight:
    700;

  margin-bottom:
    5px;

}

.embed-description {

  color:
    #dbdee1;

  line-height:
    1.5;

  word-break:
    break-word;

}

.attachment {

  margin-top:
    9px;

}

.attachment a {

  color:
    #5aa7ff;

  text-decoration:
    none;

}

.attachment a:hover {

  text-decoration:
    underline;

}

.attachment-image {

  display:
    block;

  max-width:
    500px;

  max-height:
    450px;

  border-radius:
    6px;

  margin-bottom:
    6px;

}

.footer {

  margin-top:
    25px;

  color:
    #6f7782;

  text-align:
    center;

  font-size:
    12px;

}

@media (
  max-width: 650px
) {

  .info-grid {

    grid-template-columns:
      1fr;

  }

  .server-icon {

    width:
      56px;

    height:
      56px;

  }

}

</style>

</head>

<body>

<div class="topbar">

  <div class="server">

    ${
      guildIcon
        ? `
          <img
            class="server-icon"
            src="${escapeHtml(
              guildIcon
            )}"
            alt="Server Icon"
          >
        `
        : ""
    }

    <div>

      <div class="server-name">
        ${escapeHtml(
          guildName
        )}
      </div>

      <div class="ticket-name">
        ${escapeHtml(
          channel.name
        )}
      </div>

      <div class="message-count">
        ${messages.length} message${
          messages.length === 1
            ? ""
            : "s"
        }
      </div>

    </div>

  </div>

</div>

<div class="container">

  <div class="info-card">

    <div class="info-grid">

      <div class="info-item">

        <div class="info-label">
          Ticket Owner
        </div>

        <div class="info-value">
          ${escapeHtml(
            ownerId
          )}
        </div>

      </div>

      <div class="info-item">

        <div class="info-label">
          Ticket Name
        </div>

        <div class="info-value">
          ${escapeHtml(
            channel.name
          )}
        </div>

      </div>

      <div class="info-item">

        <div class="info-label">
          Saved By
        </div>

        <div class="info-value">
          ${escapeHtml(
            savedBy
          )}
        </div>

      </div>

      <div class="info-item">

        <div class="info-label">
          Messages
        </div>

        <div class="info-value">
          ${messages.length}
        </div>

      </div>

    </div>

  </div>

  ${
    messageHtml ||
    `
      <div class="info-card">
        No messages found.
      </div>
    `
  }

  <div class="footer">
    Atlanta Heights Support • Ticket Transcript
  </div>

</div>

</body>

</html>`;

  fs.writeFileSync(
    transcriptPath,
    html,
    "utf8"
  );

  return {
    filePath:
      transcriptPath,

    transcriptId:
      transcriptId,

    fileName:
      transcriptFileName,

    ticketName:
      channel.name,

    messageCount:
      messages.length,
  };
}

// ==================================================
// SEND TRANSCRIPT TO TRANSCRIPT CHANNEL
// ==================================================

async function sendTranscriptToChannel(
  guild,
  transcript,
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

      return false;
    }

    // ==============================================
    // DIRECT LINK
    // ==============================================

    const transcriptUrl =
      publicUrl
        ? `${publicUrl}/transcript/${encodeURIComponent(
            transcript.transcriptId
          )}`
        : null;

    // ==============================================
    // INFO EMBED
    // ==============================================

    const infoEmbed =
      new EmbedBuilder()

        .setColor(
          0x66ff66
        )

        .setDescription(
          `**Ticket Owner**     **Ticket Name**     **Panel Name**\n` +
          `Ticket Owner        ${transcript.ticketName}        Atlanta Heights Support\n\n` +
          `**Direct Transcript**     **Users in transcript**\n` +
          `${transcript.messageCount} messages       Saved by: ${savedBy}`
        )

        .setFooter({
          text:
            "Atlanta Heights Support • Ticket System",
        });

    // ==============================================
    // DIRECT LINK BUTTON
    // ==============================================

    const components = [];

    if (transcriptUrl) {

      const directLinkButton =
        new ButtonBuilder()

          .setLabel(
            "Direct Link"
          )

          .setStyle(
            ButtonStyle.Link
          )

          .setURL(
            transcriptUrl
          )

          .setEmoji(
            "🔗"
          );

      const row =
        new ActionRowBuilder()
          .addComponents(
            directLinkButton
          );

      components.push(
        row
      );
    }

    // ==============================================
    // SEND FILE + EMBED + LINK
    // ==============================================

    await transcriptChannel.send({

      content:
        `📄 **${transcript.fileName}**`,

      embeds: [
        infoEmbed,
      ],

      files: [
        transcript.filePath,
      ],

      components:
        components,

    });

    console.log(
      `Transcript sent to #${transcriptChannel.name}`
    );

    return true;

  } catch (error) {

    console.error(
      "Failed to send transcript:",
      error
    );

    return false;
  }
}

// ==================================================
// PURGE
// ==================================================

async function purgeChannel(
  channel
) {

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

      deletedCount +=
        deleted.size;
    }

    for (
      const message of old.values()
    ) {

      await message
        .delete()
        .catch(
          () => {}
        );

      deletedCount++;
    }

    if (
      batch.size < 100
    ) {
      break;
    }
  }

  return deletedCount;
}

// ==================================================
// TICKET PANEL
// ==================================================

function createTicketPanel() {

  const embed =
    new EmbedBuilder()

      .setColor(
        0x0066ff
      )

      .setTitle(
        "<:profile:1546224146919334040> Atlanta Heights Support Tickets"
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

            label:
              ticket.label,

            description:
              ticket.description,

            value:
              ticket.value,

            emoji: {

              id:
                ticketEmojiId,

              name:
                ticketEmojiName,

            },

          })
        )

      );

  const row =
    new ActionRowBuilder()
      .addComponents(
        menu
      );

  return {
    embed,
    row,
  };
}

// ==================================================
// MESSAGE CREATE
// ==================================================

client.on(
  "messageCreate",
  async (message) => {

    if (
      message.author.bot
    ) {
      return;
    }

    if (
      !message.guild
    ) {
      return;
    }

    try {

      const content =
        message.content.trim();

      const lowerContent =
        content.toLowerCase();

      // ==================================================
      // .PURGE
      // ==================================================

      if (
        lowerContent ===
        purgeCommand
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
          return;
        }

        try {

          await message
            .delete()
            .catch(
              () => {}
            );

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

          setTimeout(
            () => {

              confirmation
                .delete()
                .catch(
                  () => {}
                );

            },
            4000
          );

        } catch (error) {

          console.error(
            "Purge error:",
            error
          );

          await message.channel
            .send(
              "❌ I couldn't clear this chat. Make sure the bot has **Manage Messages** permission."
            )
            .catch(
              () => {}
            );
        }

        return;
      }

      // ==================================================
      // $TICKETPANEL
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
        } =
          createTicketPanel();

        const banner =
          new AttachmentBuilder(
            "./assets/banner.png"
          );

        await message.channel.send({

          embeds: [
            embed,
          ],

          components: [
            row,
          ],

          files: [
            banner,
          ],

        });

        await message
          .delete()
          .catch(
            () => {}
          );

        return;
      }

      // ==================================================
      // TICKET COMMANDS
      // ==================================================

      const command =
        lowerContent.split(
          /\s+/
        )[0];

      if (
        [
          "$close",
          "$transcript",
          "$delete",
        ].includes(
          command
        )
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
        // $TRANSCRIPT
        // ==================================================

        if (
          command ===
          "$transcript"
        ) {

          const transcript =
            await createTranscript(
              message.channel,
              message.author.tag
            );

          await sendTranscriptToChannel(
            message.guild,
            transcript,
            message.author.tag
          );

          if (publicUrl) {

            const link =
              `${publicUrl}/transcript/${encodeURIComponent(
                transcript.transcriptId
              )}`;

            const button =
              new ButtonBuilder()
                .setLabel(
                  "Direct Link"
                )
                .setEmoji(
                  "🔗"
                )
                .setStyle(
                  ButtonStyle.Link
                )
                .setURL(
                  link
                );

            const row =
              new ActionRowBuilder()
                .addComponents(
                  button
                );

            await message.reply({

              content:
                "✅ Transcript saved and sent to the transcript channel.",

              components: [
                row,
              ],

            });

          } else {

            await message.reply(
              "✅ Transcript saved and sent to the transcript channel. Add PUBLIC_URL to .env to enable the Direct Link button."
            );
          }

          return;
        }

        // ==================================================
        // $CLOSE
        // ==================================================

        if (
          command ===
          "$close"
        ) {

          const transcript =
            await createTranscript(
              message.channel,
              message.author.tag
            );

          await sendTranscriptToChannel(
            message.guild,
            transcript,
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
                .catch(
                  () => {}
                );

            },
            3000
          );

          return;
        }

        // ==================================================
        // $DELETE
        // ==================================================

        if (
          command ===
          "$delete"
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
                .catch(
                  () => {}
                );

            },
            1500
          );

          return;
        }
      }

      // ==================================================
      // WL
      // ==================================================

      if (
        message.channelId !==
        channelId
      ) {
        return;
      }

      if (
        lowerContent !==
        "wl"
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

      // GIVE ALLOWLISTED
      await message.member.roles.add(
        role,
        "Member said WL in the allowlist channel."
      );

      // FIND NON WHITELISTED
      const removeRole =
        message.guild.roles.cache.find(
          (r) =>
            r.name.toLowerCase() ===
            removeRoleName.toLowerCase()
        );

      // REMOVE NON WHITELISTED
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

          .setColor(
            0x0066ff
          )

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

          embeds: [
            embed,
          ],

          files: [
            banner,
          ],

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

            ephemeral:
              true,

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

            ephemeral:
              true,

          });

          return;
        }

        // ==================================================
        // STAFF ROLE
        // ==================================================

        const staffRole =
          findStaffRole(
            guild
          );

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
        if (
          staffRole
        ) {

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
        // TICKET OPEN MESSAGE
        // ==================================================

        const ticketEmbed =
          new EmbedBuilder()

            .setColor(
              0x0066ff
            )

            .setDescription(
              "Please provide a detailed explanation of your issue along with any screenshots or video evidence.\n\n" +

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

            .setLabel(
              "Close"
            )

            .setEmoji(
              "🔒"
            )

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

          ephemeral:
            true,

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

            ephemeral:
              true,

          });

          return;
        }

        const yesButton =
          new ButtonBuilder()

            .setCustomId(
              "ticket_close_confirm"
            )

            .setLabel(
              "Yes"
            )

            .setStyle(
              ButtonStyle.Danger
            );

        const noButton =
          new ButtonBuilder()

            .setCustomId(
              "ticket_close_cancel"
            )

            .setLabel(
              "No"
            )

            .setStyle(
              ButtonStyle.Secondary
            );

        const confirmationRow =
          new ActionRowBuilder()
            .addComponents(
              yesButton,
              noButton
            );

        await interaction.reply({

          content:
            "🔒 Are you sure you want to close this ticket?",

          components: [
            confirmationRow,
          ],

        });

        return;
      }

      // ==================================================
      // CLOSE CONFIRM YES
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

            ephemeral:
              true,

          });

          return;
        }

        const transcript =
          await createTranscript(
            interaction.channel,
            interaction.user.tag
          );

        await sendTranscriptToChannel(
          interaction.guild,
          transcript,
          interaction.user.tag
        );

        await interaction.update({

          content:
            "🔒 Transcript saved. This ticket will close in 3 seconds.",

          components:
            [],

        });

        setTimeout(
          async () => {

            await interaction.channel
              .delete(
                "Ticket closed using Close button"
              )
              .catch(
                () => {}
              );

          },
          3000
        );

        return;
      }

      // ==================================================
      // CLOSE CANCEL
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close_cancel"
      ) {

        await interaction.update({

          content:
            "✅ Ticket close cancelled.",

          components:
            [],

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

            ephemeral:
              true,

          })

          .catch(
            () => {}
          );
      }
    }
  }
);

// ==================================================
// TRANSCRIPT WEBPAGE SERVER
// ==================================================

const webServer =
  http.createServer(
    (req, res) => {

      try {

        const url =
          new URL(
            req.url,
            `http://localhost:${webPort}`
          );

        // ==============================================
        // HOME PAGE
        // ==============================================

        if (
          url.pathname ===
          "/"
        ) {

          res.writeHead(
            200,
            {
              "Content-Type":
                "text/html; charset=utf-8",
            }
          );

          res.end(
            `
              <!DOCTYPE html>
              <html>
              <head>
                <title>
                  Atlanta Heights Transcripts
                </title>
              </head>

              <body
                style="
                  margin:0;
                  background:#1e2028;
                  color:white;
                  font-family:Arial;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  height:100vh;
                "
              >

                <div
                  style="
                    text-align:center;
                  "
                >

                  <h1>
                    Atlanta Heights
                  </h1>

                  <p>
                    Transcript server online.
                  </p>

                </div>

              </body>
              </html>
            `
          );

          return;
        }

        // ==============================================
        // TRANSCRIPT PAGE
        // ==============================================

        if (
          url.pathname.startsWith(
            "/transcript/"
          )
        ) {

          const transcriptId =
            decodeURIComponent(
              url.pathname.substring(
                "/transcript/".length
              )
            );

          // Only allow safe transcript IDs
          if (
            !/^[a-zA-Z0-9-]+$/.test(
              transcriptId
            )
          ) {

            res.writeHead(
              400,
              {
                "Content-Type":
                  "text/plain; charset=utf-8",
              }
            );

            res.end(
              "Invalid transcript."
            );

            return;
          }

          const filePath =
            path.join(
              transcriptsFolder,
              `${transcriptId}.html`
            );

          if (
            !fs.existsSync(
              filePath
            )
          ) {

            res.writeHead(
              404,
              {
                "Content-Type":
                  "text/html; charset=utf-8",
              }
            );

            res.end(
              `
                <!DOCTYPE html>
                <html>
                <body
                  style="
                    background:#1e2028;
                    color:white;
                    font-family:Arial;
                    padding:40px;
                  "
                >

                  <h1>
                    Transcript not found
                  </h1>

                  <p>
                    This transcript may have been removed.
                  </p>

                </body>
                </html>
              `
            );

            return;
          }

          const html =
            fs.readFileSync(
              filePath,
              "utf8"
            );

          res.writeHead(
            200,
            {
              "Content-Type":
                "text/html; charset=utf-8",
              "Cache-Control":
                "no-cache",
            }
          );

          res.end(
            html
          );

          return;
        }

        // ==============================================
        // 404
        // ==============================================

        res.writeHead(
          404,
          {
            "Content-Type":
              "text/plain; charset=utf-8",
          }
        );

        res.end(
          "Not found."
        );

      } catch (error) {

        console.error(
          "Web server error:",
          error
        );

        res.writeHead(
          500,
          {
            "Content-Type":
              "text/plain; charset=utf-8",
          }
        );

        res.end(
          "Internal server error."
        );
      }
    }
  );

webServer.listen(
  webPort,
  "0.0.0.0",
  () => {

    console.log(
      `Transcript website running on port ${webPort}`
    );

    if (publicUrl) {

      console.log(
        `Transcript public URL: ${publicUrl}`
      );

    } else {

      console.log(
        "PUBLIC_URL is not set. Direct Link buttons will not work until you add it to .env."
      );
    }
  }
);

// ==================================================
// LOGIN
// ==================================================

client.login(
  token
);
