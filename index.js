require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

// ================================
// SETTINGS
// ================================

const token = process.env.DISCORD_TOKEN;

// WL settings
const channelId =
  process.env.CHANNEL_ID || "1544875173361221632";

const roleName =
  process.env.ROLE_NAME || "Allowlisted";

const removeRoleName =
  process.env.REMOVE_ROLE_NAME || "Non Whitelisted";

// Ticket settings
const staffRoleId =
  process.env.STAFF_ROLE_ID || "1543512745922531389";

const staffRoleName =
  process.env.STAFF_ROLE_NAME || "Staff";

// Command
const ticketPanelCommand = "$ticketpanel";

// Custom emoji
const ticketEmojiId = "1546224146919334040";
const ticketEmojiName = "profile";

// ================================
// CHECK TOKEN
// ================================

if (!token || token === "PASTE_YOUR_BOT_TOKEN_HERE") {
  console.error("Missing DISCORD_TOKEN in .env");
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
// BOT ONLINE
// ================================

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Watching WL channel: ${channelId}`);
  console.log(`WL trigger: WL`);
  console.log(`Allowlisted role: ${roleName}`);
  console.log(`Ticket panel command: ${ticketPanelCommand}`);
});

// ================================
// TICKET CATEGORIES
// ================================

const ticketCategories = [
  {
    label: "General Support",
    description: "Open a ticket in this category for General Support",
    value: "general_support",
    channelName: "general-support",
    categoryId: "1543512897953472552",
  },

  {
    label: "Player Report",
    description: "Open a ticket in this category for Player Reports",
    value: "player_report",
    channelName: "player-report",
    categoryId: "1545229419101036566",
  },

  {
    label: "Donation Support",
    description: "Open a ticket in this category for Donation Support",
    value: "donation_ticket",
    channelName: "donation-ticket",
    categoryId: "1543512854072926319",
  },

  {
    label: "Female Verification",
    description: "Open a ticket in this category to Request verification for female roles and perks",
    value: "female_verification",
    channelName: "female-verification",
    categoryId: "1545229787327369276",
  },

  {
    label: "Staff Reports",
    description: "Open a ticket in this category to report a staff member",
    value: "staff_reports",
    channelName: "staff-reports",
    categoryId: "1543512857935609927",
  },

  {
    label: "Ban Appeals",
    description: "Open a ticket in this category for an ban appeal, or for an false ban ticket",
    value: "ban_appeals",
    channelName: "ban-appeals",
    categoryId: "1543512899597762580",
  },

  {
    label: "Contact a Developer",
    description: "Open a ticket in this category to contact our development team about server issues",
    value: "contact_developer",
    channelName: "contact-developer",
    categoryId: "1543512901623480360",
  },
];

// ================================
// MAKE TICKET PANEL
// ================================

function createTicketPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x0066ff)
    .setTitle("🎟️ Atlanta Heights Support Tickets")
    .setDescription(
      "Welcome to Atlanta Heights Support. To ensure your issue is handled as quickly as possible, please select the most relevant category below.\n\n" +
        "Our staff team will respond as soon as possible — please be patient and provide clear, detailed information so we can assist you efficiently.\n\n" +
        "*If you are found spamming tickets/abusing our ticket system — You will be banned.*"
    )
    .setImage("attachment://banner.png");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_category")
    .setPlaceholder("Press here to open a ticket.")
    .addOptions(
      ticketCategories.map((ticket) => ({
        label: ticket.label,
        description: ticket.description,
        value: ticket.value,
        emoji: {
          id: ticketEmojiId,
          name: ticketEmojiName,
        },
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return { embed, row };
}

// ================================
// FIND STAFF ROLE
// ================================

function findStaffRole(guild) {
  if (staffRoleId) {
    const roleById = guild.roles.cache.get(staffRoleId);

    if (roleById) {
      return roleById;
    }
  }

  return guild.roles.cache.find(
    (role) =>
      role.name.toLowerCase() === staffRoleName.toLowerCase()
  );
}

// ================================
// MESSAGE CREATE
// ================================

client.on("messageCreate", async (message) => {

  // Ignore bots
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // ================================
  // TICKET PANEL COMMAND
  // ================================

  if (
    message.content.trim().toLowerCase() ===
    ticketPanelCommand.toLowerCase()
  ) {

    // Only people with Manage Server can use it
    if (
      !message.member.permissions.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      return message.reply(
        "❌ You don't have permission to use this command."
      );
    }

    try {
      const { embed, row } = createTicketPanel();

      const banner = new AttachmentBuilder(
        "./assets/banner.png"
      );

      await message.channel.send({
        embeds: [embed],
        components: [row],
        files: [banner],
      });

      await message.delete().catch(() => {});

    } catch (error) {
      console.error(
        "Failed to send ticket panel:",
        error
      );

      await message.reply(
        "❌ I couldn't send the ticket panel. Make sure `assets/banner.png` exists."
      );
    }

    return;
  }

  // ================================
  // WL SYSTEM
  // ================================

  if (message.channelId !== channelId) return;

  if (
    message.content.trim().toLowerCase() !== "wl"
  ) {
    return;
  }

  try {

    // Find Allowlisted role
    const role = message.guild.roles.cache.find(
      (r) =>
        r.name.toLowerCase() ===
        roleName.toLowerCase()
    );

    if (!role) {
      console.error(
        `Role "${roleName}" was not found.`
      );

      await message.reply(
        `❌ I couldn't find the **${roleName}** role.`
      );

      return;
    }

    // Give Allowlisted role
    await message.member.roles.add(
      role,
      "Member said WL in the allowlist channel."
    );

    // Find Non Whitelisted role
    const removeRole =
      message.guild.roles.cache.find(
        (r) =>
          r.name.toLowerCase() ===
          removeRoleName.toLowerCase()
      );

    // Remove Non Whitelisted role
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
    // WL DM BANNER
    // ================================

    const banner = new AttachmentBuilder(
      "./assets/banner.png"
    );

    // ================================
    // WL DM EMBED
    // ================================

    const embed = new EmbedBuilder()
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
      .setImage("attachment://banner.png");

    // Send DM
    try {

      await message.author.send({
        embeds: [embed],
        files: [banner],
      });

      console.log(
        `Successfully DM'd ${message.author.tag}`
      );

    } catch (dmError) {

      console.log(
        `Could not DM ${message.author.tag}. Their DMs may be closed.`
      );
    }

    // Confirmation
    await message.reply(
      `✅ ${message.author}, you've been **Allowlisted**! Check your DMs.`
    );

  } catch (error) {

    console.error(
      "Something went wrong with WL:",
      error
    );

    await message
      .reply(
        "❌ I couldn't give you the Allowlisted role. Make sure my bot role is above **Allowlisted** and has **Manage Roles** permission."
      )
      .catch(() => {});
  }
});

// ================================
// TICKET DROPDOWN
// ================================

client.on(
  "interactionCreate",
  async (interaction) => {

    if (!interaction.isStringSelectMenu()) {
      return;
    }

    if (
      interaction.customId !==
      "ticket_category"
    ) {
      return;
    }

    const guild = interaction.guild;

    if (!guild) {
      return;
    }

    try {

      // Find selected category
      const selected =
        ticketCategories.find(
          (ticket) =>
            ticket.value ===
            interaction.values[0]
        );

      if (!selected) {
        return interaction.reply({
          content:
            "❌ That ticket category is invalid.",
          ephemeral: true,
        });
      }

      // ================================
      // CHECK FOR EXISTING TICKET
      // ================================

      const existingTicket =
        guild.channels.cache.find(
          (channel) =>
            channel.type ===
              ChannelType.GuildText &&
            channel.topic ===
              `ticket-owner:${interaction.user.id}`
        );

      if (existingTicket) {
        return interaction.reply({
          content:
            `❌ You already have an open ticket: ${existingTicket}`,
          ephemeral: true,
        });
      }

      // ================================
      // FIND STAFF ROLE
      // ================================

      const staffRole =
        findStaffRole(guild);

      if (!staffRole) {
        console.warn(
          "Staff role not found."
        );
      }

      // ================================
      // PERMISSIONS
      // ================================

      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,

          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },

        {
          id: interaction.user.id,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },

        {
          id: guild.members.me.id,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ];

      // Staff permissions
      if (staffRole) {

        permissionOverwrites.push({
          id: staffRole.id,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        });

      }

      // ================================
      // CREATE TICKET
      // ================================

      const ticketChannel =
        await guild.channels.create({
          name:
            `${selected.channelName}-${interaction.user.username}`
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-")
              .slice(0, 95),

          type:
            ChannelType.GuildText,

          // IMPORTANT:
          // This sends each ticket to its
          // own category.
          parent:
            selected.categoryId,

          topic:
            `ticket-owner:${interaction.user.id}`,

          permissionOverwrites,
        });

      // ================================
      // TICKET EMBED
      // ================================

      const ticketEmbed =
        new EmbedBuilder()
          .setColor(0x0066ff)
          .setTitle(
            "Atlanta Heights Support"
          )
          .setDescription(
            `Welcome ${interaction.user}! Your **${selected.label}** ticket has been created.\n\n` +
              "Please explain your issue clearly and provide any useful details. " +
              "A staff member will assist you as soon as possible."
          )
          .addFields({
            name: "Category",
            value: selected.label,
            inline: true,
          })
          .setImage(
            "attachment://banner.png"
          )
          .setFooter({
            text:
              "Atlanta Heights Support",
          });

      // ================================
      // TICKET BANNER
      // ================================

      const ticketBanner =
        new AttachmentBuilder(
          "./assets/banner.png"
        );

      // ================================
      // SEND TICKET MESSAGE
      // ================================

      await ticketChannel.send({
        content: staffRole
          ? `${interaction.user} ${staffRole}`
          : `${interaction.user}`,

        embeds: [
          ticketEmbed,
        ],

        files: [
          ticketBanner,
        ],
      });

      // ================================
      // TICKET CREATED MESSAGE
      // ================================

      await interaction.reply({
        content:
          `✅ Your ticket has been created: ${ticketChannel}`,
        ephemeral: true,
      });

    } catch (error) {

      console.error(
        "Failed to create ticket:",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        await interaction
          .followUp({
            content:
              "❌ I couldn't create your ticket. Make sure the bot has **Manage Channels**, **View Channels**, and **Send Messages** permissions.",

            ephemeral: true,
          })
          .catch(() => {});

      } else {

        await interaction
          .reply({
            content:
              "❌ I couldn't create your ticket. Make sure the bot has **Manage Channels**, **View Channels**, and **Send Messages** permissions.",

            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  }
);

// ================================
// LOGIN
// ================================

client.login(token);
