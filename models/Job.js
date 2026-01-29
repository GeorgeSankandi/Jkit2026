const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    jobId: { type: String, required: true, unique: true },
    title: String,
    description: String,
    category: String,
    jobType: { type: String, enum: ['Formal Job', 'Informal Job', 'Talent Gig'], required: true },
    location: String,
    price: Number,
    payRate: { type: String, enum: ['per hour', 'per day', 'per week', 'per month', 'once-off'], default: 'once-off' },
    duration: String,
    dueDate: Date,
    postedBy: String, // username of employer/agent
    assignedTo: { type: String, default: null },
    imagePath: { type: String, default: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600' },
    // MODIFICATION: Added 'in-progress' status
    status: { type: String, enum: ['open', 'assigned', 'in-progress', 'closed'], default: 'open' },
    maxPeople: { type: Number, default: 1 },
    applicants: { type: [String], default: [] } // <-- NEW
});

module.exports = mongoose.model('Job', JobSchema);