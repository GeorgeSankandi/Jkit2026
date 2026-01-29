const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    likedItems: [String], // Thumbs up
    dislikedItems: [String], // Thumbs down
    favoritedItems: [String] // Heart icon
});

module.exports = mongoose.model('Like', LikeSchema);