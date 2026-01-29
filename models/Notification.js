const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipientUsername: { type: String, required: true, index: true },
    message: { type: String, required: true },
    link: { type: String, default: '#' }, // A link for the notification to lead to
    isRead: { type: Boolean, default: false }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Notification', NotificationSchema);