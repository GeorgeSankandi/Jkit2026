const mongoose = require('mongoose');

const AgencyRequestSchema = new mongoose.Schema({
    requestId: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true },
    username: { type: String, required: true }, // Username of the worker requesting to join
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now }
});

// Ensure a user can only have one pending request per agency
AgencyRequestSchema.index({ agencyId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model('AgencyRequest', AgencyRequestSchema);