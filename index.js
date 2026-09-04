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

// ==================================================
// STAFF ROLE
// ==================================================

const staffRoleId =
  "1543512745922531389";

// ==================================================
// TICKET PANEL CHANNEL
// ==================================================

const ticketPanelChannelId =
  "1543513299469996052";

// ==================================================
// TRANSCRIPT CHANNEL
// ==================================================

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
// CUSTOM TICKET EMOJI
// ==================================================

const ticketEmojiId =
  "1545228451630415942";

const ticketEmojiName =
  "c5c3990dd5fc4872b34ac7e02bd290d2";

// ==================================================
// CHECK TOKEN
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
// CHECK IF CHANNEL IS A TICKET
// ==================================================

function isTicketChannel(channel) {
  if (!channel) {
    return false;
  }

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
// RANDOM TICKET NUMBER
// ==================================================

function generateTicketNumber() {
  return Math.floor(
    1000 + Math.random() * 9000
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

      lastId = batch.last().id;

      if (batch.size < 100) {
        break;
      }

      if (messages.length >= 1000) {
        break;
      }
    }

    messages.reverse();

    let transcript =
      "Atlanta Heights RP Ticket Transcript\n";

    transcript +=
      "========================================\n";

    transcript +=
      `Channel: ${channel.name}\n`;

    transcript +=
      `Created: ${new Date().toISOString()}\n`;

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
      await client.channels.fetch(
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

    const ownerIdForTicket =
      getTicketOwnerId(channel);

    // ==================================================
    // TEMP TRANSCRIPT FILE
    // ==================================================

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

    // ==================================================
    // SEND TRANSCRIPT
    // ==================================================

    await transcriptChannel.send({

      content:
        `📄 **Ticket Transcript**\n\n` +

        `🎫 Ticket: **${channel.name}**\n` +

        `👤 Ticket Owner: ${
          ownerIdForTicket
            ? `<@${ownerIdForTicket}>`
            : "Unknown"
        }`,

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

    // ==================================================
    // DELETE TEMP FILE
    // ==================================================

    fs.unlinkSync(filePath);

    console.log(
      `Transcript saved to #${transcriptChannel.name}`
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
// CLOSE TICKET
// ==================================================

async function closeTicket(channel) {

  const transcriptSaved =
    await saveTranscript(channel);

  if (!transcriptSaved) {

    console.error(
      "Transcript could not be saved."
    );
  }

  setTimeout(
    async () => {

      try {

        await channel.delete(
          "Ticket closed by staff."
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
}

// ==================================================
// BOT READY
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
      "Whitelist trigger: WL"
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

      await guild.commands.set([
        clearCommand,
        setupTicketsCommand,
      ]);

      console.log(
        `Registered /clear and /setup-tickets in ${guild.name}`
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
  async (interaction) => {

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
              (message) =>
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
              (message) =>
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

            .setColor(
              0x0066ff
            )

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
        // DROPDOWN
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
          },

          {
            label:
              "Player Report",

            value:
              "player_report",
          },

          {
            label:
              "Donation Ticket",

            value:
              "donation_ticket",
          },

          {
            label:
              "Female Verification",

            value:
              "female_verification",
          },

          {
            label:
              "Staff Reports",

            value:
              "staff_reports",
          },

          {
            label:
              "Ban Appeals",

            value:
              "ban_appeals",
          },

          {
            label:
              "Contact a Developer",

            value:
              "contact_a_developer",
          },

          {
            label:
              "Gang Support",

            value:
              "gang_support",
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
        // CHECK EXISTING TICKET
        // ==================================================

        const existingTicket =
          guild.channels.cache.find(
            (channel) =>
              isTicketChannel(channel) &&
              getTicketOwnerId(channel) ===
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
        // GENERATE RANDOM TICKET NUMBER
        // ==================================================

        let ticketNumber =
          generateTicketNumber();

        while (
          guild.channels.cache.some(
            (channel) =>
              channel.name ===
              `ticket-${ticketNumber}`
          )
        ) {

          ticketNumber =
            generateTicketNumber();
        }

        const ticketName =
          `ticket-${ticketNumber}`;

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
              categoryId,

            topic:
              `ticketOwner:${interaction.user.id} | type:${ticketType}`,

            permissionOverwrites: [

              // EVERYONE
              {
                id:
                  guild.roles.everyone.id,

                deny: [
                  PermissionFlagsBits.ViewChannel,
                ],
              },

              // TICKET OWNER
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

              // STAFF
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

              // BOT
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
        // TICKET CLOSE BUTTON
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
        // TICKET BANNER
        // ==================================================

        const bannerPath =
          path.join(
            __dirname,
            "assets",
            "banner.png"
          );

        const bannerExists =
          fs.existsSync(
            bannerPath
          );

        // ==================================================
        // TICKET OPENED EMBED
        // ==================================================

        const ticketEmbed =
          new EmbedBuilder()

            // BLUE SIDE COLOR
            .setColor(
              0x0066ff
            )

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
        // ADD BANNER TO TICKET MESSAGE
        // ==================================================

        let ticketBannerAttachment = null;

        if (bannerExists) {

          ticketBannerAttachment =
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

        } else {

          console.error(
            "WARNING: assets/banner.png was not found."
          );
        }

        // ==================================================
        // TICKET MESSAGE DATA
        // ==================================================

        const ticketMessageData = {

          content:
            `<@${interaction.user.id}> <@&${staffRoleId}>`,

          embeds: [
            ticketEmbed,
          ],

          components: [
            buttonRow,
          ],
        };

        // ==================================================
        // ATTACH BANNER
        // ==================================================

        if (
          ticketBannerAttachment
        ) {

          ticketMessageData.files = [
            ticketBannerAttachment,
          ];
        }

        // ==================================================
        // SEND TICKET MESSAGE
        // ==================================================

        await ticketChannel.send(
          ticketMessageData
        );

        // ==================================================
        // CONFIRM TO USER
        // ==================================================

        await interaction.editReply({

          content:
            `✅ Your ticket has been created: ${ticketChannel}`,
        });

        return;
      }

      // ==================================================
      // CLOSE BUTTON
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "close_ticket"
      ) {

        if (
          !isStaff(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Only Staff Team members can close tickets.",

            ephemeral: true,
          });

          return;
        }

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

        await interaction.reply({

          content:
            "🔒 Saving transcript and closing ticket...",
        });

        await closeTicket(
          interaction.channel
        );

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

    // ==================================================
    // $CLOSE
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

      try {

        await message.channel.send(
          "🔒 Saving transcript and closing ticket..."
        );

        await closeTicket(
          message.channel
        );

      } catch (error) {

        console.error(
          "$close error:",
          error
        );
      }

      return;
    }

    // ==================================================
    // $DELETE
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

        await message.channel.delete(
          "Ticket deleted by staff."
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
      // REMOVE OLD ROLE
      // ==================================================

      const removeRole =
        message.guild.roles.cache.find(
          (r) =>
            r.name.toLowerCase() ===
            removeRoleName.toLowerCase()
        );

      if (
        removeRole &&
        removeRole.id !== role.id &&
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
      // ASSETS
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

      const bannerExists =
        fs.existsSync(
          bannerPath
        );

      const profileExists =
        fs.existsSync(
          profilePath
        );

      let imageBuffer = null;
      let imageFilename = null;

      // ==================================================
      // LOAD BANNER
      // ==================================================

      if (bannerExists) {

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

      } else if (profileExists) {

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
      // WL DM EMBED
      // ==================================================

      const dmEmbed =
        new EmbedBuilder()

          .setColor(
            0x0066ff
          )

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

      // ==================================================
      // ADD WL BANNER
      // ==================================================

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
      // SEND DM
      // ==================================================

      try {

        const dmChannel =
          await message.author.createDM();

        const dmData = {

          embeds: [
            dmEmbed,
          ],
        };

        if (
          dmAttachment
        ) {

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
