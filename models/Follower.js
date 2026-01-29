// models/Follower.js
const mongoose = require('mongoose');

const FollowerSchema = new mongoose.Schema({
    // The user who is being followed
    user: { 
        type: String, // username
        required: true,
        index: true 
    },
    // The user who is doing the following
    follower: { 
        type: String, // username
        required: true,
        index: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// A user can only follow another user once.
FollowerSchema.index({ user: 1, follower: 1 }, { unique: true });

module.exports = mongoose.model('Follower', FollowerSchema);