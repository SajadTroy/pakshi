const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema({
  followerId: { type: String, required: true },
  followingId: { type: String, required: true },
});

module.exports = mongoose.model('Follower', followerSchema);