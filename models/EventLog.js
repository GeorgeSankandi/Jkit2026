// models/EventLog.js
const mongoose = require('mongoose');

// It's a best practice to define event types as constants.
const EVENT_TYPES = [
    'USER_SIGNUP',
    'USER_LOGIN',
    'USER_LOGOUT',
    'JOB_CREATED',
    'JOB_STATUS_UPDATED',
    'JOB_DELETED',
    'PROFILE_UPDATED',
    'AGENCY_CREATED',
    'AGENCY_UPDATED',
    'AGENCY_JOIN_REQUEST_SENT',
    'AGENCY_JOIN_REQUEST_ACCEPTED',
    'AGENCY_JOIN_REQUEST_REJECTED',
    'USER_DELETED_BY_ADMIN',
    'PASSWORD_RESET_TRIGGERED',
    'USER_ACCOUNT_DELETED',
    'USER_ACCOUNT_VERIFIED', // <-- NEW EVENT TYPE
    'JOB_APPLICATION_RECEIVED', // <-- NEW
    'JOB_FAVORITED', // <-- NEW
    'JOB_LIKED', // <-- NEW
    'JOB_DISLIKED', // <-- NEW
    'NEWS_ARTICLE_LIKED',
    'NEWS_ARTICLE_DISLIKED',
    'NEWS_ARTICLE_FAVORITED',
    'CONTACT_FORM_SUBMISSION' // <-- NEW
];

const EventLogSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        enum: EVENT_TYPES
    },
    actorUsername: {
        type: String,
        required: true,
        index: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    target: {
        id: { type: String },
        model: { type: String },
    },
    context: {
        ipAddress: { type: String },
        userAgent: { type: String }
    }
}, {
    timestamps: true
});

const EventLog = mongoose.model('EventLog', EventLogSchema);

module.exports = { EventLog, EVENT_TYPES };