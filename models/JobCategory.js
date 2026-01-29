// models/JobCategory.js

const mongoose = require('mongoose');

const JobCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    types: [String],
    jobs: [{
        name: String,
        imagePath: { type: String, default: '' }
    }],
    imagePath: { type: String, default: '' },
    useCategoryDefaultImage: { type: Boolean, default: true } // <-- NEW FIELD
});

module.exports = mongoose.model('JobCategory', JobCategorySchema);