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

// OWNER
const ownerId =
  process.env.OWNER_ID;

// STAFF
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

// RAILWAY PUBLIC URL
// Add this to Railway Variables:
// PUBLIC_URL=https://discordbot-production-f70d.up.railway.app
const publicUrl =
  (process.env.PUBLIC_URL || "").replace(/\/+$/, "");

// WEB PORT
const webPort =
  Number(process.env.PORT) || 3000;

// TRANSCRIPT FOLDER
const transcriptsFolder =
  path.join(
    __dirname,
    "transcripts"
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
    "Missing DISCORD_TOKEN in .env / Railway Variables."
  );

  process.exit(1);
}

// ==================================================
// CREATE TRANSCRIPT FOLDER
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
// CREATE DISCORD CLIENT
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

    // Uses General Support category
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

function getTicketInfo(channel) {

  let ticketOwnerId =
    "Unknown";

  let ticketType =
    "Unknown";

  if (channel.topic) {

    const ownerMatch =
      channel.topic.match(
        /ticket-owner:([^|]+)/
      );

    const typeMatch =
      channel.topic.match(
        /ticket-type:([^|]+)/
      );

    if (ownerMatch) {
      ticketOwnerId =
        ownerMatch[1];
    }

    if (typeMatch) {
      ticketType =
        typeMatch[1];
    }
  }

  return {
    ticketOwnerId,
    ticketType,
  };
}

// ==================================================

function safeFileName(name) {

  return name
    .replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    )
    .slice(
      0,
      80
    );
}

// ==================================================

function escapeHtml(text) {

  return String(text ?? "")
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
    Math.random() *
      9000
  );
}

// ==================================================

function makeTranscriptId() {

  return (

    Date.now()
      .toString(36)

    +

    "-"

    +

    Math.random()
      .toString(36)
      .substring(
        2,
        12
      )

  );
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

        limit:
          100,

        ...(before
          ? {
              before:
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
      batch.size <
      100
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

  const ticketInfo =
    getTicketInfo(
      channel
    );

  // ==================================================
  // GET OWNER USERNAME
  // ==================================================

  let ownerName =
    "Unknown";

  try {

    const owner =
      await guild.members.fetch(
        ticketInfo.ticketOwnerId
      );

    ownerName =
      owner.user.username;

  } catch {

    ownerName =
      "Unknown";

  }

  // ==================================================
  // TRANSCRIPT ID
  // ==================================================

  const transcriptId =
    makeTranscriptId();

  // ==================================================
  // TEXT TRANSCRIPT
  // ==================================================

  let text = "";

  text +=
    "Atlanta Heights RP Ticket Transcript\n";

  text +=
    "====================================\n";

  text +=
    `Ticket: ${channel.name}\n`;

  text +=
    `Ticket Type: ${ticketInfo.ticketType}\n`;

  text +=
    `Ticket Owner: ${ownerName}\n`;

  text +=
    `Saved By: ${savedBy}\n`;

  text +=
    `Messages: ${messages.length}\n`;

  text +=
    `Created Transcript: ${new Date().toISOString()}\n`;

  text +=
    "====================================\n\n";

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

          const authorName =
            escapeHtml(

              message.author?.tag ||

              message.author?.username ||

              "Unknown"

            );

          const avatar =
            message.author?.displayAvatarURL({

              extension:
                "png",

              size:
                64,

            }) || "";

          const content =
            escapeHtml(
              message.content ||
                ""
            ).replace(
              /\n/g,
              "<br>"
            );

          // EMBEDS
          const embedsHtml =
            message.embeds
              .map(
                (embed) => {

                  const title =
                    escapeHtml(
                      embed.title ||
                        ""
                    );

                  const description =
                    escapeHtml(
                      embed.description ||
                        ""
                    ).replace(
                      /\n/g,
                      "<br>"
                    );

                  return `

                    <div class="discord-embed">

                      ${
                        title
                          ? `
                            <div class="embed-title">
                              ${title}
                            </div>
                          `
                          : ""
                      }

                      ${
                        description
                          ? `
                            <div class="embed-description">
                              ${description}
                            </div>
                          `
                          : ""
                      }

                    </div>

                  `;

                }
              )
              .join("");

          // ATTACHMENTS
          const attachmentsHtml =
            Array.from(
              message.attachments.values()
            )
            .map(
              (attachment) => {

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

              }
            )
            .join("");

          // ==================================================
          // ADD MESSAGE TO TXT
          // ==================================================

          text +=
            `[${new Date(
              message.createdTimestamp
            ).toISOString()}] `;

          text +=
            `${message.author?.tag || "Unknown"}: `;

          if (
            message.content
          ) {

            text +=
              `${message.content}\n`;

          } else {

            text +=
              `[No message text]\n`;
          }

          if (
            message.embeds.length
          ) {

            for (
              const embed of message.embeds
            ) {

              if (
                embed.title
              ) {

                text +=
                  `Embed Title: ${embed.title}\n`;
              }

              if (
                embed.description
              ) {

                text +=
                  `Embed Description: ${embed.description}\n`;
              }
            }
          }

          if (
            message.attachments.size
          ) {

            for (
              const attachment of message.attachments.values()
            ) {

              text +=
                `Attachment: ${attachment.url}\n`;
            }
          }

          text +=
            "\n";

          // ==================================================
          // HTML MESSAGE
          // ==================================================

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
        }
      )
      .join("\n");

  // ==================================================
  // SAVE TXT
  // ==================================================

  const txtFileName =
    `transcript-${safeFileName(
      channel.name
    )}.txt`;

  const txtFilePath =
    path.join(
      transcriptsFolder,
      `${transcriptId}.txt`
    );

  fs.writeFileSync(
    txtFilePath,
    text,
    "utf8"
  );

  // ==================================================
  // CREATE WEBPAGE
  // ==================================================

  const htmlFilePath =
    path.join(
      transcriptsFolder,
      `${transcriptId}.html`
    );

  const guildName =
    guild?.name ||
    "Atlanta Heights RP";

  const guildIcon =
    guild?.iconURL({
      extension:
        "png",
      size:
        128,
    }) || "";

  const html = `

<!DOCTYPE html>

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
    18px 26px;

  background:
    #181a20;

  border-bottom:
    1px solid #30333b;

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
    70px;

  height:
    70px;

  border-radius:
    14px;

  object-fit:
    cover;

  background:
    #30343b;

}

.server-name {

  color:
    #ffffff;

  font-size:
    23px;

  font-weight:
    700;

}

.ticket-name {

  color:
    #ffffff;

  font-size:
    19px;

  margin-top:
    3px;

}

.message-count {

  color:
    #8e949e;

  font-size:
    14px;

  margin-top:
    4px;

}

.container {

  width:
    min(1000px, 100%);

  margin:
    0 auto;

  padding:
    20px;

}

.info-card {

  background:
    #2b2d35;

  border-left:
    4px solid #0066ff;

  border-radius:
    6px;

  padding:
    16px;

  margin-bottom:
    18px;

}

.info-grid {

  display:
    grid;

  grid-template-columns:
    repeat(
      3,
      minmax(
        0,
        1fr
      )
    );

  gap:
    10px;

}

.info-item {

  background:
    #202229;

  border-radius:
    5px;

  padding:
    11px;

}

.label {

  color:
    #949ba4;

  font-size:
    12px;

  margin-bottom:
    5px;

}

.value {

  color:
    #ffffff;

  font-size:
    14px;

  word-break:
    break-word;

}

.message {

  display:
    flex;

  gap:
    12px;

  padding:
    12px 4px;

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

  flex-shrink:
    0;

  background:
    #2b2d35;

}

.message-body {

  flex:
    1;

  min-width:
    0;

}

.message-header {

  display:
    flex;

  gap:
    9px;

  align-items:
    baseline;

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
    #727985;

  font-size:
    12px;

}

.message-content {

  color:
    #dbdee1;

  font-size:
    15px;

  line-height:
    1.5;

  word-break:
    break-word;

}

.discord-embed {

  margin-top:
    8px;

  padding:
    10px;

  background:
    #24262d;

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

  line-height:
    1.5;

}

.attachment {

  margin-top:
    8px;

}

.attachment a {

  color:
    #5ea8ff;

  text-decoration:
    none;

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

  text-align:
    center;

  color:
    #727985;

  font-size:
    12px;

  padding:
    20px;

}

@media (
  max-width: 700px
) {

  .info-grid {

    grid-template-columns:
      1fr;

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

        ${messages.length}

        message${
          messages.length ===
          1
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

        <div class="label">
          Ticket
        </div>

        <div class="value">
          ${escapeHtml(
            channel.name
          )}
        </div>

      </div>

      <div class="info-item">

        <div class="label">
          Ticket Type
        </div>

        <div class="value">
          ${escapeHtml(
            ticketInfo.ticketType
          )}
        </div>

      </div>

      <div class="info-item">

        <div class="label">
          Ticket Owner
        </div>

        <div class="value">
          ${escapeHtml(
            ownerName
          )}
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

    Atlanta Heights RP • Ticket Transcript

  </div>

</div>

</body>

</html>

`;

  fs.writeFileSync(
    htmlFilePath,
    html,
    "utf8"
  );

  return {

    transcriptId:
      transcriptId,

    txtFilePath:
      txtFilePath,

    txtFileName:
      txtFileName,

    htmlFilePath:
      htmlFilePath,

    ticketName:
      channel.name,

    ticketType:
      ticketInfo.ticketType,

    ownerId:
      ticketInfo.ticketOwnerId,

    ownerName:
      ownerName,

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

    // DIRECT LINK
    let transcriptUrl =
      null;

    if (publicUrl) {

      transcriptUrl =
        `${publicUrl}/transcript/${encodeURIComponent(
          transcript.transcriptId
        )}`;
    }

    // ==================================================
    // TRANSCRIPT EMBED
    // ==================================================

    const embed =
      new EmbedBuilder()

        .setColor(
          0x0066ff
        )

        .setTitle(
          "📄 Ticket Transcript"
        )

        .addFields(

          {
            name:
              "Ticket",

            value:
              `\`${transcript.ticketName}\``,

            inline:
              true,
          },

          {
            name:
              "Ticket Type",

            value:
              transcript.ticketType,

            inline:
              true,
          },

          {
            name:
              "Ticket Owner",

            value:
              transcript.ownerName ||
              "Unknown",

            inline:
              true,
          }

        )

        .setFooter({

          text:
            `Atlanta Heights RP • Transcripts • ${new Date().toLocaleString()}`,

        });

    // ==================================================
    // DIRECT LINK BUTTON
    // ==================================================

    const components = [];

    if (transcriptUrl) {

      const directLinkButton =
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
            transcriptUrl
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

    // ==================================================
    // SEND TRANSCRIPT
    // ==================================================

    await transcriptChannel.send({

      content:
        "",

      embeds: [
        embed,
      ],

      files: [
        transcript.txtFilePath,
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
        limit:
          100,
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
      const message of
        old.values()
    ) {

      await message
        .delete()
        .catch(
          () => {}
        );

      deletedCount++;
    }

    if (
      batch.size <
      100
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
      `Allowlisted role: ${roleName}`
    );

    console.log(
      `Staff role ID: ${staffRoleId}`
    );

    console.log(
      `Owner ID: ${ownerId || "NOT SET"}`
    );

    console.log(
      `Transcript channel: ${transcriptChannelId}`
    );

    console.log(
      `Public URL: ${publicUrl || "NOT SET"}`
    );

    console.log(
      `Ticket panel command: ${ticketPanelCommand}`
    );

    console.log(
      `Purge command: ${purgeCommand}`
    );

  }
);

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
                deletedCount ===
                1
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
      // OWNER ONLY
      // ==================================================

      if (
        lowerContent ===
        ticketPanelCommand.toLowerCase()
      ) {

        if (
          !ownerId ||
          message.author.id !==
            ownerId
        ) {

          await message.reply(
            "❌ Only the bot owner can use `$ticketpanel`."
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

          if (
            publicUrl
          ) {

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

              files: [
                transcript.txtFilePath,
              ],

            });

          } else {

            await message.reply({

              content:
                "✅ Transcript saved and sent to the transcript channel. Add PUBLIC_URL to Railway Variables for the Direct Link button.",

              files: [
                transcript.txtFilePath,
              ],

            });
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
        // NO TRANSCRIPT
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

      } catch {

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
        // CHECK EXISTING TICKET
        // ==================================================

        const existingTicket =
          guild.channels.cache.find(

            (channel) =>

              channel.type ===
                ChannelType.GuildText &&

              channel.topic &&

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
        // RANDOM TICKET NAME
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
        // CREATE CHANNEL
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

        const row =
          new ActionRowBuilder()
            .addComponents(
              yesButton,
              noButton
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
// TRANSCRIPT WEBSITE
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

        // ==================================================
        // HOME
        // ==================================================

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

          res.end(`

            <!DOCTYPE html>

            <html>

            <head>

              <title>
                Atlanta Heights
              </title>

            </head>

            <body

              style="

                margin:0;

                background:#1e2028;

                color:#ffffff;

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
                  Transcript website online.
                </p>

              </div>

            </body>

            </html>

          `);

          return;
        }

        // ==================================================
        // TRANSCRIPT PAGE
        // ==================================================

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

            res.end(`

              <!DOCTYPE html>

              <html>

              <body

                style="

                  margin:0;

                  padding:40px;

                  background:#1e2028;

                  color:white;

                  font-family:Arial;

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

            `);

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

        // ==================================================
        // 404
        // ==================================================

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

// ==================================================
// START WEB SERVER
// ==================================================

webServer.listen(

  webPort,

  "0.0.0.0",

  () => {

    console.log(
      `Transcript website running on port ${webPort}`
    );

    if (publicUrl) {

      console.log(
        `Direct transcript links: ${publicUrl}`
      );

    } else {

      console.log(
        "PUBLIC_URL is not set. Direct Link buttons will not work."
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
