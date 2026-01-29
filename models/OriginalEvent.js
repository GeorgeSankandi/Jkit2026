// models/OriginalEvent.js
const mongoose = require('mongoose');

const OriginalEventSchema = new mongoose.Schema({
    originalEventId: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    date: {
        type: Date,
        required: true
    },
    imagePath: {
        type: String,
        default: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    postedBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Auto-generate originalEventId before saving
OriginalEventSchema.pre('save', function(next) {
    if (this.isNew && !this.originalEventId) {
        this.originalEventId = `orig_event_${Date.now()}`;
    }
    next();
});

const OriginalEvent = mongoose.model('OriginalEvent', OriginalEventSchema);

module.exports = OriginalEvent;