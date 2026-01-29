// models/NewsArticle.js
const mongoose = require('mongoose');

const NewsArticleSchema = new mongoose.Schema({
    articleId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    imagePath: { 
        type: String, 
        default: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600' 
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// FIX: Auto-generate articleId before saving for new documents
NewsArticleSchema.pre('save', function(next) {
    if (this.isNew && !this.articleId) {
        // Generate a simple, unique ID based on a timestamp
        this.articleId = `news_${Date.now()}`;
    }
    next();
});

module.exports = mongoose.model('NewsArticle', NewsArticleSchema);