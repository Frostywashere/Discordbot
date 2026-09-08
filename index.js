require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

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

// ==================================================
// WL SETTINGS
// ==================================================

const channelId =
  process.env.CHANNEL_ID || "1544875173361221632";

const roleName =
  process.env.ROLE_NAME || "Allowlisted";

const removeRoleName =
  process.env.REMOVE_ROLE_NAME || "Non Whitelisted";

// ==================================================
// STAFF SETTINGS
// ==================================================

const staffRoleId =
  process.env.STAFF_ROLE_ID || "1543512745922531389";

const staffRoleName =
  process.env.STAFF_ROLE_NAME || "Staff";

// ==================================================
// OWNER SETTINGS
// ==================================================

const ownerId =
  process.env.OWNER_ID || "";

// ==================================================
// TRANSCRIPT SETTINGS
// ==================================================

const transcriptChannelId =
  "1545249215595413564";

const publicUrl = (
  process.env.PUBLIC_URL || ""
)
  .replace(/^PUBLIC_URL=/i, "")
  .replace(/\/+$/, "");

// ==================================================
// COMMANDS
// ==================================================

const ticketPanelCommand =
  "$ticketpanel";

const purgeCommand =
  ".purge";

const remindCommand =
  "$remind";

// ==================================================
// CUSTOM EMOJI
// ==================================================

const ticketEmojiId =
  "1546224146919334040";

const ticketEmojiName =
  "profile";

// ==================================================
// FILE PATHS
// ==================================================

const transcriptsFolder =
  path.join(
    __dirname,
    "transcripts"
  );

const assetsFolder =
  path.join(
    __dirname,
    "assets"
  );

const bannerPath =
  path.join(
    assetsFolder,
    "banner.png"
  );

// ==================================================
// CHECK TOKEN
// ==================================================

if (
  !token ||
  token ===
    "PASTE_YOUR_BOT_TOKEN_HERE"
) {
  console.error(
    "Missing DISCORD_TOKEN in Railway Variables."
  );

  process.exit(1);
}

// ==================================================
// CREATE FOLDERS
// ==================================================

if (
  !fs.existsSync(
    transcriptsFolder
  )
) {
  fs.mkdirSync(
    transcriptsFolder,
    {
      recursive: true,
    }
  );
}

// ==================================================
// CREATE CLIENT
// ==================================================

const client =
  new Client({
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
    label:
      "General Support",

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
    label:
      "Player Report",

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
    label:
      "Donation Support",

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
    label:
      "Female Verification",

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
    label:
      "Staff Reports",

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
    label:
      "Ban Appeals",

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
    label:
      "Contact a Developer",

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
    label:
      "Gang Support",

    description:
      "Open a ticket to get help with gang related issues",

    value:
      "gang_support",

    channelName:
      "ticket",

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

function isOwner(member) {
  if (!member) {
    return false;
  }

  if (!ownerId) {
    return member.permissions.has(
      PermissionFlagsBits.ManageGuild
    );
  }

  return member.id === ownerId;
}

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

function safeFileName(name) {
  return name
    .replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    )
    .slice(0, 80);
}

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

function randomTicketNumber() {
  return Math.floor(
    1000 +
      Math.random() *
        9000
  );
}

function getTicketInfo(channel) {
  const topic =
    channel?.topic || "";

  const ownerMatch =
    topic.match(
      /ticket-owner:(\d+)/
    );

  const typeMatch =
    topic.match(
      /ticket-type:([^|]+)/
    );

  return {
    ownerId:
      ownerMatch
        ? ownerMatch[1]
        : "Unknown",

    ticketType:
      typeMatch
        ? typeMatch[1]
        : "Unknown",
  };
}

// ==================================================
// FETCH ALL MESSAGES
// ==================================================

async function fetchAllMessages(
  channel
) {
  const messages = [];

  let before;

  while (true) {
    const batch =
      await channel.messages.fetch({
        limit: 100,

        ...(before
          ? {
              before,
            }
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
  closedBy = "Unknown"
) {
  const messages =
    await fetchAllMessages(
      channel
    );

  const guildName =
    channel.guild?.name ||
    "Discord Server";

  const {
    ownerId,
    ticketType,
  } =
    getTicketInfo(
      channel
    );

  let ownerTag =
    ownerId;

  if (
    ownerId !==
    "Unknown"
  ) {
    const ownerMember =
      await channel.guild.members
        .fetch(ownerId)
        .catch(() => null);

    if (ownerMember) {
      ownerTag =
        ownerMember.user.tag;
    }
  }

  const transcriptId =
    crypto.randomUUID();

  // ==================================================
  // TXT TRANSCRIPT
  // ==================================================

  const txtContent =
    messages
      .map(
        (message) => {
          const timestamp =
            new Date(
              message.createdTimestamp
            ).toLocaleString();

          const author =
            message.author?.tag ||
            message.author?.username ||
            "Unknown";

          let content =
            message.content ||
            "[No text content]";

          if (
            message.attachments &&
            message.attachments.size
          ) {
            content +=
              "\nAttachments:\n" +
              Array.from(
                message.attachments.values()
              )
                .map(
                  (attachment) =>
                    `${
                      attachment.name ||
                      "Attachment"
                    }\n${
                      attachment.url
                    }`
                )
                .join("\n");
          }

          return (
            `[${timestamp}] ${author}\n` +
            `${content}\n`
          );
        }
      )
      .join(
        "\n----------------------------------------\n\n"
      );

  const txtFileName =
    `${safeFileName(
      channel.name
    )}-${transcriptId}.txt`;

  const htmlFileName =
    `${transcriptId}.html`;

  const txtPath =
    path.join(
      transcriptsFolder,
      txtFileName
    );

  const htmlPath =
    path.join(
      transcriptsFolder,
      htmlFileName
    );

  fs.writeFileSync(
    txtPath,
    txtContent,
    "utf8"
  );

  // ==================================================
  // HTML MESSAGE HISTORY
  // ==================================================

  const messageHtml =
    messages
      .map(
        (message) => {
          const timestamp =
            new Date(
              message.createdTimestamp
            ).toLocaleString();

          const author =
            escapeHtml(
              message.author?.tag ||
                message.author?.username ||
                "Unknown"
            );

          const avatar =
            message.author?.displayAvatarURL({
              extension:
                "png",
              size: 64,
            }) || "";

          const content =
            escapeHtml(
              message.content ||
                ""
            ).replace(
              /\n/g,
              "<br>"
            );

          const attachments =
            Array.from(
              message.attachments.values()
            )
              .map(
                (attachment) =>
                  `<div class="attachment">
                    <a href="${escapeHtml(
                      attachment.url
                    )}" target="_blank">
                      ${escapeHtml(
                        attachment.name ||
                          attachment.url
                      )}
                    </a>
                  </div>`
              )
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
                    ${author}
                  </strong>

                  <span>
                    ${escapeHtml(
                      timestamp
                    )}
                  </span>
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
        }
      )
      .join("\n");

  const now =
    new Date();

  // ==================================================
  // HTML PAGE
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
Atlanta Heights - ${escapeHtml(
  channel.name
)}
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 24px;
  background: #111318;
  color: #e7e9ee;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  background: #191c24;
  border: 1px solid #2b2f3a;
  border-left: 4px solid #0066ff;
  border-radius: 12px;
  padding: 22px;
  margin-bottom: 16px;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
}

.subtitle {
  color: #9ca3af;
  margin-bottom: 20px;
}

.info {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fit,
      minmax(210px, 1fr)
    );
  gap: 10px;
}

.info-box {
  background: #12151b;
  border: 1px solid #2b2f3a;
  border-radius: 8px;
  padding: 12px;
}

.info-title {
  font-size: 11px;
  color: #8c94a3;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.info-value {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.message {
  display: flex;
  gap: 12px;
  background: #181b22;
  border-bottom: 1px solid #272b35;
  padding: 15px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #2a2e38;
  flex-shrink: 0;
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 6px;
}

.message-header strong {
  color: #ffffff;
}

.message-header span {
  color: #7f8795;
  font-size: 12px;
}

.content {
  line-height: 1.55;
  word-break: break-word;
}

.attachment {
  margin-top: 8px;
}

.attachment a {
  color: #66aaff;
}

.footer {
  text-align: center;
  color: #737b89;
  margin-top: 20px;
  font-size: 12px;
}

</style>

</head>

<body>

<div class="container">

  <div class="header">

    <div class="logo">
      Atlanta Heights Ticket Transcript
    </div>

    <div class="subtitle">
      ${escapeHtml(
        channel.name
      )}
    </div>

    <div class="info">

      <div class="info-box">
        <div class="info-title">
          Ticket
        </div>

        <div class="info-value">
          #${escapeHtml(
            channel.name
          )}
        </div>
      </div>

      <div class="info-box">
        <div class="info-title">
          Ticket Type
        </div>

        <div class="info-value">
          ${escapeHtml(
            ticketType
          )}
        </div>
      </div>

      <div class="info-box">
        <div class="info-title">
          Ticket Owner
        </div>

        <div class="info-value">
          ${escapeHtml(
            ownerTag
          )}
        </div>
      </div>

      <div class="info-box">
        <div class="info-title">
          Messages
        </div>

        <div class="info-value">
          ${messages.length}
        </div>
      </div>

      <div class="info-box">
        <div class="info-title">
          Saved By
        </div>

        <div class="info-value">
          ${escapeHtml(
            closedBy
          )}
        </div>
      </div>

      <div class="info-box">
        <div class="info-title">
          Saved
        </div>

        <div class="info-value">
          ${escapeHtml(
            now.toLocaleString()
          )}
        </div>
      </div>

    </div>

  </div>

  ${
    messageHtml ||
    `
      <div class="header">
        No messages found.
      </div>
    `
  }

  <div class="footer">
    Atlanta Heights RP • Support
  </div>

</div>

</body>

</html>`;

  fs.writeFileSync(
    htmlPath,
    html,
    "utf8"
  );

  return {
    id:
      transcriptId,

    txtPath,

    htmlPath,

    ownerId,

    ownerTag,

    ticketType,

    guildName,

    closedBy,
  };
}

// ==================================================
// SEND TRANSCRIPT TO TRANSCRIPT CHANNEL
// ==================================================

async function sendTranscript(
  guild,
  transcriptData
) {
  const transcriptChannel =
    guild.channels.cache.get(
      transcriptChannelId
    );

  if (
    !transcriptChannel
  ) {
    throw new Error(
      "Transcript channel not found."
    );
  }

  let directLink =
    "Unavailable";

  if (publicUrl) {
    directLink =
      `${publicUrl}/transcript/${transcriptData.id}`;
  }

  const transcriptEmbed =
    new EmbedBuilder()
      .setColor(0x0066ff)
      .setTitle(
        "Ticket Transcript"
      )
      .addFields(
        {
          name:
            "Ticket",

          value:
            `#${transcriptData
              .channelName ||
              "ticket"}`,

          inline: true,
        },

        {
          name:
            "Ticket Type",

          value:
            transcriptData
              .ticketType ||
            "Unknown",

          inline: true,
        },

        {
          name:
            "Ticket Owner",

          value:
            transcriptData
              .ownerTag ||
            "Unknown",

          inline: true,
        }
      )
      .setFooter({
        text:
          "Atlanta Heights RP • Support",
      })
      .setTimestamp();

  const row =
    new ActionRowBuilder();

  if (publicUrl) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(
          "Direct Link"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          directLink
        )
        .setEmoji("↗")
    );
  }

  await transcriptChannel.send({
    embeds: [
      transcriptEmbed,
    ],

    components:
      publicUrl
        ? [row]
        : [],

    files: [
      transcriptData.txtPath,
    ],
  });

  return directLink;
}

// ==================================================
// PATCH TRANSCRIPT DATA
// ==================================================

// Adds the channel name before sending the embed.
function addTranscriptChannelName(
  transcriptData,
  channel
) {
  return {
    ...transcriptData,

    channelName:
      channel.name,
  };
}

// ==================================================
// PURGE CHANNEL
// ==================================================

async function purgeChannel(
  channel
) {
  let deletedCount =
    0;

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
      const message
      of old.values()
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
// CREATE TICKET PANEL
// ==================================================

function createTicketPanel() {
  const embed =
    new EmbedBuilder()
      .setColor(0x0066ff)

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
// WEB SERVER FOR TRANSCRIPTS
// ==================================================

const port =
  process.env.PORT || 3000;

const server =
  http.createServer(
    (req, res) => {
      try {
        const requestUrl =
          new URL(
            req.url,
            `http://localhost:${port}`
          );

        if (
          requestUrl.pathname.startsWith(
            "/transcript/"
          )
        ) {
          const transcriptId =
            requestUrl.pathname
              .split("/")
              .filter(Boolean)
              .pop();

          if (
            !transcriptId ||
            !/^[a-f0-9-]+$/i.test(
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
                  "text/plain; charset=utf-8",
              }
            );

            res.end(
              "Transcript not found."
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
            }
          );

          res.end(
            html
          );

          return;
        }

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/plain; charset=utf-8",
          }
        );

        res.end(
          "Atlanta Heights transcript server is online."
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

server.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `Transcript web server listening on port ${port}`
    );

    if (publicUrl) {
      console.log(
        `Public transcript URL: ${publicUrl}`
      );
    } else {
      console.log(
        "PUBLIC_URL is not configured."
      );
    }
  }
);

// ==================================================
// BOT READY
// ==================================================

client.once(
  "ready",
  () => {
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
      `Remove role: ${removeRoleName}`
    );

    console.log(
      `Staff role ID: ${staffRoleId}`
    );

    console.log(
      `Ticket panel command: ${ticketPanelCommand}`
    );

    console.log(
      `Reminder command: ${remindCommand}`
    );

    console.log(
      `Purge command: ${purgeCommand}`
    );

    console.log(
      `Transcript channel: ${transcriptChannelId}`
    );
  }
);

// ==================================================
// MESSAGE CREATE
// ==================================================

client.on(
  "messageCreate",
  async (message) => {

    // Ignore bots
    if (
      message.author.bot
    ) {
      return;
    }

    // Ignore DMs
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
          !isOwner(
            message.member
          )
        ) {
          await message.reply(
            "❌ Only the bot owner can use `$ticketpanel`."
          );

          return;
        }

        if (
          !fs.existsSync(
            bannerPath
          )
        ) {
          await message.reply(
            "❌ `assets/banner.png` was not found."
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
            bannerPath
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
        lowerContent
          .split(/\s+/)[0];

      if (
        [
          "$close",
          "$transcript",
          "$delete",
          "$remind",
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
          const transcriptData =
            await createTranscript(
              message.channel,
              message.author.tag
            );

          const completeData =
            addTranscriptChannelName(
              transcriptData,
              message.channel
            );

          await sendTranscript(
            message.guild,
            completeData
          );

          await message.reply(
            "✅ Transcript sent."
          );

          return;
        }

        // ==================================================
        // $REMIND
        // ==================================================

        if (
          command ===
          "$remind"
        ) {

          const {
            ownerId: ticketOwnerId,
          } =
            getTicketInfo(
              message.channel
            );

          if (
            !ticketOwnerId ||
            ticketOwnerId ===
              "Unknown"
          ) {
            await message.reply(
              "❌ I couldn't find the owner of this ticket."
            );

            return;
          }

          const ticketOwner =
            await message.guild.members
              .fetch(
                ticketOwnerId
              )
              .catch(
                () => null
              );

          if (!ticketOwner) {
            await message.reply(
              "❌ I couldn't find the ticket owner."
            );

            return;
          }

          if (
            !fs.existsSync(
              bannerPath
            )
          ) {
            await message.reply(
              "❌ `assets/banner.png` was not found."
            );

            return;
          }

          const ticketUrl =
            `https://discord.com/channels/${message.guild.id}/${message.channel.id}`;

          const reminderEmbed =
            new EmbedBuilder()
              .setColor(
                0x0066ff
              )

              .setTitle(
                "Ticket Reminder"
              )

              .setDescription(
                `Hey ${ticketOwner}, you have been reminded about your ticket.\n\n` +

                `**Ticket Information**\n` +

                `Please click the button below to hop into your ticket.`
              )

              .setImage(
                "attachment://banner.png"
              )

              .setFooter({
                text:
                  "Atlanta Heights RP • Support",
              });

          const hopButton =
            new ButtonBuilder()
              .setLabel(
                "Hop Into Ticket"
              )

              .setStyle(
                ButtonStyle.Link
              )

              .setURL(
                ticketUrl
              )

              .setEmoji(
                "↗"
              );

          const row =
            new ActionRowBuilder()
              .addComponents(
                hopButton
              );

          const banner =
            new AttachmentBuilder(
              bannerPath
            );

          try {
            await ticketOwner.send({
              embeds: [
                reminderEmbed,
              ],

              components: [
                row,
              ],

              files: [
                banner,
              ],
            });

            await message.reply(
              `✅ Ticket reminder sent to ${ticketOwner}.`
            );

          } catch (error) {
            console.error(
              "Ticket reminder error:",
              error
            );

            await message.reply(
              "❌ I couldn't DM the ticket owner. Their DMs may be closed."
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

          const transcriptData =
            await createTranscript(
              message.channel,
              message.author.tag
            );

          const completeData =
            addTranscriptChannelName(
              transcriptData,
              message.channel
            );

          await sendTranscript(
            message.guild,
            completeData
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
      // WL SYSTEM
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

      // ==================================================
      // FIND ALLOWLISTED ROLE
      // ==================================================

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

      // ==================================================
      // GIVE ALLOWLISTED
      // ==================================================

      await message.member.roles.add(
        role,
        "Member said WL in the allowlist channel."
      );

      // ==================================================
      // FIND NON WHITELISTED
      // ==================================================

      const removeRole =
        message.guild.roles.cache.find(
          (r) =>
            r.name.toLowerCase() ===
            removeRoleName.toLowerCase()
        );

      // ==================================================
      // REMOVE NON WHITELISTED
      // ==================================================

      if (
        removeRole &&
        removeRole.id !==
          role.id &&
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

      if (
        fs.existsSync(
          bannerPath
        )
      ) {
        const banner =
          new AttachmentBuilder(
            bannerPath
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
      }

      // ==================================================
      // IMPORTANT:
      // NO PUBLIC REPLY TO WL
      // ==================================================

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
        // CHECK EXISTING TICKET
        // ==================================================

        const existingTicket =
          guild.channels.cache.find(
            (channel) =>
              channel.type ===
                ChannelType.GuildText &&

              typeof channel.topic ===
                "string" &&

              channel.topic.includes(
                `ticket-owner:${interaction.user.id}`
              )
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

        const botMember =
          guild.members.me;

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
        ];

        if (
          botMember
        ) {
          permissionOverwrites.push({
            id:
              botMember.id,

            allow: [
              PermissionFlagsBits.ViewChannel,

              PermissionFlagsBits.SendMessages,

              PermissionFlagsBits.ReadMessageHistory,

              PermissionFlagsBits.ManageChannels,

              PermissionFlagsBits.AttachFiles,

              PermissionFlagsBits.ManageMessages,
            ],
          });
        }

        // ==================================================
        // STAFF PERMISSIONS
        // ==================================================

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
              `ticket-owner:${interaction.user.id}|ticket-type:${selected.label}`,

            permissionOverwrites,
          });

        // ==================================================
        // TICKET OPEN EMBED
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

        const confirmButton =
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

        const cancelButton =
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

            ephemeral:
              true,
          });

          return;
        }

        const transcriptData =
          await createTranscript(
            interaction.channel,
            interaction.user.tag
          );

        const completeData =
          addTranscriptChannelName(
            transcriptData,
            interaction.channel
          );

        await sendTranscript(
          interaction.guild,
          completeData
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
              .catch(
                () => {}
              );
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
// LOGIN
// ==================================================

client.login(
  token
);
