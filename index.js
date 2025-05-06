require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const Sentiment = require('sentiment');
const User = require('./models/User');

// Initialize Discord client with necessary intents
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

// Define /help slash command
const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Learn how to use the Aura Bot and its commands.');

client.commands.set(helpCommand.name, {
  data: helpCommand,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🌌 Aura Bot Help')
      .setDescription(
        'The Aura Bot calculates and visualizes your spiritual and Gen Z aura based on your chat messages in English, Malayalam, Manglish, and Hindi. Your aura reflects your vibe, personality, and energy, stored as aura points (-100 to +100).'
      )
      .addFields(
        {
          name: 'Commands',
          value: `
            **/help** - Show this help message.
            **;aura @user** - Check a user's aura points and vibe (e.g., ;aura @JohnDoe).
            **;visualize @user** - Visualize a user's aura with chakra alignment and multilingual flair (e.g., ;visualize @JohnDoe).
          `
        },
        {
          name: 'How Aura Works',
          value: 'Aura points are calculated from your messages using sentiment analysis and keywords (e.g., "santhosham," "खुशी," "vibe-check"). Positive words (+15 points) and negative words (-15 points) shape your aura, smoothed over time.'
        },
        {
          name: 'Visualization',
          value: 'The ;visualize command describes your aura as a glowing energy field, tied to a chakra (e.g., crown for positive vibes, root for negative). It includes Gen Z slang and multilingual vibes (e.g., "poli," "mast").'
        },
        {
          name: 'Languages Supported',
          value: 'English, Malayalam (സന്തോഷം), Manglish (santhosham), Hindi (खुशी). Use spiritual or Gen Z terms to influence your aura!'
        }
      )
      .setColor(0x00B7EB)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerSlashCommands() {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // Global commands
      { body: [helpCommand.toJSON()] }
    );
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

// Aura calculation function with multilingual keywords
function calculateSpiritualAuraPoints(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return 0; // Neutral aura for empty/invalid input
  }

  const sentiment = new Sentiment();
  const result = sentiment.analyze(text);
  const sentimentScore = result.score;

  // Multilingual aura keywords (English, Malayalam, Manglish, Hindi)
  const positiveAuraWords = [
    // English spiritual terms
    'joy', 'love', 'compassion', 'kindness', 'peace', 'gratitude', 'healing', 'light', 'blessing', 'hope',
    'serenity', 'divine', 'harmony', 'wisdom', 'empathy', 'grace', 'radiance', 'tranquility', 'unity', 'forgiveness',
    'inspiration', 'clarity', 'purity', 'zen', 'soulful', 'uplifting', 'sacred', 'bliss', 'devotion', 'awe',
    // English niche spiritual terms
    'chakra', 'cosmic', 'kundalini', 'aura', 'enlightenment', 'ascension', 'vibration', 'starseed', 'manifest', 'aligned',
    'third-eye', 'satori', 'nirvana', 'prana', 'shakti', 'etheric', 'astral', 'divinity', 'samadhi', 'lightworker',
    'kismet', 'synchronicity', 'arcane', 'mystic', 'esoteric',
    // English Gen Z slang
    'slay', 'vibes', 'iconic', 'real', 'authentic', 'queen', 'king', 'stan', 'inspo', 'bussin',
    'fire', 'lit', 'goat', 'legend', 'vibe', 'glow', 'energy', 'main-character', 'pop-off', 'bet',
    'fam', 'hype', 'drip', 'snack', 'yass', 'secure-the-bag', 'on-fleek', 'extra', 'thriving', 'w',
    // English niche Gen Z slang
    'sksksk', 'periodt', 'vibe-check', 'and-i-oop', 'tea', 'serving', 'looks', 'snatched', 'big-yikes', 'slaps',
    'no-skip', 'giving-life', 'mood', 'aesthetic', 'lowkey-w', 'highkey-iconic', 'bop', 'it-hits-different', 'chef-kiss', 'sheesh',
    // Malayalam spiritual/emotional terms
    'സന്തോഷം', 'സ്നേഹം', 'കരുണ', 'ദയ', 'സമാധാനം', 'നന്ദി', 'രോഗശാന്തി', 'വെളിച്ചം', 'ആശീർവാദം', 'പ്രതീക്ഷ',
    'ശാന്തി', 'ദൈവിക', 'ഐക്യം', 'ജ്ഞാനം', 'സഹാനുഭൂതി', 'കൃപ', 'തേജസ്സ്', 'നിശ്ചലത', 'ഏകത', 'ക്ഷമ',
    'ആത്മാവ്', 'നന്മ', 'വിശുദ്ധി', 'പ്രചോദനം', 'വിമോചനം',
    // Malayalam niche spiritual terms
    'ചക്രം', 'ബ്രഹ്മാണ്ഡം', 'കുണ്ഡലിനി', 'ഓറ', 'മോക്ഷം', 'ആരോഹണം', 'സ്പന്ദനം', 'നക്ഷത്രബീജം', 'പ്രകടനം', 'സമന്വയം',
    'നെറ്റിചക്രം', 'നിർവാണം', 'പ്രാണൻ', 'ശക്തി', 'നീലാകാശം', 'നക്ഷത്രലോകം', 'ദിവ്യത', 'സമാധി', 'വെളിച്ചപ്രവർത്തകൻ',
    // Manglish spiritual/emotional terms
    'santhosham', 'sneham', 'karuna', 'daya', 'samadhanam', 'nandi', 'rogashanthi', 'velicham', 'ashirvad', 'pratheeksha',
    'shanthi', 'daivika', 'aikyam', 'jnanam', 'sahanubhuthi', 'kripa', 'tejas', 'nishchalatha', 'ekatha', 'kshama',
    'athma', 'nanma', 'vishudhi', 'prachodanam', 'vimochanam',
    // Manglish niche spiritual terms
    'chakram', 'brahmandam', 'kundalini', 'aura', 'moksham', 'aarohanam', 'spandanam', 'nakshatrabeejam', 'praktanam', 'samanwayam',
    'netti-chakram', 'nirvanam', 'pranan', 'shakthi', 'neelakasham', 'nakshatralokam', 'divyatha', 'samadhi', 'velichapravarthakan',
    // Manglish Gen Z slang
    'poli', 'vibe', 'kidu', 'mass', 'super', 'adipoli', 'thara', 'jolly', 'chumma', 'fire',
    'litty', 'goat', 'epic', 'slay', 'onnu-onnu', 'pinnallae', 'katta', 'vibes', 'thirichu', 'nalla',
    // Hindi spiritual/emotional terms
    'खुशी', 'प्यार', 'करुणा', 'दया', 'शांति', 'कृतज्ञता', 'उपचार', 'प्रकाश', 'आशीर्वाद', 'आशा',
    'शान्ति', 'दिव्य', 'एकता', 'ज्ञान', 'सहानुभूति', 'कृपा', 'तेज', 'निश्चलता', 'सामंजस्य', 'क्षमा',
    'आत्मा', 'सद्भाव', 'पवित्रता', 'प्रेरणा', 'मुक्ति',
    // Hindi niche spiritual terms
    'चक्र', 'ब्रह्मांडीय', 'कुंडलिनी', 'आभा', 'मोक्ष', 'उत्थान', 'कंपन', 'नक्षत्रबीज', 'प्रकटीकरण', 'संनाद',
    'तृतीय-नेत्र', 'निर्वाण', 'प्राण', 'शक्ति', 'आकाशीय', 'नक्षत्रलोक', 'दिव्यता', 'समाधि', 'प्रकाशकर्मी',
    // Hindi Gen Z slang
    'banger', 'lit', 'vibe', 'slay', 'fire', 'epic', 'boss', 'dil-se-dil', 'mast', 'jhakaas',
    'dhamaka', 'fatafati', 'zabardast', 'killer', 'on-point', 'desi-swag', 'bawaal', 'sahi', 'full-on', 'tadka'
  ];
  const negativeAuraWords = [
    // English spiritual terms
    'hate', 'anger', 'fear', 'sadness', 'toxic', 'dark', 'curse', 'jealousy', 'resentment', 'pain',
    'malice', 'dread', 'spite', 'grudge', 'sorrow', 'despair', 'negativity', 'bitterness', 'torment', 'envy',
    'chaos', 'disharmony', 'anguish', 'vile', 'gloom', 'misery', 'wrath', 'deceit', 'suffering', 'doom',
    // English niche spiritual terms
    'stagnation', 'karmic-debt', 'shadow', 'blockage', 'lower-vibration', 'discord', 'hex', 'jinx', 'malevolent', 'haunted',
    'eclipsed', 'astral-trap', 'soul-drain', 'void', 'dissonance', 'baneful', 'obscured', 'tainted', 'unaligned', 'cursed',
    // English Gen Z slang
    'cringe', 'fake', 'shady', 'sus', 'drama', 'messy', 'mid', 'clout-chaser', 'flop', 'basic',
    'salty', 'pressed', 'lame', 'ratio', 'cap', 'no-cap', 'ghosted', 'canceled', 'tea-spiller', 'try-hard',
    'extra-in-a-bad-way', 'lowkey-toxic', 'vibe-killer', 'problematic', 'red-flag', 'ick', 'overrated', 'done',
    // English niche Gen Z slang
    'oop', 'flopped', 'giving-ick', 'big-yikes', 'tea-spilled', 'ratioed', 'delulu', 'situationship', 'fumbled', 'zesty',
    'unserious', 'not-the-vibe', 'off-brand', 'giving-side-eye', 'cooked', 'out-of-pocket', 'no-maam', 'left-on-read', 'tragic', 'skipped',
    // Malayalam spiritual/emotional terms
    'വെറുപ്പ്', 'ദേഷ്യം', 'ഭയം', 'വിഷാദം', 'വിഷമയം', 'ഇരുട്ട്', 'ശാപം', 'അസൂയ', 'പക', 'വേദന',
    'ദുരുദ്ദേശ്യം', 'ഭീതി', 'നിന്ദ', 'പിണക്കം', 'ദുഃഖം', 'നിരാശ', 'നെഗറ്റിവിറ്റി', 'കയ്പ്', 'പീഡനം', 'ഈർഷ്യ',
    'കുഴപ്പം', 'അസന്തുലിത', 'വ്യഥ', 'നീചം', 'ഗ്ലൂം', 'ദുരിതം', 'ക്രോധം', 'വഞ്ചന', 'കഷ്ടപ്പാട്', 'വിനാശം',
    // Malayalam niche spiritual terms
    'നിശ്ചലത', 'കർമ്മബാധ', 'നിഴൽ', 'തടസ്സം', 'താഴ്ന്ന-സ്പന്ദനം', 'വിയോജിപ്പ്', 'ശാപഗ്രസ്ത', 'ദോഷം', 'ദുഷ്ട', 'പേടിസ്വപ്നം',
    'ഗ്രഹണം', 'നക്ഷത്ര-കെണി', 'ആത്മ-നാശം', 'ശൂന്യത', 'വിസന്തുലനം', 'നിന്ദനീയം', 'മങ്ങിയ', 'മലിനം', 'വിട്ടുപോകൽ', 'ശപിക്കപ്പെട്ട',
    // Manglish spiritual/emotional terms
    'veruppu', 'deshyam', 'bhayam', 'vishadam', 'vishamayam', 'iruttu', 'shapam', 'asooya', 'paka', 'vedana',
    'duruddeshyam', 'bheethi', 'ninda', 'pinakkam', 'dukham', 'nirasha', 'negativity', 'kaipp', 'peedanam', 'irshya',
    'kuzhappam', 'asanthulitha', 'vyatha', 'neecham', 'gloom', 'duritham', 'krodham', 'vanchanam', 'kashtapad', 'vinasham',
    // Manglish niche spiritual terms
    'nishchalatha', 'karmabhaada', 'nizhal', 'thadassam', 'thaazhnna-spandanam', 'viyojipp', 'shapagrasta', 'dosham', 'dushta', 'pediswapnam',
    'grahanam', 'nakshatrakeni', 'athmanasham', 'shoonyatha', 'visanthulanam', 'nindaneeyam', 'mangiya', 'malinam', 'vittupokkal', 'shapikkapetta',
    // Manglish Gen Z slang
    'thallu', 'bakwas', 'cringe', 'vatt', 'drama', 'kuzhappam', 'mid', 'fake', 'shady', 'sus',
    'chali', 'venda', 'lame', 'flop', 'bore', 'irritating', 'over', 'no-way', 'chumma-vatt', 'pottan',
    // Hindi spiritual/emotional terms
    'नफरत', 'गुस्सा', 'डर', 'उदासी', 'विषाक्त', 'अंधेरा', 'शाप', 'ईर्ष्या', 'द्वेष', 'दर्द',
    'दुर्भावना', 'भय', 'निंदा', 'मनमुटाव', 'दुख', 'निराशा', 'नकारात्मकता', 'कटुता', 'यातना', 'द्वेष',
    'अराजकता', 'असामंजस्य', 'पीड़ा', 'नीच', 'उदासीनता', 'दुरिता', 'क्रोध', 'धोखा', 'कष्ट', 'विनाश',
    // Hindi niche spiritual terms
    'ठहराव', 'कर्म-ऋण', 'छाया', 'रुकावट', 'निम्न-कंपन', 'विसंगति', 'हैक्स', 'जinx', 'दुष्ट', 'भूतिया',
    'ग्रहण', 'नक्षत्र-जाल', 'आत्म-नाश', 'शून्यता', 'असंतुलन', 'निंदनीय', 'धुंधला', 'दूषित', 'असंनाद', 'शापित',
    // Hindi Gen Z slang
    'cringe', 'fake', 'shady', 'sus', 'drama', 'mess', 'mid', 'flop', 'basic', 'salty',
    'lame', 'fail', 'boring', 'irritating', 'over', 'nope', 'chhapri', 'bakwas', 'thanda', 'ghatiya'
  ];

  // Normalize text for multilingual matching (lowercase, Unicode normalization)
  const textLower = text.toLowerCase().normalize('NFKC');

  // Count aura-related words
  const positiveWordCount = positiveAuraWords.reduce((count, word) => {
    return count + (textLower.includes(word.toLowerCase().normalize('NFKC')) ? 1 : 0);
  }, 0);
  const negativeWordCount = negativeAuraWords.reduce((count, word) => {
    return count + (textLower.includes(word.toLowerCase().normalize('NFKC')) ? 1 : 0);
  }, 0);

  // Calculate aura points
  let auraPoints = sentimentScore * 10; // Base: -50 to +50
  auraPoints += positiveWordCount * 15; // +15 per positive word
  auraPoints -= negativeWordCount * 15; // -15 per negative word
  auraPoints = Math.max(-100, Math.min(100, Math.round(auraPoints)));

  return auraPoints;
}

// Aura visualization function with multilingual flair
function visualizeAura(auraPoints, username) {
  let color, description, chakra, genZVibe, multilingualFlair;

  if (auraPoints > 50) {
    color = 'golden';
    description = `A radiant ${color} aura pulses around ${username}, shimmering with cosmic vibrations and high-vibrational energy. It flows like a divine light, emanating from the crown chakra, filled with starseed essence and pure bliss.`;
    chakra = 'crown chakra';
    genZVibe = 'main-character energy, serving highkey-iconic looks!';
    multilingualFlair = 'Radiating santhosham, खुशी, and poli vibes!';
  } else if (auraPoints > 0) {
    color = 'blue';
    description = `A soothing ${color} aura surrounds ${username}, rippling with tranquility and empathic waves. It glows softly from the third-eye chakra, carrying a serene, uplifting vibration.`;
    chakra = 'third-eye chakra';
    genZVibe = 'vibe-check passed, giving aesthetic and soulful energy!';
    multilingualFlair = 'Flowing with shanthi, शांति, and kidu energy!';
  } else if (auraPoints === 0) {
    color = 'white';
    description = `A neutral ${color} aura encircles ${username}, a balanced energy field with subtle etheric swirls. It resonates from the heart chakra, reflecting a calm, unaligned state.`;
    chakra = 'heart chakra';
    genZVibe = 'lowkey chill, just existing with no drama.';
    multilingualFlair = 'Balanced with aikyam, एकता, and nalla vibes.';
  } else if (auraPoints > -50) {
    color = 'grey';
    description = `A misty ${color} aura clings to ${username}, heavy with unaligned vibrations and faint dissonance. It stirs around the throat chakra, suggesting a need for clarity and expression.`;
    chakra = 'throat chakra';
    genZVibe = 'giving side-eye, slightly off-brand vibes.';
    multilingualFlair = 'Clouded by vishadam, उदासी, and chali energy.';
  } else {
    color = 'black';
    description = `A shadowy ${color} aura envelops ${username}, thick with karmic-debt and lower-vibration energy. It swirls chaotically around the root chakra, craving a spiritual cleanse.`;
    chakra = 'root chakra';
    genZVibe = 'big-yikes energy, total vibe-killer.';
    multilingualFlair = 'Heavy with veruppu, नफरत, and thallu vibes.';
  }

  return {
    embed: {
      title: `${username}'s Aura Visualization 🌌`,
      description: `${description}\n\n**Chakra Alignment**: ${chakra}\n**Gen Z Vibe**: ${genZVibe}\n**Multilingual Vibe**: ${multilingualFlair}`,
      color: getEmbedColor(color),
      timestamp: new Date()
    }
  };
}

// Helper function to assign Discord embed colors
function getEmbedColor(auraColor) {
  const colorMap = {
    golden: 0xFFD700, // Gold
    blue: 0x00B7EB, // Sky Blue
    white: 0xFFFFFF, // White
    grey: 0x808080, // Grey
    black: 0x2F3136 // Dark (Discord dark theme)
  };
  return colorMap[auraColor] || 0x00B7EB; // Default to blue
}

// Bot ready event: Register slash commands and set status
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerSlashCommands();

  // Set bot status to "Watching Aura"
  client.user.setPresence({
    activities: [{ name: 'Aura', type: ActivityType.Watching }],
    status: 'online'
  });
});

// Interaction event: Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing slash command:', error);
    await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
  }
});

// Message event: Process aura for non-command messages and handle prefix commands
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content) return; // Ignore bots and empty messages

  const userId = message.author.id;
  const username = message.author.username;
  const text = message.content;

  try {
    // Handle ;aura command
    if (text.startsWith(';aura')) {
      const args = text.split(' ').slice(1);
      let targetUser;

      if (args.length === 0) {
        targetUser = message.author; // Default to message author
      } else {
        const userMention = args[0].match(/^<@!?(\d+)>$/);
        if (!userMention) {
          return message.reply('Please mention a valid user (e.g., ;aura @user).');
        }
        targetUser = await message.guild.members.fetch(userMention[1]).catch(() => null);
        if (!targetUser) {
          return message.reply('User not found in this server.');
        }
        targetUser = targetUser.user;
      }

      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (!targetUserData || targetUserData.messageCount === 0) {
        return message.reply(`${targetUser.username} has no recorded aura yet.`);
      }

      // Generate aura description
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

      message.reply({
        embeds: [{
          title: `${targetUser.username}'s Aura Stats ✨`,
          description: `**Aura Points**: ${targetUserData.auraPoints}\n**Vibe**: ${auraDescription}\n**Messages Analyzed**: ${targetUserData.messageCount}`,
          color: 0x00B7EB, // Blue
          timestamp: new Date()
        }]
      });
      return; // Skip aura analysis
    }

    // Handle ;visualize command
    if (text.startsWith(';visualize')) {
      const args = text.split(' ').slice(1);
      let targetUser;

      if (args.length === 0) {
        targetUser = message.author; // Default to message author
      } else {
        const userMention = args[0].match(/^<@!?(\d+)>$/);
        if (!userMention) {
          return message.reply('Please mention a valid user (e.g., ;visualize @user).');
        }
        targetUser = await message.guild.members.fetch(userMention[1]).catch(() => null);
        if (!targetUser) {
          return message.reply('User not found in this server.');
        }
        targetUser = targetUser.user;
      }

      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (!targetUserData || targetUserData.messageCount === 0) {
        return message.reply(`${targetUser.username} has no recorded aura yet.`);
      }

      const visualization = visualizeAura(targetUserData.auraPoints, targetUser.username);
      message.reply({ embeds: [visualization.embed] });
      return; // Skip aura analysis
    }

    // Process aura for non-command messages
    const messageAuraPoints = calculateSpiritualAuraPoints(text);

    // Find or create user in database
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({
        userId,
        username,
        auraPoints: messageAuraPoints,
        messageCount: 1
      });
    } else {
      // Update aura: Weighted average to smooth fluctuations
      const newMessageCount = user.messageCount + 1;
      user.auraPoints = Math.round(
        (user.auraPoints * user.messageCount + messageAuraPoints) / newMessageCount
      );
      user.messageCount = newMessageCount;
      user.username = username; // Update username in case it changed
      user.lastUpdated = Date.now();
    }

    await user.save();
  } catch (error) {
    console.error('Error processing message:', error);
    message.reply('An error occurred while processing your aura.');
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);