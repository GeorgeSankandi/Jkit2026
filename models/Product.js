const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    category: String,
    price: { type: Number, required: true },
    images: [{ type: String }], // Array of up to 5 image paths
    postedBy: { type: String, required: true, index: true }, // username of the seller
    status: { type: String, enum: ['available', 'sold'], default: 'available' },
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);