const mongoose = require('mongoose');

const AgencySchema = new mongoose.Schema({
    agencyId: { type: String, required: true, unique: true },
    name: String,
    description: String,
    owner: String, // username of agent
    imagePath: { type: String, default: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=600' },
    members: [String], // array of usernames
    type: String,
    services: { type: Map, of: Number },
    location: String, // <-- NEW
    isVerified: { type: Boolean, default: false }, // <-- NEW
});

module.exports = mongoose.model('Agency', AgencySchema);
