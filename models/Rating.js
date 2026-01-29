const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
    jobId: { type: String, required: true, index: true },
    ratedUsername: { type: String, required: true, index: true }, // The worker/talent
    raterUsername: { type: String, required: true, index: true }, // The employer/client
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 }
}, {
    timestamps: true
});

// Ensure a user can only rate a specific job once
RatingSchema.index({ jobId: 1, raterUsername: 1 }, { unique: true });

module.exports = mongoose.model('Rating', RatingSchema);