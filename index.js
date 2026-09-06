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
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

// ==================================================
// SETTINGS
// ==================================================

const token = process.env.DISCORD_TOKEN;

const channelId =
  process.env.CHANNEL_ID || "1544875173361221632";

const roleName =
  process.env.ROLE_NAME || "Allowlisted";

const removeRoleName =
  process.env.REMOVE_ROLE_NAME || "Non Whitelisted";

const ownerId =
  process.env.OWNER_ID || "";

// STAFF ROLE
const staffRoleId =
  "1543512745922531389";

// TICKET PANEL CHANNEL
const ticketPanelChannelId =
  "1543513299469996052";

// ALL TRANSCRIPTS GO HERE
const transcriptChannelId =
  "1545249215595413564";

// ==================================================
// TICKET CATEGORIES
// ==================================================

const ticketCategories = {
  "General Support":
    "1543512897953472552",

  "Player Report":
    "1545229419101036566",

  "Donation Ticket":
    "1543512854072926319",

  "Female Verification":
    "1545229787327369276",

  "Staff Reports":
    "1543512857935609927",

  "Ban Appeals":
    "1543512899597762580",

  "Contact a Developer":
    "1543512901623480360",

  "Gang Support":
    "1543512859965661264",
};

// ==================================================
// TICKET EMOJI
// ==================================================

const ticketEmojiId =
  "1545228451630415942";

const ticketEmojiName =
  "c5c3990dd5fc4872b34ac7e02bd290d2";

// ==================================================
// TOKEN CHECK
// ==================================================

if (!token) {
  console.error(
    "ERROR: DISCORD_TOKEN is missing from Railway variables."
  );

  process.exit(1);
}

// ==================================================
// CLIENT
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
// STAFF CHECK
// ==================================================

function isStaff(member) {
  return (
    member &&
    member.roles &&
    member.roles.cache.has(staffRoleId)
  );
}

// ==================================================
// OWNER CHECK
// ==================================================

function isOwner(userId) {
  return userId === ownerId;
}

// ==================================================
// TICKET CHECK
// ==================================================

function isTicketChannel(channel) {
  if (!channel) return false;

  return (
    channel.type === ChannelType.GuildText &&
    typeof channel.topic === "string" &&
    channel.topic.includes("ticketOwner:")
  );
}

// ==================================================
// GET TICKET OWNER
// ==================================================

function getTicketOwnerId(channel) {
  if (!channel || !channel.topic) {
    return null;
  }

  const match =
    channel.topic.match(/ticketOwner:(\d+)/);

  return match ? match[1] : null;
}

// ==================================================
// GET TICKET TYPE
// ==================================================

function getTicketType(channel) {
  if (!channel || !channel.topic) {
    return null;
  }

  const match =
    channel.topic.match(/type:([^|]+)/);

  return match
    ? match[1].trim()
    : null;
}

// ==================================================
// RANDOM TICKET NUMBER
// ==================================================

function randomTicketNumber() {
  return Math.floor(
    100000 +
    Math.random() * 900000
  );
}

// ==================================================
// BUILD TRANSCRIPT
// ==================================================

async function buildTranscript(channel) {
  try {
    let messages = [];

    let lastId = null;

    while (true) {
      const options = {
        limit: 100,
      };

      if (lastId) {
        options.before = lastId;
      }

      const batch =
        await channel.messages.fetch(options);

      if (!batch.size) {
        break;
      }

      messages.push(
        ...batch.values()
      );

      lastId =
        batch.last().id;

      if (batch.size < 100) {
        break;
      }

      // Keep the transcript from becoming enormous
      if (messages.length >= 2000) {
        break;
      }
    }

    messages.reverse();

    let transcript =
      "Atlanta Heights RP Ticket Transcript\n";

    transcript +=
      "========================================\n";

    transcript +=
      `Ticket: ${channel.name}\n`;

    transcript +=
      `Ticket Type: ${
        getTicketType(channel) || "Unknown"
      }\n`;

    transcript +=
      `Ticket Owner: ${
        getTicketOwnerId(channel) || "Unknown"
      }\n`;

    transcript +=
      `Created Transcript: ${
        new Date().toISOString()
      }\n`;

    transcript +=
      "========================================\n\n";

    for (const message of messages) {
      const timestamp =
        message.createdAt.toISOString();

      const username =
        message.author
          ? message.author.tag
          : "Unknown User";

      const content =
        message.content ||
        "[No text content]";

      transcript +=
        `[${timestamp}] ${username}: ${content}\n`;

      if (message.attachments.size) {
        for (
          const attachment
          of message.attachments.values()
        ) {
          transcript +=
            `Attachment: ${attachment.url}\n`;
        }
      }

      if (message.embeds.length) {
        for (
          const embed
          of message.embeds
        ) {
          if (embed.title) {
            transcript +=
              `Embed Title: ${embed.title}\n`;
          }

          if (embed.description) {
            transcript +=
              `Embed Description: ${embed.description}\n`;
          }
        }
      }

      transcript += "\n";
    }

    return transcript;

  } catch (error) {
    console.error(
      "Transcript build error:",
      error
    );

    return (
      "Unable to create transcript.\n\n" +
      `Error: ${error.message}`
    );
  }
}

// ==================================================
// SAVE TRANSCRIPT TO ONE CHANNEL
// ==================================================

async function saveTranscript(channel) {
  try {
    const transcriptChannel =
      await channel.guild.channels.fetch(
        transcriptChannelId
      );

    if (
      !transcriptChannel ||
      !transcriptChannel.isTextBased()
    ) {
      console.error(
        "Transcript channel not found."
      );

      return false;
    }

    const transcript =
      await buildTranscript(channel);

    const filePath =
      path.join(
        __dirname,
        `transcript-${Date.now()}.txt`
      );

    fs.writeFileSync(
      filePath,
      transcript,
      "utf8"
    );

    const ownerIdForTicket =
      getTicketOwnerId(channel);

    const ticketType =
      getTicketType(channel);

    const transcriptEmbed =
      new EmbedBuilder()
        .setColor(0x0066ff)

        .setTitle(
          "📄 Ticket Transcript"
        )

        .addFields(
          {
            name: "Ticket",
            value:
              `\`${channel.name}\``,
            inline: true,
          },

          {
            name: "Ticket Type",
            value:
              ticketType ||
              "Unknown",
            inline: true,
          },

          {
            name: "Ticket Owner",
            value:
              ownerIdForTicket
                ? `<@${ownerIdForTicket}>`
                : "Unknown",
            inline: true,
          }
        )

        .setFooter({
          text:
            "Atlanta Heights RP • Transcripts",
        })

        .setTimestamp();

    await transcriptChannel.send({
      embeds: [
        transcriptEmbed,
      ],

      files: [
        new AttachmentBuilder(
          filePath,
          {
            name:
              `${channel.name}-transcript.txt`,
          }
        ),
      ],
    });

    fs.unlinkSync(filePath);

    console.log(
      `Transcript saved for ${channel.name}`
    );

    return true;

  } catch (error) {
    console.error(
      "Transcript save error:",
      error
    );

    return false;
  }
}

// ==================================================
// DELETE TICKET AFTER TRANSCRIPT
// ==================================================

async function transcriptAndDelete(channel) {
  try {
    const saved =
      await saveTranscript(channel);

    if (!saved) {
      console.error(
        "Transcript failed. Ticket will NOT be deleted."
      );

      return false;
    }

    setTimeout(
      async () => {
        try {
          await channel.delete(
            "Ticket closed."
          );
        } catch (error) {
          console.error(
            "Ticket deletion error:",
            error
          );
        }
      },
      2000
    );

    return true;

  } catch (error) {
    console.error(
      "Transcript and delete error:",
      error
    );

    return false;
  }
}

// ==================================================
// CLIENT READY
// ==================================================

client.once(
  "clientReady",
  async () => {

    console.log(
      `Logged in as ${client.user.tag}`
    );

    console.log(
      `Watching whitelist channel: ${channelId}`
    );

    console.log(
      `Allowlisted role: ${roleName}`
    );

    console.log(
      `Staff role: ${staffRoleId}`
    );

    console.log(
      `Transcript channel: ${transcriptChannelId}`
    );

    try {
      const whitelistChannel =
        await client.channels.fetch(
          channelId
        );

      if (
        !whitelistChannel ||
        !whitelistChannel.guild
      ) {
        console.error(
          "Could not find whitelist channel."
        );

        return;
      }

      const guild =
        whitelistChannel.guild;

      // ==================================================
      // /CLEAR
      // ==================================================

      const clearCommand =
        new SlashCommandBuilder()
          .setName("clear")
          .setDescription(
            "Delete messages from this channel."
          );

      // ==================================================
      // /SETUP-TICKETS
      // ==================================================

      const setupTicketsCommand =
        new SlashCommandBuilder()
          .setName("setup-tickets")
          .setDescription(
            "Send the Atlanta Heights RP ticket panel."
          );

      // ==================================================
      // /REMIND
      // ==================================================

      const remindCommand =
        new SlashCommandBuilder()
          .setName("remind")
          .setDescription(
            "Send a ticket reminder to a user."
          )
          .addUserOption(
            option =>
              option
                .setName("user")
                .setDescription(
                  "The user to remind."
                )
                .setRequired(true)
          );

      await guild.commands.set([
        clearCommand,
        setupTicketsCommand,
        remindCommand,
      ]);

      console.log(
        `Registered /clear, /setup-tickets and /remind in ${guild.name}`
      );

    } catch (error) {

      console.error(
        "Command registration error:",
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
  async interaction => {

    try {

      // ==================================================
      // /CLEAR
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "clear"
      ) {

        if (
          !isOwner(
            interaction.user.id
          )
        ) {

          await interaction.reply({
            content:
              "❌ You are not authorized to use this command.",

            ephemeral: true,
          });

          return;
        }

        await interaction.deferReply({
          ephemeral: true,
        });

        let deleted = 0;

        while (true) {

          const messages =
            await interaction.channel.messages.fetch({
              limit: 100,
            });

          if (!messages.size) {
            break;
          }

          const recent =
            messages.filter(
              message =>
                Date.now() -
                message.createdTimestamp <
                14 *
                24 *
                60 *
                60 *
                1000
            );

          if (recent.size) {

            const deletedMessages =
              await interaction.channel.bulkDelete(
                recent,
                true
              );

            deleted +=
              deletedMessages.size;
          }

          const oldMessages =
            messages.filter(
              message =>
                Date.now() -
                message.createdTimestamp >=
                14 *
                24 *
                60 *
                60 *
                1000
            );

          for (
            const oldMessage
            of oldMessages.values()
          ) {

            try {
              await oldMessage.delete();
              deleted++;
            } catch {}
          }

          if (messages.size < 100) {
            break;
          }
        }

        await interaction.editReply({
          content:
            `✅ Deleted **${deleted}** messages.`,
        });

        return;
      }

      // ==================================================
      // /SETUP-TICKETS
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "setup-tickets"
      ) {

        if (
          !isOwner(
            interaction.user.id
          )
        ) {

          await interaction.reply({
            content:
              "❌ You are not authorized to use this command.",

            ephemeral: true,
          });

          return;
        }

        await interaction.deferReply({
          ephemeral: true,
        });

        const panelChannel =
          await client.channels.fetch(
            ticketPanelChannelId
          );

        if (
          !panelChannel ||
          !panelChannel.isTextBased()
        ) {

          await interaction.editReply({
            content:
              "❌ I couldn't find the ticket panel channel.",
          });

          return;
        }

        // ==================================================
        // PANEL IMAGE
        // ==================================================

        const panelImagePath =
          path.join(
            __dirname,
            "assets",
            "ticket-panel.png"
          );

        const panelImageExists =
          fs.existsSync(
            panelImagePath
          );

        // ==================================================
        // PANEL EMBED
        // ==================================================

        const panelEmbed =
          new EmbedBuilder()
            .setColor(0x0066ff)

            .setTitle(
              "<:c5c3990dd5fc4872b34ac7e02bd290d2:1545228451630415942> Atlanta Heights Support Tickets"
            )

            .setDescription(
              "Welcome to The Atlanta Heights Support. To ensure your issue is handled as quickly as possible, please select the most relevant category below.\n\n" +

              "Our staff team will respond as soon as possible — please be patient and provide clear, detailed information so we can assist you efficiently.\n\n" +

              "*If you are found spamming tickets/abusing our ticket system — You will be banned.*"
            )

            .setFooter({
              text:
                "Atlanta Heights RP • Support",
            });

        let panelAttachment = null;

        if (panelImageExists) {

          panelAttachment =
            new AttachmentBuilder(
              panelImagePath,
              {
                name:
                  "ticket-panel.png",
              }
            );

          panelEmbed.setImage(
            "attachment://ticket-panel.png"
          );
        }

        // ==================================================
        // TICKET DROPDOWN
        // ==================================================

        const menu =
          new StringSelectMenuBuilder()
            .setCustomId(
              "ticket_select"
            )
            .setPlaceholder(
              "Select a ticket type..."
            );

        const ticketOptions = [

          {
            label:
              "General Support",

            value:
              "general_support",

            description:
              "Open a ticket for general questions or help.",
          },

          {
            label:
              "Player Report",

            value:
              "player_report",

            description:
              "Report a player for breaking server rules.",
          },

          {
            label:
              "Donation Ticket",

            value:
              "donation_ticket",

            description:
              "Get help with donations, purchases, or Tebex.",
          },

          {
            label:
              "Female Verification",

            value:
              "female_verification",

            description:
              "Open a ticket for female verification.",
          },

          {
            label:
              "Staff Reports",

            value:
              "staff_reports",

            description:
              "Report a staff member or staff-related issue.",
          },

          {
            label:
              "Ban Appeals",

            value:
              "ban_appeals",

            description:
              "Appeal a server ban or false ban.",
          },

          {
            label:
              "Contact a Developer",

            value:
              "contact_a_developer",

            description:
              "Contact the development team about an issue.",
          },

          {
            label:
              "Gang Support",

            value:
              "gang_support",

            description:
              "Get help with gangs, gang issues, or gang support.",
          },
        ];

        for (
          const option
          of ticketOptions
        ) {

          const menuOption =
            new StringSelectMenuOptionBuilder()
              .setLabel(
                option.label
              )
              .setValue(
                option.value
              )
              .setDescription(
                option.description
              )
              .setEmoji({
                id:
                  ticketEmojiId,

                name:
                  ticketEmojiName,
              });

          menu.addOptions(
            menuOption
          );
        }

        const menuRow =
          new ActionRowBuilder()
            .addComponents(
              menu
            );

        const panelData = {
          embeds: [
            panelEmbed,
          ],

          components: [
            menuRow,
          ],
        };

        if (panelAttachment) {
          panelData.files = [
            panelAttachment,
          ];
        }

        await panelChannel.send(
          panelData
        );

        console.log(
          "SUCCESS: Ticket panel sent."
        );

        await interaction.editReply({
          content:
            "✅ Ticket panel sent successfully!",
        });

        return;
      }

      // ==================================================
      // /REMIND
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "remind"
      ) {

        // MUST BE INSIDE A TICKET
        if (
          !isTicketChannel(
            interaction.channel
          )
        ) {

          await interaction.reply({
            content:
              "❌ This command can only be used inside a ticket.",

            ephemeral: true,
          });

          return;
        }

        // ONLY STAFF
        if (
          !isStaff(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Only Staff Team members can use this command.",

            ephemeral: true,
          });

          return;
        }

        const user =
          interaction.options.getUser(
            "user"
          );

        if (!user) {

          await interaction.reply({
            content:
              "❌ Please mention a user.",

            ephemeral: true,
          });

          return;
        }

        await interaction.deferReply({
          ephemeral: true,
        });

        // ==================================================
        // REMINDER EMBED
        // ==================================================

        const reminderEmbed =
          new EmbedBuilder()
            .setColor(0x0066ff)

            .setTitle(
              "Ticket Reminder"
            )

            .setDescription(
              `Hey ${user}, you have been reminded about your ticket.\n\n` +

              `**Ticket Information**\n` +

              `Please click the button below to hop into your ticket.`
            )

            .setFooter({
              text:
                "Atlanta Heights RP • Support",
            });

        // ==================================================
        // BANNER
        // ==================================================

        const bannerPath =
          path.join(
            __dirname,
            "assets",
            "banner.png"
          );

        let reminderAttachment = null;

        if (
          fs.existsSync(
            bannerPath
          )
        ) {

          reminderAttachment =
            new AttachmentBuilder(
              bannerPath,
              {
                name:
                  "banner.png",
              }
            );

          reminderEmbed.setImage(
            "attachment://banner.png"
          );
        }

        // ==================================================
        // BUTTON TO TICKET
        // ==================================================

        const ticketButton =
          new ButtonBuilder()
            .setLabel(
              "Hop Into Ticket"
            )
            .setStyle(
              ButtonStyle.Link
            )
            .setURL(
              `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`
            );

        const reminderRow =
          new ActionRowBuilder()
            .addComponents(
              ticketButton
            );

        const dmData = {
          embeds: [
            reminderEmbed,
          ],

          components: [
            reminderRow,
          ],
        };

        if (reminderAttachment) {
          dmData.files = [
            reminderAttachment,
          ];
        }

        try {

          await user.send(
            dmData
          );

          await interaction.editReply({
            content:
              `✅ Reminder sent to ${user}.`,
          });

        } catch (error) {

          console.error(
            "Reminder DM error:",
            error
          );

          await interaction.editReply({
            content:
              "❌ I couldn't DM that user. Their DMs may be closed.",
          });
        }

        return;
      }

      // ==================================================
      // TICKET DROPDOWN
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "ticket_select"
      ) {

        const selected =
          interaction.values[0];

        const typeMap = {

          general_support:
            "General Support",

          player_report:
            "Player Report",

          donation_ticket:
            "Donation Ticket",

          female_verification:
            "Female Verification",

          staff_reports:
            "Staff Reports",

          ban_appeals:
            "Ban Appeals",

          contact_a_developer:
            "Contact a Developer",

          gang_support:
            "Gang Support",
        };

        const ticketType =
          typeMap[selected];

        if (!ticketType) {

          await interaction.reply({
            content:
              "❌ Invalid ticket type.",

            ephemeral: true,
          });

          return;
        }

        const categoryId =
          ticketCategories[
            ticketType
          ];

        if (!categoryId) {

          await interaction.reply({
            content:
              "❌ Ticket category not configured.",

            ephemeral: true,
          });

          return;
        }

        await interaction.deferReply({
          ephemeral: true,
        });

        const guild =
          interaction.guild;

        // ==================================================
        // EXISTING TICKET CHECK
        // ==================================================

        const existingTicket =
          guild.channels.cache.find(
            channel =>
              isTicketChannel(
                channel
              ) &&
              getTicketOwnerId(
                channel
              ) ===
                interaction.user.id
          );

        if (existingTicket) {

          await interaction.editReply({
            content:
              `❌ You already have an open ticket: ${existingTicket}`,
          });

          return;
        }

        // ==================================================
        // RANDOM TICKET NAME
        // ==================================================

        const ticketNumber =
          randomTicketNumber();

        // ==================================================
        // CREATE TICKET
        // ==================================================

        const ticketChannel =
          await guild.channels.create({

            name:
              `ticket-${ticketNumber}`,

            type:
              ChannelType.GuildText,

            parent:
              categoryId,

            topic:
              `ticketOwner:${interaction.user.id} | type:${ticketType}`,

            permissionOverwrites: [

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
                  PermissionFlagsBits.EmbedLinks,
                ],
              },

              {
                id:
                  staffRoleId,

                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },

              {
                id:
                  client.user.id,

                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
            ],
          });

        // ==================================================
        // CLOSE BUTTON
        // ==================================================

        const closeButton =
          new ButtonBuilder()
            .setCustomId(
              "close_ticket"
            )
            .setLabel(
              "Close Ticket"
            )
            .setEmoji(
              "🔒"
            )
            .setStyle(
              ButtonStyle.Danger
            );

        const buttonRow =
          new ActionRowBuilder()
            .addComponents(
              closeButton
            );

        // ==================================================
        // TICKET OPENED EMBED
        // ==================================================

        const ticketEmbed =
          new EmbedBuilder()
            .setColor(0x0066ff)

            .setTitle(
              "<:c5c3990dd5fc4872b34ac7e02bd290d2:1545228451630415942> Your ticket has been opened"
            )

            .setDescription(
              "Our staff have been notified and a member of our team will be with you shortly, please do not ping staff unless given explicit permission by them.\n\n" +

              "Please be respectful and ensure to be as detailed as possible to make sure our team have as much knowledge to assist you as best as they can."
            )

            .setFooter({
              text:
                "Atlanta Heights RP • Support",
            });

        // ==================================================
        // TICKET BANNER
        // ==================================================

        const bannerPath =
          path.join(
            __dirname,
            "assets",
            "banner.png"
          );

        let ticketAttachment = null;

        if (
          fs.existsSync(
            bannerPath
          )
        ) {

          ticketAttachment =
            new AttachmentBuilder(
              bannerPath,
              {
                name:
                  "banner.png",
              }
            );

          ticketEmbed.setImage(
            "attachment://banner.png"
          );
        }

        // ==================================================
        // SEND TICKET MESSAGE
        // ==================================================

        const ticketMessage = {
          content:
            `<@${interaction.user.id}> <@&${staffRoleId}>`,

          embeds: [
            ticketEmbed,
          ],

          components: [
            buttonRow,
          ],
        };

        if (ticketAttachment) {
          ticketMessage.files = [
            ticketAttachment,
          ];
        }

        await ticketChannel.send(
          ticketMessage
        );

        await interaction.editReply({
          content:
            `✅ Your ticket has been created: ${ticketChannel}`,
        });

        return;
      }

      // ==================================================
      // CLOSE BUTTON
      // ANYONE CAN CLICK IT
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "close_ticket"
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

        // ==================================================
        // ASK FOR CONFIRMATION
        // ==================================================

        const yesButton =
          new ButtonBuilder()
            .setCustomId(
              `confirm_close_${interaction.user.id}`
            )
            .setLabel(
              "Yes"
            )
            .setEmoji(
              "✅"
            )
            .setStyle(
              ButtonStyle.Success
            );

        const noButton =
          new ButtonBuilder()
            .setCustomId(
              `cancel_close_${interaction.user.id}`
            )
            .setLabel(
              "No"
            )
            .setEmoji(
              "❌"
            )
            .setStyle(
              ButtonStyle.Danger
            );

        const confirmRow =
          new ActionRowBuilder()
            .addComponents(
              yesButton,
              noButton
            );

        await interaction.reply({
          content:
            "⚠️ **Are you sure you want to close this ticket?**\n\nThe ticket transcript will automatically be saved.",

          components: [
            confirmRow,
          ],
        });

        return;
      }

      // ==================================================
      // CONFIRM CLOSE
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "confirm_close_"
        )
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

        const buttonUserId =
          interaction.customId.replace(
            "confirm_close_",
            ""
          );

        if (
          interaction.user.id !==
          buttonUserId
        ) {

          await interaction.reply({
            content:
              "❌ Only the person who started the close confirmation can choose this.",

            ephemeral: true,
          });

          return;
        }

        await interaction.update({
          content:
            "🔒 Saving transcript and closing ticket...",

          components: [],
        });

        await transcriptAndDelete(
          interaction.channel
        );

        return;
      }

      // ==================================================
      // CANCEL CLOSE
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "cancel_close_"
        )
      ) {

        const buttonUserId =
          interaction.customId.replace(
            "cancel_close_",
            ""
          );

        if (
          interaction.user.id !==
          buttonUserId
        ) {

          await interaction.reply({
            content:
              "❌ Only the person who started the close confirmation can choose this.",

            ephemeral: true,
          });

          return;
        }

        await interaction.update({
          content:
            "✅ Ticket close cancelled.",

          components: [],
        });

        return;
      }

    } catch (error) {

      console.error(
        "Interaction error:",
        error
      );

      try {

        if (
          interaction.deferred
        ) {

          await interaction.editReply({
            content:
              "❌ Something went wrong. Check Railway logs.",
          });

        } else if (
          !interaction.replied
        ) {

          await interaction.reply({
            content:
              "❌ Something went wrong. Check Railway logs.",

            ephemeral: true,
          });
        }

      } catch {}
    }
  }
);

// ==================================================
// MESSAGE COMMANDS
// ==================================================

client.on(
  "messageCreate",
  async message => {

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

    // ==================================================
    // $TRANSCRIPT
    // STAFF ONLY
    // TICKET ONLY
    // ==================================================

    if (
      message.content
        .trim()
        .toLowerCase() ===
      "$transcript"
    ) {

      if (
        !isStaff(
          message.member
        )
      ) {
        return;
      }

      if (
        !isTicketChannel(
          message.channel
        )
      ) {
        return;
      }

      try {

        await message.channel.send(
          "📄 Saving ticket transcript..."
        );

        const saved =
          await saveTranscript(
            message.channel
          );

        if (saved) {

          await message.channel.send(
            "✅ Transcript saved successfully."
          );

        } else {

          await message.channel.send(
            "❌ I couldn't save the transcript. Check Railway logs."
          );
        }

      } catch (error) {

        console.error(
          "$transcript error:",
          error
        );
      }

      return;
    }

    // ==================================================
    // $CLOSE
    // STAFF ONLY
    // TICKET ONLY
    // ==================================================

    if (
      message.content
        .trim()
        .toLowerCase() ===
      "$close"
    ) {

      if (
        !isStaff(
          message.member
        )
      ) {
        return;
      }

      if (
        !isTicketChannel(
          message.channel
        )
      ) {
        return;
      }

      const yesButton =
        new ButtonBuilder()
          .setCustomId(
            `confirm_close_${message.author.id}`
          )
          .setLabel(
            "Yes"
          )
          .setEmoji(
            "✅"
          )
          .setStyle(
            ButtonStyle.Success
          );

      const noButton =
        new ButtonBuilder()
          .setCustomId(
            `cancel_close_${message.author.id}`
          )
          .setLabel(
            "No"
          )
          .setEmoji(
            "❌"
          )
          .setStyle(
            ButtonStyle.Danger
          );

      const row =
        new ActionRowBuilder()
          .addComponents(
            yesButton,
            noButton
          );

      await message.channel.send({
        content:
          "⚠️ **Are you sure you want to close this ticket?**\n\nThe ticket transcript will automatically be saved.",

        components: [
          row,
        ],
      });

      return;
    }

    // ==================================================
    // $DELETE
    // STAFF ONLY
    // TICKET ONLY
    // AUTOMATIC TRANSCRIPT
    // ==================================================

    if (
      message.content
        .trim()
        .toLowerCase() ===
      "$delete"
    ) {

      if (
        !isStaff(
          message.member
        )
      ) {
        return;
      }

      if (
        !isTicketChannel(
          message.channel
        )
      ) {
        return;
      }

      try {

        await message.channel.send(
          "🗑️ Saving transcript and deleting ticket..."
        );

        await transcriptAndDelete(
          message.channel
        );

      } catch (error) {

        console.error(
          "$delete error:",
          error
        );
      }

      return;
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
      message.content
        .trim()
        .toLowerCase() !==
      "wl"
    ) {
      return;
    }

    try {

      // ==================================================
      // FIND ALLOWLISTED ROLE
      // ==================================================

      const role =
        message.guild.roles.cache.find(
          r =>
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
      // REMOVE OLD ROLE
      // ==================================================

      const removeRole =
        message.guild.roles.cache.find(
          r =>
            r.name.toLowerCase() ===
            removeRoleName.toLowerCase()
        );

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
          "Member was allowlisted."
        );
      }

      // ==================================================
      // GIVE ALLOWLISTED ROLE
      // ==================================================

      if (
        !message.member.roles.cache.has(
          role.id
        )
      ) {

        await message.member.roles.add(
          role,
          "Member said WL in the whitelist channel."
        );
      }

      // ==================================================
      // LOAD BANNER
      // ==================================================

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

      const profilePath =
        path.join(
          assetsFolder,
          "profile.png"
        );

      let imageBuffer = null;
      let imageFilename = null;

      // ==================================================
      // USE BANNER.PNG
      // ==================================================

      if (
        fs.existsSync(
          bannerPath
        )
      ) {

        const bannerStats =
          fs.statSync(
            bannerPath
          );

        if (
          bannerStats.size > 100
        ) {

          imageBuffer =
            fs.readFileSync(
              bannerPath
            );

          imageFilename =
            "banner.png";
        }
      }

      // ==================================================
      // FALLBACK TO PROFILE.PNG
      // ==================================================

      if (
        !imageBuffer &&
        fs.existsSync(
          profilePath
        )
      ) {

        const profileStats =
          fs.statSync(
            profilePath
          );

        if (
          profileStats.size > 100
        ) {

          imageBuffer =
            fs.readFileSync(
              profilePath
            );

          imageFilename =
            "profile.png";
        }
      }

      // ==================================================
      // DM EMBED
      // ==================================================

      const dmEmbed =
        new EmbedBuilder()
          .setColor(0x0066ff)

          .setTitle(
            "You are now Allowlisted!"
          )

          .setDescription(
            "Welcome to The Atlanta Heights. To ensure you love the city please go to see the news on what's happening or go check out the Tebex!\n\n" +

            "**Or you can go ahead and fly right in the city!**\n\n" +

            "If you are found cheating or abusing anything **YOU WILL BE BANNED**"
          )

          .setFooter({
            text:
              "Atlanta Heights RP",
          });

      let dmAttachment = null;

      if (
        imageBuffer &&
        imageFilename
      ) {

        dmAttachment =
          new AttachmentBuilder(
            imageBuffer,
            {
              name:
                imageFilename,
            }
          );

        dmEmbed.setImage(
          `attachment://${imageFilename}`
        );
      }

      // ==================================================
      // SEND WL DM
      // ==================================================

      try {

        const dmChannel =
          await message.author.createDM();

        const dmData = {
          embeds: [
            dmEmbed,
          ],
        };

        if (dmAttachment) {

          dmData.files = [
            dmAttachment,
          ];
        }

        await dmChannel.send(
          dmData
        );

        console.log(
          `SUCCESS: DM sent to ${message.author.tag}`
        );

      } catch (dmError) {

        console.error(
          `FAILED TO DM ${message.author.tag}`
        );

        console.error(
          dmError
        );
      }

      console.log(
        `${message.author.tag} was successfully allowlisted.`
      );

      return;

    } catch (error) {

      console.error(
        "WL ERROR:",
        error
      );
    }
  }
);

// ==================================================
// LOGIN
// ==================================================

client.login(token);
