// models/ImportantEvent.js
const mongoose = require('mongoose');

const ImportantEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    location: String,
    link: String,
    imagePath: { type: String, default: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600' },
    postedBy: { type: String, required: true } // <-- NEW
});

module.exports = mongoose.model('ImportantEvent', ImportantEventSchema);