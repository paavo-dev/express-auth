const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  media: { type: String }, // URL for the uploaded media (image/video)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', postSchema);
