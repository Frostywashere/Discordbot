require("dotenv").config();

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

const ownerId = process.env.OWNER_ID;

// ================================
// TICKET SETTINGS
// ================================

const ticketPanelChannelId = "1543513299469996052";

const transcriptCategoryId = "1545230632848986112";

const staffRoleId = "1543512745922531389";

// ================================
// TICKET CATEGORIES
// ================================

const ticketCategories = {
  general_support: {
    name: "General Support",
    categoryId: "1543512897953472552",
  },

  player_report: {
    name: "Player Report",
    categoryId: "1545229419101036566",
  },

  donation_ticket: {
    name: "Donation Ticket",
    categoryId: "1543512854072926319",
  },

  female_verification: {
    name: "Female Verification",
    categoryId: "1545229787327369276",
  },

  staff_reports: {
    name: "Staff Reports",
    categoryId: "1543512857935609927",
  },

  ban_appeals: {
    name: "Ban Appeals",
    categoryId: "1543512899597762580",
  },

  contact_developer: {
    name: "Contact a Developer",
    categoryId: "1543512901623480360",
  },

  gang_support: {
    name: "Gang Support",
    categoryId: "1543512859965661264",
  },
};

// ================================
// CUSTOM EMOJI
// ================================

const ticketEmoji = {
  id: "1545228451630415942",
  name: "c5c3990dd5fc4872b34ac7e02bd290d2",
};

// ================================
// CHECK TOKEN
// ================================

if (!token || token === "PASTE_YOUR_BOT_TOKEN_HERE") {
  console.error("Missing DISCORD_TOKEN.");
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
// HELPERS
// ================================

function isStaff(member) {
  return member?.roles?.cache?.has(staffRoleId);
}

function isOwner(userId) {
  return ownerId && userId === ownerId;
}

function isTicketChannel(channel) {
  return (
    channel &&
    channel.type === ChannelType.GuildText &&
    typeof channel.topic === "string" &&
    channel.topic.startsWith("ticketOwner:")
  );
}

function getTicketOwnerId(channel) {
  if (!isTicketChannel(channel)) return null;

  const match = channel.topic.match(/^ticketOwner:(\d+)/);

  return match ? match[1] : null;
}

// ================================
// TRANSCRIPT
// ================================

async function buildTranscript(channel) {
  let allMessages = [];

  let lastId;

  while (true) {
    const options = {
      limit: 100,
    };

    if (lastId) {
      options.before = lastId;
    }

    const batch = await channel.messages.fetch(options);

    if (!batch.size) {
      break;
    }

    allMessages.push(...batch.values());

    if (batch.size < 100) {
      break;
    }

    lastId = batch.last().id;
  }

  allMessages.sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp
  );

  let transcript = "";

  transcript += "Atlanta Heights RP Ticket Transcript\n";
  transcript += "=====================================\n";
  transcript += `Server: ${channel.guild.name}\n`;
  transcript += `Ticket: #${channel.name}\n`;
  transcript += `Channel ID: ${channel.id}\n`;
  transcript += `Created: ${channel.createdAt.toISOString()}\n`;
  transcript += `Generated: ${new Date().toISOString()}\n`;
  transcript += "=====================================\n\n";

  for (const message of allMessages) {
    const time = new Date(
      message.createdTimestamp
    ).toISOString();

    const author =
      `${message.author.tag} (${message.author.id})`;

    transcript += `[${time}] ${author}:\n`;

    transcript +=
      `${message.content || "[No text content]"}`;

    if (message.attachments.size) {
      transcript += "\nAttachments:";

      for (const attachment of message.attachments.values()) {
        transcript += `\n- ${attachment.url}`;
      }
    }

    transcript += "\n\n";
  }

  return Buffer.from(transcript, "utf8");
}

// ================================
// SEND TRANSCRIPT
// ================================

async function sendTranscript(channel) {
  const transcriptBuffer =
    await buildTranscript(channel);

  const guild = channel.guild;

  const transcriptCategory =
    guild.channels.cache.get(transcriptCategoryId);

  if (
    !transcriptCategory ||
    transcriptCategory.type !== ChannelType.GuildCategory
  ) {
    throw new Error(
      `Transcript category ${transcriptCategoryId} was not found.`
    );
  }

  const transcriptChannel =
    await guild.channels.create({
      name: `transcript-${channel.name}`.slice(0, 100),

      type: ChannelType.GuildText,

      parent: transcriptCategory.id,

      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,

          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },

        {
          id: client.user.id,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },

        {
          id: staffRoleId,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });

  const attachment =
    new AttachmentBuilder(transcriptBuffer, {
      name: `${channel.name}-transcript.txt`,
    });

  const embed =
    new EmbedBuilder()
      .setColor(0x0066ff)
      .setTitle("🎫 Ticket Transcript")
      .setDescription(
        `Transcript for **#${channel.name}**`
      )
      .setTimestamp();

  await transcriptChannel.send({
    embeds: [embed],

    files: [attachment],
  });

  return transcriptChannel;
}

// ================================
// CLOSE TICKET
// ================================

async function closeTicket(channel, closedBy) {
  if (!isTicketChannel(channel)) {
    return false;
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x0066ff)
        .setTitle("🔒 Ticket Closing")
        .setDescription(
          `This ticket is being closed by **${closedBy.tag}**.\n\n` +
          `The transcript is being saved.`
        )
        .setTimestamp(),
    ],
  }).catch(() => {});

  const transcriptChannel =
    await sendTranscript(channel);

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x0066ff)
        .setDescription(
          `✅ Transcript saved in ${transcriptChannel}.`
        ),
    ],
  }).catch(() => {});

  setTimeout(async () => {
    await channel.delete(
      "Ticket closed after transcript was saved."
    ).catch(() => {});
  }, 2000);

  return true;
}

// ================================
// BOT READY
// ================================

client.once("ready", async () => {
  console.log(
    `Logged in as ${client.user.tag}`
  );

  console.log(
    `Watching whitelist channel: ${channelId}`
  );

  console.log(
    `Ticket panel channel: ${ticketPanelChannelId}`
  );

  console.log(
    `Transcript category: ${transcriptCategoryId}`
  );

  console.log(
    `Staff role: ${staffRoleId}`
  );

  try {
    const whitelistChannel =
      await client.channels.fetch(channelId);

    if (whitelistChannel?.guild) {
      const commands = [

        new SlashCommandBuilder()
          .setName("clear")
          .setDescription(
            "Delete recent messages in this channel."
          )
          .setDMPermission(false),

        new SlashCommandBuilder()
          .setName("setup-tickets")
          .setDescription(
            "Send the Atlanta Heights ticket panel."
          )
          .setDMPermission(false),
      ];

      await whitelistChannel.guild.commands.set(
        commands.map(command => command.toJSON())
      );

      console.log(
        "Registered /clear and /setup-tickets."
      );
    }
  } catch (error) {
    console.error(
      "Could not register slash commands:",
      error
    );
  }
});

// ================================
// SLASH COMMANDS
// ================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    // ================================
    // /CLEAR
    // ================================

    if (
      interaction.commandName === "clear"
    ) {

      if (!isOwner(interaction.user.id)) {
        return interaction.reply({
          content:
            "❌ You are not allowed to use this command.",

          ephemeral: true,
        });
      }

      if (!interaction.channel?.isTextBased()) {
        return interaction.reply({
          content:
            "❌ This command can only be used in a text channel.",

          ephemeral: true,
        });
      }

      const me =
        interaction.guild.members.me;

      if (
        !interaction.channel
          .permissionsFor(me)
          ?.has(PermissionFlagsBits.ManageMessages)
      ) {
        return interaction.reply({
          content:
            "❌ I need **Manage Messages** permission.",

          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        const messages =
          await interaction.channel.messages.fetch({
            limit: 100,
          });

        const recentMessages =
          messages.filter(
            msg =>
              Date.now() -
                msg.createdTimestamp <
              14 * 24 * 60 * 60 * 1000
          );

        const oldMessages =
          messages.filter(
            msg =>
              Date.now() -
                msg.createdTimestamp >=
              14 * 24 * 60 * 60 * 1000
          );

        let deleted = 0;

        if (recentMessages.size > 1) {

          deleted +=
            (
              await interaction.channel.bulkDelete(
                recentMessages,
                true
              )
            ).size;

        } else if (
          recentMessages.size === 1
        ) {

          await recentMessages
            .first()
            .delete()
            .catch(() => {});

          deleted++;
        }

        for (
          const message
          of oldMessages.values()
        ) {

          await message
            .delete()
            .catch(() => {});

          deleted++;
        }

        return interaction.editReply(
          `✅ Deleted ${deleted} message(s).`
        );

      } catch (error) {

        console.error(
          "Clear error:",
          error
        );

        return interaction.editReply(
          "❌ I couldn't clear the messages."
        );
      }
    }

    // ================================
    // /SETUP-TICKETS
    // ================================

    if (
      interaction.commandName ===
      "setup-tickets"
    ) {

      if (!isOwner(interaction.user.id)) {
        return interaction.reply({
          content:
            "❌ You are not allowed to use this command.",

          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        const panelChannel =
          await client.channels.fetch(
            ticketPanelChannelId
          );

        if (
          !panelChannel ||
          !panelChannel.isTextBased() ||
          panelChannel.type !==
            ChannelType.GuildText
        ) {

          return interaction.editReply(
            "❌ The ticket panel channel ID is invalid."
          );
        }

        const panelEmbed =
          new EmbedBuilder()
            .setColor(0x0066ff)

            .setTitle(
              "Atlanta Heights RP | Support"
            )

            .setDescription(
              "Welcome to **Atlanta Heights RP** support.\n\n" +
              "Please select the option below that best matches what you need help with.\n\n" +
              "A private ticket will be created under the correct category."
            )

            .setFooter({
              text:
                "Atlanta Heights RP • Support",
            });

        /*
          PUT YOUR ATLANTA HEIGHTS IMAGE HERE:

          assets/ticket-panel.png
        */

        const panelImage =
          new AttachmentBuilder(
            "./assets/ticket-panel.png"
          );

        panelEmbed.setImage(
          "attachment://ticket-panel.png"
        );

        const options =
          Object.entries(
            ticketCategories
          ).map(
            ([value, ticket]) =>

              new StringSelectMenuOptionBuilder()

                .setLabel(ticket.name)

                .setValue(value)

                .setEmoji(ticketEmoji)
          );

        const menu =
          new StringSelectMenuBuilder()

            .setCustomId(
              "ticket_select"
            )

            .setPlaceholder(
              "Select a ticket type..."
            )

            .addOptions(options);

        const row =
          new ActionRowBuilder()
            .addComponents(menu);

        await panelChannel.send({

          embeds: [
            panelEmbed,
          ],

          components: [
            row,
          ],

          files: [
            panelImage,
          ],
        });

        return interaction.editReply(
          `✅ Ticket panel sent to <#${ticketPanelChannelId}>.`
        );

      } catch (error) {

        console.error(
          "Ticket setup error:",
          error
        );

        return interaction.editReply(
          "❌ I couldn't send the ticket panel. Make sure assets/ticket-panel.png exists and the bot has permission to send messages."
        );
      }
    }
  }
);

// ================================
// TICKET DROPDOWN
// ================================

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isStringSelectMenu()
    ) {
      return;
    }

    if (
      interaction.customId !==
      "ticket_select"
    ) {
      return;
    }

    const selected =
      interaction.values[0];

    const ticketInfo =
      ticketCategories[selected];

    if (!ticketInfo) {

      return interaction.reply({
        content:
          "❌ That ticket type is invalid.",

        ephemeral: true,
      });
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    try {

      // ================================
      // CHECK FOR EXISTING TICKET
      // ================================

      const existingTicket =
        interaction.guild.channels.cache.find(
          channel =>
            isTicketChannel(channel) &&
            getTicketOwnerId(channel) ===
              interaction.user.id
        );

      if (existingTicket) {

        return interaction.editReply(
          `❌ You already have an open ticket: ${existingTicket}`
        );
      }

      // ================================
      // FIND CATEGORY
      // ================================

      const category =
        interaction.guild.channels.cache.get(
          ticketInfo.categoryId
        );

      if (
        !category ||
        category.type !==
          ChannelType.GuildCategory
      ) {

        return interaction.editReply(
          `❌ The category for **${ticketInfo.name}** was not found.`
        );
      }

      // ================================
      // CHANNEL NAME
      // ================================

      const safeUsername =
        interaction.user.username
          .toLowerCase()
          .replace(
            /[^a-z0-9-]/g,
            ""
          )
          .slice(0, 30) ||
        "user";

      // ================================
      // CREATE TICKET
      // ================================

      const channel =
        await interaction.guild.channels.create({

          name:
            `${selected}-${safeUsername}`
              .slice(0, 100),

          type:
            ChannelType.GuildText,

          parent:
            category.id,

          topic:
            `ticketOwner:${interaction.user.id} | type:${selected}`,

          permissionOverwrites: [

            {
              id:
                interaction.guild.roles
                  .everyone.id,

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
                staffRoleId,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
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
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AttachFiles,
              ],
            },
          ],
        });

      // ================================
      // CLOSE BUTTON
      // ================================

      const closeButton =
        new ButtonBuilder()

          .setCustomId(
            "ticket_close_button"
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

      // ================================
      // TICKET EMBED
      // ================================

      const ticketEmbed =
        new EmbedBuilder()

          .setColor(0x0066ff)

          .setTitle(
            `🎫 ${ticketInfo.name}`
          )

          .setDescription(
            `Welcome ${interaction.user}!\n\n` +
            `Thank you for opening a **${ticketInfo.name}** ticket.\n\n` +
            `Please explain what you need help with and a member of the **Staff Team** will assist you.\n\n` +
            `Staff can use **$close** to save the transcript and close this ticket.\n` +
            `Staff can use **$delete** to delete this ticket without a transcript.`
          )

          .setFooter({
            text:
              "Atlanta Heights RP • Staff Team",
          })

          .setTimestamp();

      await channel.send({

        content:
          `<@${interaction.user.id}> <@&${staffRoleId}>`,

        embeds: [
          ticketEmbed,
        ],

        components: [
          buttonRow,
        ],
      });

      return interaction.editReply(
        `✅ Your **${ticketInfo.name}** ticket has been created: ${channel}`
      );

    } catch (error) {

      console.error(
        "Ticket creation error:",
        error
      );

      return interaction.editReply(
        "❌ I couldn't create your ticket. Make sure the bot has **Manage Channels** permission."
      );
    }
  }
);

// ================================
// CLOSE BUTTON
// ================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isButton()) {
      return;
    }

    if (
      interaction.customId !==
      "ticket_close_button"
    ) {
      return;
    }

    if (
      !isTicketChannel(
        interaction.channel
      )
    ) {

      return interaction.reply({
        content:
          "❌ This is not a ticket channel.",

        ephemeral: true,
      });
    }

    if (
      !isStaff(interaction.member)
    ) {

      return interaction.reply({
        content:
          "❌ Only the Staff Team can close tickets.",

        ephemeral: true,
      });
    }

    await interaction.reply({
      content:
        "🔒 Closing ticket and saving the transcript...",

      ephemeral: true,
    });

    try {

      await closeTicket(
        interaction.channel,
        interaction.user
      );

    } catch (error) {

      console.error(
        "Close button error:",
        error
      );

      await interaction.followUp({

        content:
          "❌ I couldn't save the transcript, so the ticket was not closed.",

        ephemeral: true,
      }).catch(() => {});
    }
  }
);

// ================================
// MESSAGE COMMANDS + WL
// ================================

client.on(
  "messageCreate",
  async message => {

    // Ignore bots
    if (message.author.bot) {
      return;
    }

    // Ignore DMs
    if (!message.guild) {
      return;
    }

    const content =
      message.content
        .trim()
        .toLowerCase();

    // ================================
    // $CLOSE
    // ================================

    if (content === "$close") {

      // Staff only
      if (
        !isStaff(message.member)
      ) {
        return;
      }

      // Ticket channels only
      if (
        !isTicketChannel(
          message.channel
        )
      ) {
        return;
      }

      try {

        await closeTicket(
          message.channel,
          message.author
        );

      } catch (error) {

        console.error(
          "$close error:",
          error
        );

        await message.reply(
          "❌ I couldn't create the transcript, so the ticket was not closed."
        ).catch(() => {});
      }

      return;
    }

    // ================================
    // $DELETE
    // ================================

    if (content === "$delete") {

      // Staff only
      if (
        !isStaff(message.member)
      ) {
        return;
      }

      // Ticket channels only
      if (
        !isTicketChannel(
          message.channel
        )
      ) {
        return;
      }

      await message.channel.delete(
        `Ticket deleted by Staff Team member ${message.author.tag}.`
      ).catch(error => {

        console.error(
          "$delete error:",
          error
        );

      });

      return;
    }

    // ================================
    // WL
    // ================================

    if (
      message.channelId !==
      channelId
    ) {
      return;
    }

    if (content !== "wl") {
      return;
    }

    try {

      // ================================
      // FIND ALLOWLISTED ROLE
      // ================================

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

      // ================================
      // GIVE ROLE
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
          r =>
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
          "Member was given the Allowlisted role."
        );
      }

      // ================================
      // LOAD BANNER
      // ================================

      const banner =
        new AttachmentBuilder(
          "./assets/banner.png"
        );

      // ================================
      // DM EMBED
      // ================================

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

      // ================================
      // SEND DM
      // ================================

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

      } catch (dmError) {

        console.log(
          `Could not DM ${message.author.tag}. Their DMs may be closed.`
        );
      }

      // No public WL confirmation.

    } catch (error) {

      console.error(
        "Something went wrong:",
        error
      );

      // No public WL error message.
    }
  }
);

// ================================
// LOGIN
// ================================

client.login(token);
