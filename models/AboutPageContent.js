const mongoose = require('mongoose');

// Sub-schema for repeatable items with an icon, title, and description
const GridItemSchema = new mongoose.Schema({
    _id: false,
    icon: { type: String, default: 'fas fa-star' },
    title: { type: String, default: 'New Item' },
    description: { type: String, default: 'Description for the new item.' },
});

// Sub-schema for the "Who We Serve" section
const AudienceItemSchema = new mongoose.Schema({
    _id: false,
    icon: { type: String, default: 'fas fa-user' },
    title: { type: String, default: 'New Audience' },
    points: [String]
});

const AboutPageContentSchema = new mongoose.Schema({
    // Using a singleton pattern to ensure only one document of this type exists
    singleton: { type: Boolean, default: true, unique: true },

    tagline: String,
    story: {
        title: String,
        paragraphs: [String],
        image1: String,
        image2: String,
        image3: String,
        image4: String,
    },
    vision: {
        title: String,
        text: String,
    },
    mission: {
        title: String,
        points: [String],
    },
    values: {
        title: String,
        items: [GridItemSchema],
    },
    howItWorks: {
        title: String,
        items: [GridItemSchema],
    },
    problemSolution: {
        problemTitle: String,
        problemPoints: [String],
        solutionTitle: String,
        solutionPoints: [String],
    },
    whoWeServe: {
        title: String,
        items: [AudienceItemSchema],
    },
    cta: {
        title: String,
        text: String,
    }
});

module.exports = mongoose.model('AboutPageContent', AboutPageContentSchema);