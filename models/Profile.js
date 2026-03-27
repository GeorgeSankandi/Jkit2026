const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    fullName: String,
    bio: String,
    skills: [String],
    avatarPath: { type: String, default: '' }, // MODIFICATION: Changed default from pravatar URL to empty string
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
    isVerified: { type: Boolean, default: false }, // <-- NEW
});

module.exports = mongoose.model('Profile', ProfileSchema);