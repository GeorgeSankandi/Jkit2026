// models/Counter.js
const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

CounterSchema.statics.getNextSequenceValue = async function(sequenceName) {
    const counter = await this.findByIdAndUpdate(
        sequenceName,
        { $inc: { seq: 1 } },
        { new: true, upsert: true, runValidators: true }
    );
    return counter.seq;
};

module.exports = mongoose.model('Counter', CounterSchema);