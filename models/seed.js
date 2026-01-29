require('dotenv').config();
const mongoose = require('mongoose');
const seedData = require('./utils/seedData');

// --- Models ---
const User = require('./models/User');
const Profile = require('./models/Profile');
const Job = require('./models/Job');
const Agency = require('./models/Agency');
const JobCategory = require('./models/JobCategory');
const Message = require('./models/Message');
const Like = require('./models/Like');
const AgencyRequest = require('./models/AgencyRequest');
const { EventLog } = require('./models/EventLog');
const Notification = require('./models/Notification');
const Follower = require('./models/Follower');
const NewsArticle = require('./models/NewsArticle');
const TimelineEvent = require('./models/TimelineEvent');
const Counter = require('./models/Counter');
const Rating = require('./models/Rating'); // <-- NEW

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jkit-db';
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 30000 // Give it 30 seconds to connect
        });
        console.log('MongoDB Connected for seeding...');

        // Clear all existing data
        console.log('Clearing existing data...');
        await User.deleteMany();
        await Profile.deleteMany();
        await Job.deleteMany();
        await Agency.deleteMany();
        await JobCategory.deleteMany();
        await Message.deleteMany();
        await Like.deleteMany();
        await AgencyRequest.deleteMany();
        await EventLog.deleteMany();
        await Notification.deleteMany();
        await Follower.deleteMany();
        await NewsArticle.deleteMany();
        await TimelineEvent.deleteMany();
        await Counter.deleteMany();
        await Rating.deleteMany(); // <-- NEW
        console.log('Data cleared.');

        // Insert new data
        console.log('Inserting seed data...');
        await User.insertMany(Object.values(seedData.users));
        await Profile.insertMany(Object.values(seedData.profiles));
        await Job.insertMany(Object.values(seedData.jobs));
        await Agency.insertMany(Object.values(seedData.agencies));
        await JobCategory.insertMany(seedData.jobCategoryData);

        // --- Initialize Counters based on inserted users ---
        // Count how many of each JIN type we just inserted so the next user starts at the correct number
        const users = Object.values(seedData.users);
        let agentCount = 0;
        let workerTalentCount = 0;
        let employerCount = 0;

        users.forEach(u => {
            if (u.type === 'Agent') agentCount++;
            else if (u.type === 'Worker' || u.type === 'Talent') workerTalentCount++;
            else if (u.type === 'Employer') employerCount++;
        });

        // Create the counters. The User model looks for 'jin_PREFIX'.
        if (agentCount > 0) {
            await Counter.create({ _id: 'jin_A-JIN', seq: agentCount });
        }
        if (workerTalentCount > 0) {
            await Counter.create({ _id: 'jin_I-JIN', seq: workerTalentCount });
        }
        if (employerCount > 0) {
            await Counter.create({ _id: 'jin_B-JIN', seq: employerCount }); // Assuming B-JIN for default seed employers
        }

        console.log('Seed data inserted and counters initialized successfully.');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        // Disconnect from the database
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
};

// Run the seed function
seedDatabase();