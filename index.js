require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const Sentiment = require('sentiment');

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  auraPoints: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Slash command collection
client.commands = new Map();

// Random content arrays
const positiveMemes = [
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDRxaTBqYnBzeDVhazFjYjg1OGlmN25mYXFxeXg4czVxaWljd2RudCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CAxbo8KC2A0y4/giphy.gif', caption: 'Slayin’ with santhosham and खुशी!' }, // Dancing cat
  { url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGg1NmV3d2tpdWpvaHZicmR1Nms2cHYybzhnOWVzdTF4ZGd3ZWc3bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Jp4dchTKX6BzGkZ5DL/giphy.gif', caption: 'Poli vibes only, king/queen energy!' }, // Fire vibe
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWFheTF4M3lpZ2YxMGNtMWltbm1oZmNua2I3bHN4anNjeHFqdnR1eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/zWxXlcFYJZ6BaoL2ce/giphy.gif', caption: 'Highkey iconic, mast aura!' } // Sparkle
];
const neutralMemes = [
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHN4eTR2M3Jva3Brc21ydXdiMXMwNmU3YW05bmxiMjMxbDJqZ2R1ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qJzZ4APiDZQuJDY7vh/giphy.gif', caption: 'Lowkey chill, just aikyam things.' }, // Shrug
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHN4eTR2M3Jva3Brc21ydXdiMXMwNmU3YW05bmxiMjMxbDJqZ2R1ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/A6aHBCFqlE0Rq/giphy.gif', caption: 'Nalla vibe, balanced एकता.' }, // Okay vibe
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHN4eTR2M3Jva3Brc21ydXdiMXMwNmU3YW05bmxiMjMxbDJqZ2R1ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/4WSayDGcgnRe/giphy.gif', caption: 'Just existing, no drama.' } // Meh
];
const negativeMemes = [
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3VtN285aDZ6bWJnYzI5dGs5M3Iwb243eWVpYW8yZzE0M245bzg3eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cS9lGF8gIBdQs/giphy.gif', caption: 'Big yikes, veruppu overload!' }, // Facepalm
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOG5vM2UyZ3d2aHlhNG9qNzAxbzYyMXJ6YXl2enhxNzhpZDN1em9rZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Iu9rM6jqEozoPqbfxn/giphy.gif', caption: 'Thallu energy, नफरत detected.' }, // Cringe
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHd4czgwcTZ0ZmpjYzVrejB1NzZvMmw3NXU0Z3RoZGM1cnRhb3E1aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/X4Hn2cuntiSuF5PkVV/giphy.gif', caption: 'Vibe-killer, total chali.' } // Sad Affleck
];

const randomQuotes = {
  positive: ['"Your vibe attracts your tribe."', '"Shine like the starseed you are."', '"Manifesting pure bliss, fam!"'],
  neutral: ['"Balance is the key to serenity."', '"Chillin’ like a sage on a stage."', '"Just flowing with the cosmic current."'],
  negative: ['"Time for a spiritual glow-up."', '"Karmic debt? Time to cleanse."', '"Low vibes? You got this, fam."']
};

const multilingualFlair = {
  positive: ['santhosham', 'खुशी', 'poli', 'mast'],
  neutral: ['aikyam', 'एकता', 'nalla', 'sahi'],
  negative: ['veruppu', 'नफरत', 'thallu', 'ghatiya']
};

// Define slash commands
const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Learn how to use the Aura Bot.');

const auraCommand = new SlashCommandBuilder()
  .setName('aura')
  .setDescription('Check a user\'s aura points and vibe.')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to check (defaults to you).')
      .setRequired(false)
  );

const visualizeCommand = new SlashCommandBuilder()
  .setName('visualize')
  .setDescription('Visualize a user\'s aura with chakra alignment and a meme.')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to visualize (defaults to you).')
      .setRequired(false)
  );

client.commands.set(helpCommand.name, {
  data: helpCommand,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🌌 Aura Bot Help')
      .setDescription('The Aura Bot calculates and visualizes your spiritual and Gen Z aura based on your messages in English, Malayalam, Manglish, and Hindi.')
      .addFields(
        {
          name: 'Commands',
          value: `
            **/help** - Show this help message.
            **/aura [user]** - Check a user's aura points and vibe.
            **/visualize [user]** - Visualize a user's aura with a chakra, meme, and multilingual flair.
          `
        },
        {
          name: 'How It Works',
          value: 'Aura points (-100 to +100) are calculated from messages using sentiment analysis and keywords. Visualizations include a glowing aura, chakra alignment, Gen Z slang, and a vibe-matching meme GIF.'
        },
        {
          name: 'Languages Supported',
          value: 'English (vibes, slay), Malayalam (സന്തോഷം), Manglish (poli), Hindi (खुशी).'
        }
      )
      .setColor(0x00B7EB)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
});

client.commands.set(auraCommand.name, {
  data: auraCommand,
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    try {
      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (!targetUserData || targetUserData.messageCount === 0) {
        return interaction.reply(`${targetUser.username} has no recorded aura yet.`);
      }

      let auraDescription = '';
      if (targetUserData.auraPoints > 50) {
        auraDescription = 'Radiates positive energy (joy, love, compassion)';
      } else if (targetUserData.auraPoints > 0) {
        auraDescription = 'Mildly positive energy (uplifting, kind)';
      } else if (targetUserData.auraPoints === 0) {
        auraDescription = 'Neutral energy (balanced, no strong vibe)';
      } else if (targetUserData.auraPoints > -50) {
        auraDescription = 'Mildly negative energy (unsettled, low vibe)';
      } else {
        auraDescription = 'Radiates negative energy (toxic, dark)';
      }

      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Aura Stats ✨`)
        .setDescription(`**Aura Points**: ${targetUserData.auraPoints}\n**Vibe**: ${auraDescription}\n**Messages Analyzed**: ${targetUserData.messageCount}`)
        .setColor(0x00B7EB)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing /aura:', error);
      await interaction.reply({ content: 'Failed to fetch aura data.', ephemeral: true });
    }
  }
});

client.commands.set(visualizeCommand.name, {
  data: visualizeCommand,
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    try {
      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (!targetUserData || targetUserData.messageCount === 0) {
        return interaction.reply(`${targetUser.username} has no recorded aura yet.`);
      }

      const visualization = visualizeAura(targetUserData.auraPoints, targetUser.username);
      await interaction.reply({ embeds: [visualization.embed] });
    } catch (error) {
      console.error('Error executing /visualize:', error);
      await interaction.reply({ content: 'Failed to visualize aura.', ephemeral: true });
    }
  }
});

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
async function registerSlashCommands() {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [helpCommand.toJSON(), auraCommand.toJSON(), visualizeCommand.toJSON()] }
    );
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

// Aura calculation function (unchanged for brevity, same as original)
function calculateSpiritualAuraPoints(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') return 0;

  const sentiment = new Sentiment();
  const result = sentiment.analyze(text);
  const sentimentScore = result.score;

  const positiveAuraWords = [
    'joy', 'love', 'compassion', 'kindness', 'peace', 'gratitude', 'healing', 'light', 'blessing', 'hope',
    'slay', 'vibes', 'iconic', 'real', 'authentic', 'queen', 'king', 'stan', 'inspo', 'bussin',
    'സന്തോഷം', 'സ്നേഹം', 'കരുണ', 'ദയ', 'സമാധാനം', 'നന്ദി', 'രോഗശാന്തി', 'വെളിച്ചം', 'ആശീർവാദം', 'പ്രതീക്ഷ',
    'santhosham', 'sneham', 'karuna', 'daya', 'samadhanam', 'nandi', 'rogashanthi', 'velicham', 'ashirvad', 'pratheeksha',
    'poli', 'vibe', 'kidu', 'mass', 'super', 'adipoli', 'thara', 'jolly', 'chumma', 'fire',
    'खुशी', 'प्यार', 'करुणा', 'दया', 'शांति', 'कृतज्ञता', 'उपचार', 'प्रकाश', 'आशीर्वाद', 'आशा',
    'banger', 'lit', 'vibe', 'slay', 'fire', 'epic', 'boss', 'dil-se-dil', 'mast', 'jhakaas'
  ];
  const negativeAuraWords = [
    'hate', 'anger', 'fear', 'sadness', 'toxic', 'dark', 'curse', 'jealousy', 'resentment', 'pain',
    'cringe', 'fake', 'shady', 'sus', 'drama', 'messy', 'mid', 'clout-chaser', 'flop', 'basic',
    'വെറുപ്പ്', 'ദേഷ്യം', 'ഭയം', 'വിഷാദം', 'വിഷമയം', 'ഇരുട്ട്', 'ശാപം', 'അസൂയ', 'പക', 'വേദന',
    'veruppu', 'deshyam', 'bhayam', 'vishadam', 'vishamayam', 'iruttu', 'shapam', 'asooya', 'paka', 'vedana',
    'thallu', 'bakwas', 'cringe', 'vatt', 'drama', 'kuzhappam', 'mid', 'fake', 'shady', 'sus',
    'नफरत', 'गुस्सा', 'डर', 'उदासी', 'विषाक्त', 'अंधेरा', 'शाप', 'ईर्ष्या', 'द्वेष', 'दर्द',
    'cringe', 'fake', 'shady', 'sus', 'drama', 'mess', 'mid', 'flop', 'basic', 'salty'
  ];

  const textLower = text.toLowerCase().normalize('NFKC');
  const positiveWordCount = positiveAuraWords.reduce((count, word) => {
    return count + (textLower.includes(word.toLowerCase().normalize('NFKC')) ? 1 : 0);
  }, 0);
  const negativeWordCount = negativeAuraWords.reduce((count, word) => {
    return count + (textLower.includes(word.toLowerCase().normalize('NFKC')) ? 1 : 0);
  }, 0);

  let auraPoints = sentimentScore * 10;
  auraPoints += positiveWordCount * 15;
  auraPoints -= negativeWordCount * 15;
  auraPoints = Math.max(-100, Math.min(100, Math.round(auraPoints)));
  return auraPoints;
}

// Aura visualization function with meme GIF and random content
function visualizeAura(auraPoints, username) {
  let color, description, chakra, genZVibe, meme, quote, flair;
  const auraType = auraPoints > 0 ? 'positive' : auraPoints === 0 ? 'neutral' : 'negative';
  const memePool = auraType === 'positive' ? positiveMemes : auraType === 'neutral' ? neutralMemes : negativeMemes;
  meme = memePool[Math.floor(Math.random() * memePool.length)];
  quote = randomQuotes[auraType][Math.floor(Math.random() * randomQuotes[auraType].length)];
  flair = multilingualFlair[auraType][Math.floor(Math.random() * multilingualFlair[auraType].length)];

  if (auraPoints > 50) {
    color = 'golden';
    description = `A radiant ${color} aura pulses around ${username}, shimmering with cosmic vibes. It flows from the crown chakra, pure bliss!`;
    chakra = 'crown chakra';
    genZVibe = 'main-character energy, serving iconic looks!';
  } else if (auraPoints > 0) {
    color = 'blue';
    description = `A soothing ${color} aura surrounds ${username}, rippling with tranquility. It glows from the third-eye chakra, uplifting and serene.`;
    chakra = 'third-eye chakra';
    genZVibe = 'vibe-check passed, aesthetic energy!';
  } else if (auraPoints === 0) {
    color = 'white';
    description = `A neutral ${color} aura encircles ${username}, balanced with subtle swirls. It resonates from the heart chakra, calm and chill.`;
    chakra = 'heart chakra';
    genZVibe = 'lowkey chill, no drama.';
  } else if (auraPoints > -50) {
    color = 'grey';
    description = `A misty ${color} aura clings to ${username}, heavy with faint dissonance. It stirs around the throat chakra, needing clarity.`;
    chakra = 'throat chakra';
    genZVibe = 'giving side-eye, slightly off-brand.';
  } else {
    color = 'black';
    description = `A shadowy ${color} aura envelops ${username}, thick with low-vibe energy. It swirls around the root chakra, craving a cleanse.`;
    chakra = 'root chakra';
    genZVibe = 'big-yikes energy, total vibe-killer.';
  }

  return {
    embed: new EmbedBuilder()
      .setTitle(`${username}'s Aura Visualization 🌌`)
      .setDescription(`${description}\n\n**Chakra Alignment**: ${chakra}\n**Gen Z Vibe**:nobyl

System: **Gen Z Vibe**: ${genZVibe}\n**Vibe Quote**: ${quote}\n**Multilingual Flair**: ${flair}`)
      .setColor(getEmbedColor(color))
      .setImage(meme.url)
      .setFooter({ text: meme.caption })
      .setTimestamp()
  };
}

// Helper function to assign Discord embed colors
function getEmbedColor(auraColor) {
  const colorMap = {
    golden: 0xFFD700,
    blue: 0x00B7EB,
    white: 0xFFFFFF,
    grey: 0x808080,
    black: 0x2F3136
  };
  return colorMap[auraColor] || 0x00B7EB;
}

// Bot ready event
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerSlashCommands();
  client.user.setPresence({
    activities: [{ name: 'Aura Vibes', type: ActivityType.Watching }],
    status: 'online'
  });
});

// Interaction event
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: 'An error occurred!', ephemeral: true });
  }
});

// Message event: Process aura for non-command messages
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content) return;
  const userId = message.author.id;
  const username = message.author.username;
  const text = message.content;

  try {
    const messageAuraPoints = calculateSpiritualAuraPoints(text);
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({
        userId,
        username,
        auraPoints: messageAuraPoints,
        messageCount: 1
      });
    } else {
      const newMessageCount = user.messageCount + 1;
      user.auraPoints = Math.round(
        (user.auraPoints * user.messageCount + messageAuraPoints) / newMessageCount
      );
      user.messageCount = newMessageCount;
      user.username = username;
      user.lastUpdated = Date.now();
    }
    await user.save();
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);