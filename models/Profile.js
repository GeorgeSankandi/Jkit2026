const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    fullName: String,
    bio: String,
    skills: [String],
    avatarPath: { type: String, default: '' },
    phone: String,
    email: String,
    linkedin: String,
    facebook: String,
    instagram: String,
    x_twitter: String,
    tiktok: String,
    whatsapp: String,
    galleryImagePaths: [String],
    services: { type: Map, of: Number },
    cvPath: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    location: { type: String, default: '' },
    // --- RATING FIELDS ---
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Profile', ProfileSchema);