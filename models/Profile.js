const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  bio: { type: String, default: 'No bio set.' },
  followerCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Profile', profileSchema);