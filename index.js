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

// ROLESET PERMISSION ROLE
const roleSetPermissionRoleId =
  "1546044371747479582";

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

      // ==================================================
      // /ROLESET
      // ONLY MEMBERS WITH ROLESETS PERMISSION ROLE
      // ==================================================

      const roleSetCommand =
        new SlashCommandBuilder()
          .setName("roleset")
          .setDescription(
            "Give one or more roles to a user."
          )
          .addUserOption(
            option =>
              option
                .setName("user")
                .setDescription(
                  "The user who will receive the roles."
                )
                .setRequired(true)
          );

      // Discord slash commands can have multiple role options.
      // These are optional, so you can select as many as you need.
      for (let i = 1; i <= 10; i++) {
        roleSetCommand.addRoleOption(
          option =>
            option
              .setName(`role${i}`)
              .setDescription(`Role ${i} to give the user.`)
              .setRequired(i === 1)
        );
      }

      await guild.commands.set([
        clearCommand,
        setupTicketsCommand,
        remindCommand,
        roleSetCommand,
      ]);

      console.log(
        `Registered /clear, /setup-tickets, /remind and /roleset in ${guild.name}`
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

    try {      // ==================================================
      // SLASH COMMANDS
      // ==================================================

      if (
        interaction.isChatInputCommand()
      ) {

        // ==================================================
        // /CLEAR
        // ==================================================

        if (
          interaction.commandName ===
          "clear"
        ) {

          if (
            !isOwner(
              interaction.user.id
            )
          ) {
            return interaction.reply({
              content:
                "❌ Only the bot owner can use this command.",
              ephemeral: true,
            });
          }

          try {

            await interaction.deferReply({
              ephemeral: true,
            });

            const messages =
              await interaction.channel.messages.fetch({
                limit: 100,
              });

            if (!messages.size) {

              return interaction.editReply({
                content:
                  "❌ There are no messages to delete.",
              });

            }

            await interaction.channel.bulkDelete(
              messages,
              true
            );

            return interaction.editReply({
              content:
                `✅ Deleted ${messages.size} messages.`,
            });

          } catch (error) {

            console.error(
              "Clear command error:",
              error
            );

            if (
              interaction.deferred
            ) {

              return interaction.editReply({
                content:
                  "❌ I couldn't delete the messages. Make sure I have Manage Messages permission.",
              });

            }

            return interaction.reply({
              content:
                "❌ I couldn't delete the messages.",
              ephemeral: true,
            });
          }
        }

        // ==================================================
        // /SETUP-TICKETS
        // ==================================================

        if (
          interaction.commandName ===
          "setup-tickets"
        ) {

          if (
            !isOwner(
              interaction.user.id
            )
          ) {
            return interaction.reply({
              content:
                "❌ Only the bot owner can use this command.",
              ephemeral: true,
            });
          }

          const embed =
            new EmbedBuilder()
              .setColor(
                0x0066ff
              )
              .setTitle(
                "🎫 Atlanta Heights RP Support"
              )
              .setDescription(
                "Need help? Select the type of ticket you need from the menu below.\n\n" +
                "Please select the correct category so our staff team can help you as quickly as possible."
              )
              .setFooter({
                text:
                  "Atlanta Heights RP • Support",
              });

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                "ticket_category"
              )
              .setPlaceholder(
                "Select a ticket category..."
              );

          for (
            const category of Object.keys(
              ticketCategories
            )
          ) {

            menu.addOptions({
              label:
                category,
              value:
                category,
              emoji:
                {
                  name:
                    ticketEmojiName,
                  id:
                    ticketEmojiId,
                },
            });
          }

          const row =
            new ActionRowBuilder()
              .addComponents(
                menu
              );

          try {

            await interaction.channel.send({
              embeds: [
                embed,
              ],
              components: [
                row,
              ],
            });

            return interaction.reply({
              content:
                "✅ Ticket panel has been sent.",
              ephemeral: true,
            });

          } catch (error) {

            console.error(
              "Setup tickets error:",
              error
            );

            return interaction.reply({
              content:
                "❌ I couldn't send the ticket panel.",
              ephemeral: true,
            });
          }
        }

        // ==================================================
        // /ROLESET
        // ==================================================

        if (
          interaction.commandName ===
          "roleset"
        ) {

          // The person using /roleset MUST have
          // this exact role.
          if (
            !interaction.member.roles.cache.has(
              roleSetPermissionRoleId
            )
          ) {

            return interaction.reply({
              content:
                "❌ You do not have permission to use `/roleset`.",
              ephemeral: true,
            });
          }

          const targetUser =
            interaction.options.getUser(
              "user"
            );

          if (!targetUser) {

            return interaction.reply({
              content:
                "❌ You must select a user.",
              ephemeral: true,
            });
          }

          let targetMember;

          try {

            targetMember =
              await interaction.guild.members.fetch(
                targetUser.id
              );

          } catch (error) {

            return interaction.reply({
              content:
                "❌ I couldn't find that user in this server.",
              ephemeral: true,
            });
          }

          // ==================================================
          // COLLECT SELECTED ROLES
          // ==================================================

          const selectedRoles =
            [];

          for (
            let i = 1;
            i <= 10;
            i++
          ) {

            const role =
              interaction.options.getRole(
                `role${i}`
              );

            if (
              role &&
              !selectedRoles.some(
                existingRole =>
                  existingRole.id ===
                  role.id
              )
            ) {

              selectedRoles.push(
                role
              );
            }
          }

          if (
            selectedRoles.length ===
            0
          ) {

            return interaction.reply({
              content:
                "❌ You need to select at least one role.",
              ephemeral: true,
            });
          }

          // ==================================================
          // GET BOT MEMBER
          // ==================================================

          const botMember =
            interaction.guild.members.me ||
            await interaction.guild.members.fetch(
              interaction.client.user.id
            );

          if (!botMember) {

            return interaction.reply({
              content:
                "❌ I couldn't find my bot member.",
              ephemeral: true,
            });
          }

          // ==================================================
          // CHECK BOT ROLE HIERARCHY
          // ==================================================

          for (
            const role of selectedRoles
          ) {

            if (
              role.managed
            ) {

              return interaction.reply({
                content:
                  `❌ I can't give the managed role **${role.name}**.`,
                ephemeral: true,
              });
            }

            if (
              role.position >=
              botMember.roles.highest.position
            ) {

              return interaction.reply({
                content:
                  `❌ I can't give **${role.name}** because that role is higher than or equal to my highest role.`,
                ephemeral: true,
              });
            }
          }

          // ==================================================
          // DON'T MODIFY SERVER OWNER
          // ==================================================

          if (
            targetMember.id ===
            interaction.guild.ownerId
          ) {

            return interaction.reply({
              content:
                "❌ I can't change the server owner's roles.",
              ephemeral: true,
            });
          }

          // ==================================================
          // ONLY ADD ROLES THEY DON'T ALREADY HAVE
          // ==================================================

          const rolesToAdd =
            selectedRoles.filter(
              role =>
                !targetMember.roles.cache.has(
                  role.id
                )
            );

          if (
            rolesToAdd.length ===
            0
          ) {

            return interaction.reply({
              content:
                `ℹ️ **${targetMember.user.tag}** already has all of the selected roles.`,
              ephemeral: true,
            });
          }

          // ==================================================
          // ADD ROLES
          // ==================================================

          try {

            for (
              const role of rolesToAdd
            ) {

              await targetMember.roles.add(
                role,
                `Roleset used by ${interaction.user.tag}`
              );
            }

            const roleList =
              rolesToAdd
                .map(
                  role =>
                    `**${role.name}**`
                )
                .join(", ");

            await interaction.reply({
              content:
                `✅ Added ${roleList} to **${targetMember.user.tag}**.`,
              ephemeral: true,
            });

            console.log(
              `[ROLESET] ${interaction.user.tag} gave ${rolesToAdd
                .map(role => role.name)
                .join(", ")} to ${targetMember.user.tag}`
            );

          } catch (error) {

            console.error(
              "Roleset role assignment error:",
              error
            );

            if (
              interaction.replied ||
              interaction.deferred
            ) {

              return;
            }

            return interaction.reply({
              content:
                "❌ I couldn't give those roles. Make sure the bot has **Manage Roles** permission and that its highest role is above the roles you're trying to give.",
              ephemeral: true,
            });
          }
        }

        // ==================================================
        // /REMIND
        // ==================================================

        if (
          interaction.commandName ===
          "remind"
        ) {

          if (
            !isStaff(
              interaction.member
            )
          ) {

            return interaction.reply({
              content:
                "❌ Only staff can use this command.",
              ephemeral: true,
            });
          }

          if (
            !isTicketChannel(
              interaction.channel
            )
          ) {

            return interaction.reply({
              content:
                "❌ This command can only be used inside a ticket.",
              ephemeral: true,
            });
          }

          const user =
            interaction.options.getUser(
              "user"
            );

          if (!user) {

            return interaction.reply({
              content:
                "❌ You must select a user.",
              ephemeral: true,
            });
          }

          const ticketLink =
            `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`;

          const remindEmbed =
            new EmbedBuilder()
              .setColor(
                0x0066ff
              )
              .setTitle(
                "🎫 Ticket Reminder"
              )
              .setDescription(
                `You have a reminder from the staff team regarding your ticket in **${interaction.guild.name}**.`
              )
              .addFields({
                name:
                  "Ticket",
                value:
                  `[Click here to view your ticket](${ticketLink})`,
              })
              .setFooter({
                text:
                  "Atlanta Heights RP",
              })
              .setTimestamp();

          try {

            await user.send({
              embeds: [
                remindEmbed,
              ],
            });

            return interaction.reply({
              content:
                `✅ Reminder sent to **${user.tag}**.`,
              ephemeral: true,
            });

          } catch (error) {

            console.error(
              "Remind error:",
              error
            );

            return interaction.reply({
              content:
                "❌ I couldn't DM that user. Their DMs may be closed.",
              ephemeral: true,
            });
          }
        }
      }

      // ==================================================
      // TICKET CATEGORY SELECT MENU
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "ticket_category"
      ) {

        const selectedCategory =
          interaction.values[0];

        if (
          !ticketCategories[
            selectedCategory
          ]
        ) {

          return interaction.reply({
            content:
              "❌ That ticket category doesn't exist.",
            ephemeral: true,
          });
        }

        const existingTicket =
          interaction.guild.channels.cache.find(
            channel =>
              channel.type ===
                ChannelType.GuildText &&
              channel.topic &&
              channel.topic.includes(
                `ticketOwner:${interaction.user.id}`
              )
          );

        if (existingTicket) {

          return interaction.reply({
            content:
              `❌ You already have an open ticket: ${existingTicket}`,
            ephemeral: true,
          });
        }

        const categoryId =
          ticketCategories[
            selectedCategory
          ];

        const ticketNumber =
          randomTicketNumber();

        const safeUsername =
          interaction.user.username
            .toLowerCase()
            .replace(
              /[^a-z0-9]/g,
              ""
            )
            .slice(
              0,
              20
            );

        const channelName =
          `ticket-${safeUsername}-${ticketNumber}`;

        try {

          const ticketChannel =
            await interaction.guild.channels.create({
              name:
                channelName,

              type:
                ChannelType.GuildText,

              parent:
                categoryId,

              topic:
                `ticketOwner:${interaction.user.id} | type:${selectedCategory}`,

              permissionOverwrites: [
                {
                  id:
                    interaction.guild.id,

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
                    PermissionFlagsBits.ManageMessages,
                  ],
                },

                {
                  id:
                    interaction.client.user.id,

                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageMessages,
                  ],
                },
              ],
            });

          const ticketEmbed =
            new EmbedBuilder()
              .setColor(
                0x0066ff
              )
              .setTitle(
                `🎫 ${selectedCategory}`
              )
              .setDescription(
                `Welcome <@${interaction.user.id}>!\n\n` +
                "Please explain what you need help with. A member of the staff team will assist you shortly.\n\n" +
                "When you're finished, use the **Close Ticket** button below."
              )
              .addFields({
                name:
                  "Ticket Type",
                value:
                  selectedCategory,
                inline: true,
              })
              .setFooter({
                text:
                  "Atlanta Heights RP • Support",
              })
              .setTimestamp();

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

          const ticketRow =
            new ActionRowBuilder()
              .addComponents(
                closeButton
              );

          await ticketChannel.send({
            content:
              `<@${interaction.user.id}> <@&${staffRoleId}>`,

            embeds: [
              ticketEmbed,
            ],

            components: [
              ticketRow,
            ],
          });

          return interaction.reply({
            content:
              `✅ Your ticket has been created: ${ticketChannel}`,
            ephemeral: true,
          });

        } catch (error) {

          console.error(
            "Ticket creation error:",
            error
          );

          return interaction.reply({
            content:
              "❌ I couldn't create your ticket. Please contact staff.",
            ephemeral: true,
          });
        }
      }      // ==================================================
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
