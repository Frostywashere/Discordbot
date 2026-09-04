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
// SERVER IDS
// ==================================================

const staffRoleId =
  "1543512745922531389";

const ticketPanelChannelId =
  "1543513299469996052";

const transcriptCategoryId =
  "1545230632848986112";

// ==================================================
// TICKET CATEGORIES
// ==================================================

const ticketCategories = {
  "General Support": "1543512897953472552",
  "Player Report": "1545229419101036566",
  "Donation Ticket": "1543512854072926319",
  "Female Verification": "1545229787327369276",
  "Staff Reports": "1543512857935609927",
  "Ban Appeals": "1543512899597762580",
  "Contact a Developer": "1543512901623480360",
  "Gang Support": "1543512859965661264",
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
// CREATE CLIENT
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
// HELPER FUNCTIONS
// ==================================================

function isStaff(member) {
  return (
    member &&
    member.roles &&
    member.roles.cache.has(staffRoleId)
  );
}

function isOwner(userId) {
  return userId === ownerId;
}

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

function getTicketOwnerId(channel) {
  if (!channel || !channel.topic) {
    return null;
  }

  const match =
    channel.topic.match(
      /ticketOwner:(\d+)/
    );

  return match ? match[1] : null;
}

// ==================================================
// TRANSCRIPT
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
          const attachment of
          message.attachments.values()
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
// SAVE TRANSCRIPT
// ==================================================

async function saveTranscript(channel) {
  try {

    const category =
      await channel.guild.channels.fetch(
        transcriptCategoryId
      );

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
    ) {

      console.error(
        "Transcript category not found."
      );

      return null;
    }

    const transcript =
      await buildTranscript(channel);

    const ownerIdForTicket =
      getTicketOwnerId(channel);

    const safeName =
      channel.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .slice(0, 70);

    const transcriptChannel =
      await channel.guild.channels.create({

        name:
          `transcript-${safeName}`,

        type:
          ChannelType.GuildText,

        parent:
          transcriptCategoryId,

        permissionOverwrites: [
          {
            id:
              channel.guild.roles.everyone.id,

            deny: [
              PermissionFlagsBits.ViewChannel,
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
            ],
          },
        ],
      });

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

    await transcriptChannel.send({
      content:
        `📄 **Ticket Transcript**\n\n` +
        `Original Ticket: **${channel.name}**\n` +
        `Ticket Owner: ${
          ownerIdForTicket
            ? `<@${ownerIdForTicket}>`
            : "Unknown"
        }`,

      files: [
        filePath,
      ],
    });

    fs.unlinkSync(filePath);

    console.log(
      `Transcript saved: ${transcriptChannel.name}`
    );

    return transcriptChannel;

  } catch (error) {

    console.error(
      "Transcript save error:",
      error
    );

    return null;
  }
}

// ==================================================
// CLOSE TICKET
// ==================================================

async function closeTicket(channel) {

  const transcriptChannel =
    await saveTranscript(channel);

  if (!transcriptChannel) {
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
      // CLEAR COMMAND
      // ==================================================

      const clearCommand =
        new SlashCommandBuilder()
          .setName("clear")
          .setDescription(
            "Delete messages from this channel."
          );

      // ==================================================
      // SETUP TICKETS COMMAND
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
                14 * 24 * 60 * 60 * 1000
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
                14 * 24 * 60 * 60 * 1000
            );

          for (
            const oldMessage of
            oldMessages.values()
          ) {

            try {

              await oldMessage.delete();

              deleted++;

            } catch {}
          }

          if (
            messages.size < 100
          ) {
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

        console.log(
          "========== TICKET PANEL DEBUG =========="
        );

        console.log(
          `Ticket emoji ID: ${ticketEmojiId}`
        );

        console.log(
          `Ticket emoji name: ${ticketEmojiName}`
        );

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

        console.log(
          `Ticket panel image exists: ${panelImageExists}`
        );

        // ==================================================
        // PANEL EMBED
        // ==================================================

        const panelEmbed =
          new EmbedBuilder()
            .setColor(0x0066ff)

            .setTitle(
              `<:c5c3990dd5fc4872b34ac7e02bd290d2:1545228451630415942> Atlanta Heights Support Tickets`
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
        // TICKET MENU
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

        // ==================================================
        // ADD OPTIONS
        // ==================================================

        for (
          const option of ticketOptions
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

        console.log(
          "========== END TICKET PANEL DEBUG =========="
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
        // CREATE TICKET
        // ==================================================

        const safeUsername =
          interaction.user.username
            .toLowerCase()
            .replace(
              /[^a-z0-9]/g,
              "-"
            )
            .slice(0, 20);

        const ticketChannel =
          await guild.channels.create({

            name:
              `${safeUsername}-ticket`,

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
            .setEmoji("🔒")
            .setStyle(
              ButtonStyle.Danger
            );

        const buttonRow =
          new ActionRowBuilder()
            .addComponents(
              closeButton
            );

        // ==================================================
        // TICKET EMBED
        // ==================================================

        const ticketEmbed =
          new EmbedBuilder()
            .setColor(0x0066ff)

            .setTitle(
              ticketType
            )

            .setDescription(
              `Hello <@${interaction.user.id}>!\n\n` +

              `Thank you for opening a **${ticketType}** ticket.\n\n` +

              `A member of the <@&${staffRoleId}> team will assist you shortly.\n\n` +

              `Please explain your issue and provide any information that may help staff.`
            )

            .setFooter({
              text:
                "Atlanta Heights RP Support",
            });

        await ticketChannel.send({

          content:
            `<@${interaction.user.id}> <@&${staffRoleId}>`,

          embeds: [
            ticketEmbed,
          ],

          components: [
            buttonRow,
          ],
        });

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
      // BANNER DEBUG
      // ==================================================

      console.log(
        "=========================================="
      );

      console.log(
        "========== WL BANNER DEBUG =========="
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

      const profilePath =
        path.join(
          assetsFolder,
          "profile.png"
        );

      console.log(
        `BOT FOLDER: ${__dirname}`
      );

      console.log(
        `ASSETS FOLDER: ${assetsFolder}`
      );

      console.log(
        `BANNER PATH: ${bannerPath}`
      );

      const bannerExists =
        fs.existsSync(
          bannerPath
        );

      const profileExists =
        fs.existsSync(
          profilePath
        );

      console.log(
        `BANNER EXISTS: ${bannerExists}`
      );

      console.log(
        `PROFILE EXISTS: ${profileExists}`
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

        console.log(
          `BANNER SIZE: ${bannerStats.size} bytes`
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

          console.log(
            "BANNER LOADED INTO MEMORY: YES"
          );

        } else {

          console.error(
            "BANNER FILE IS TOO SMALL / INVALID."
          );
        }

      } else if (profileExists) {

        const profileStats =
          fs.statSync(
            profilePath
          );

        console.log(
          `PROFILE SIZE: ${profileStats.size} bytes`
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

          console.log(
            "USING PROFILE.PNG AS FALLBACK"
          );
        }
      }

      // ==================================================
      // CREATE DM EMBED
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

      // ==================================================
      // ADD BANNER
      // ==================================================

      if (
        imageBuffer &&
        imageFilename
      ) {

        console.log(
          `CREATING DISCORD ATTACHMENT: ${imageFilename}`
        );

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

        console.log(
          `EMBED IMAGE SET TO: attachment://${imageFilename}`
        );

      } else {

        console.log(
          "NO VALID IMAGE FOUND."
        );
      }

      // ==================================================
      // SEND DM
      // ==================================================

      try {

        console.log(
          `ATTEMPTING DM TO: ${message.author.tag}`
        );

        const dmChannel =
          await message.author.createDM();

        console.log(
          `DM CHANNEL CREATED: ${dmChannel.id}`
        );

        const dmData = {
          embeds: [
            dmEmbed,
          ],
        };

        if (dmAttachment) {

          dmData.files = [
            dmAttachment,
          ];

          console.log(
            "BANNER ATTACHED TO DM: YES"
          );

        } else {

          console.log(
            "BANNER ATTACHED TO DM: NO"
          );
        }

        await dmChannel.send(
          dmData
        );

        console.log(
          `SUCCESS: DM + BANNER SENT TO ${message.author.tag}`
        );

      } catch (dmError) {

        console.error(
          `FAILED TO DM ${message.author.tag}`
        );

        console.error(
          "DM ERROR:",
          dmError
        );

        console.error(
          "DM ERROR CODE:",
          dmError.code
        );

        console.error(
          "DM ERROR MESSAGE:",
          dmError.message
        );
      }

      console.log(
        "========== END WL BANNER DEBUG =========="
      );

      console.log(
        "=========================================="
      );

      console.log(
        `${message.author.tag} was successfully allowlisted.`
      );

      // NO PUBLIC RESPONSE
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
