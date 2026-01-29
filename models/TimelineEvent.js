const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
    timelineEventId: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: [true, 'Please provide a title for the timeline event.'],
    },
    description: {
        type: String,
        required: [true, 'Please provide a description.'],
    },
    date: {
        type: Date,
        required: [true, 'Please specify the date of the event.'],
    },
    imagePath: {
        type: String,
        default: ''
    },
    postedBy: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

// Auto-generate timelineEventId before saving
timelineEventSchema.pre('save', function(next) {
    if (this.isNew && !this.timelineEventId) {
        this.timelineEventId = `tl_event_${Date.now()}`;
    }
    next();
});

const TimelineEvent = mongoose.model('TimelineEvent', timelineEventSchema);

module.exports = TimelineEvent;