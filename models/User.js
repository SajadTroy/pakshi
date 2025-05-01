const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Discord user ID
  username: { type: String, required: true }, // Discord username
  auraPoints: { type: Number, default: 0 }, // Current aura points (-100 to +100)
  messageCount: { type: Number, default: 0 }, // Number of messages processed
  lastUpdated: { type: Date, default: Date.now } // Last aura update timestamp
});

module.exports = mongoose.model('User', userSchema);