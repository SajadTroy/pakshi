const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likers: [{ type: String }],
  dislikes: { type: Number, default: 0 }, 
  dislikers: [{ type: String }], 
  hashtags: [{ type: String }], 
  attachments: [{ url: String, contentType: String }],
});

module.exports = mongoose.model('Post', postSchema);