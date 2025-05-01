require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
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

// Aura calculation function
function calculateSpiritualAuraPoints(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return 0; // Neutral aura for empty/invalid input
  }

  const sentiment = new Sentiment();
  const result = sentiment.analyze(text);
  const sentimentScore = result.score;

  // Expanded spiritual and Gen Z aura keywords
  const positiveAuraWords = [
    // Spiritual positive terms
    'joy', 'love', 'compassion', 'kindness', 'peace', 'gratitude', 'healing', 'light', 'blessing', 'hope',
    'serenity', 'divine', 'harmony', 'wisdom', 'empathy', 'grace', 'radiance', 'tranquility', 'unity', 'forgiveness',
    'inspiration', 'clarity', 'purity', 'zen', 'soulful', 'uplifting', 'sacred', 'bliss', 'devotion', 'awe',
    // Gen Z positive slang
    'slay', 'vibes', 'iconic', 'real', 'authentic', 'queen', 'king', 'stan', 'inspo', 'bussin',
    'fire', 'lit', 'goat', 'legend', 'vibe', 'glow', 'energy', 'main-character', 'pop-off', 'bet',
    'fam', 'hype', 'drip', 'snack', 'yass', 'secure-the-bag', 'on-fleek', 'extra', 'thriving', 'w'
  ];
  const negativeAuraWords = [
    // Spiritual negative terms
    'hate', 'anger', 'fear', 'sadness', 'toxic', 'dark', 'curse', 'jealousy', 'resentment', 'pain',
    'malice', 'dread', 'spite', 'grudge', 'sorrow', 'despair', 'negativity', 'bitterness', 'torment', 'envy',
    'chaos', 'disharmony', 'anguish', 'vile', 'gloom', 'misery', 'wrath', 'deceit', 'suffering', 'doom',
    // Gen Z negative slang
    'cringe', 'fake', 'shady', 'sus', 'drama', 'messy', 'mid', 'clout-chaser', 'flop', 'basic',
    'salty', 'pressed', 'lame', 'ratio', 'cap', 'no-cap', 'ghosted', 'canceled', 'tea-spiller', 'try-hard',
    'extra-in-a-bad-way', 'lowkey-toxic', 'vibe-killer', 'problematic', 'red-flag', 'ick', 'overrated', 'done'
  ];

  // Count aura-related words
  const textLower = text.toLowerCase();
  const positiveWordCount = positiveAuraWords.reduce((count, word) => {
    return count + (textLower.includes(word) ? 1 : 0);
  }, 0);
  const negativeWordCount = negativeAuraWords.reduce((count, word) => {
    return count + (textLower.includes(word) ? 1 : 0);
  }, 0);

  // Calculate aura points
  let auraPoints = sentimentScore * 10; // Base: -50 to +50
  auraPoints += positiveWordCount * 15; // +15 per positive word
  auraPoints -= negativeWordCount * 15; // -15 per negative word
  auraPoints = Math.max(-100, Math.min(100, Math.round(auraPoints)));

  return auraPoints;
}

// Bot ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Message event: Process aura for non-command messages and handle ;aura command
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

      message.reply(
        `**${targetUser.username}'s Aura**\n` +
        `Aura Points: ${targetUserData.auraPoints}\n` +
        `Vibe: ${auraDescription}\n` +
        `Messages Analyzed: ${targetUserData.messageCount}`
      );
      return; // Skip aura analysis for ;aura command
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