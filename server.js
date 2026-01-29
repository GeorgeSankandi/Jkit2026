require('dotenv').config(); // THIS MUST BE FIRST
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const util = require('util');
const { createHandler } = require('graphql-http/lib/use/express');
const { schema, root, suggestCategory } = require('./graphql/schema');
const crypto = require('crypto');

// --- Models ---
const User = require('./models/User');
const Image = require('./models/Image');
const Profile = require('./models/Profile');
const Job = require('./models/Job');
const Agency = require('./models/Agency');
const Like = require('./models/Like');
const JobCategory = require('./models/JobCategory');
const Message = require('./models/Message');
const AgencyRequest = require('./models/AgencyRequest');
const { EventLog } = require('./models/EventLog');
const Notification = require('./models/Notification');
const Follower = require('./models/Follower');
const NewsArticle = require('./models/NewsArticle'); 
const TimelineEvent = require('./models/TimelineEvent');
const Counter = require('./models/Counter');
const Rating = require('./models/Rating'); // <-- NEW

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 8080;

// --- Socket.IO Server Setup ---
const clients = new Map();

// --- Centralized Event Logging Service ---
async function logEvent(logData) {
    const { eventType, actorUsername, details, target, context } = logData;
    try {
        const event = new EventLog({
            eventType,
            actorUsername,
            details,
            target,
            context: context || {} 
        });
        const savedEvent = await event.save();
        io.emit('event_log_created', savedEvent);
    } catch (error) {
        console.error('Failed to log event:', error);
    }
}

// --- Centralized Notification Service ---
async function sendNotification(recipientUsername, message, link = '#') {
    try {
        const notification = new Notification({
            recipientUsername,
            message,
            link
        });
        const savedNotification = await notification.save();
        const recipientSocketId = clients.get(recipientUsername);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('notification', savedNotification);
        }
    } catch (error) {
        console.error(`Failed to send notification to ${recipientUsername}:`, error);
    }
}

io.on('connection', (socket) => {
    console.log('Client connected with socket ID:', socket.id);
    socket.on('init', (username) => {
        clients.set(username, socket.id);
        console.log(`User ${username} registered with socket ID ${socket.id}. Total online: ${clients.size}`);
        socket.broadcast.emit('user_online', username);
        socket.emit('online_users', Array.from(clients.keys()));
    });
    socket.on('chat', async (data) => {
        const { sender, recipient, content } = data;
        const newMessage = new Message({ sender, recipient, content });
        await newMessage.save();
        const recipientSocketId = clients.get(recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('chat', { sender, recipient, content, timestamp: newMessage.timestamp });
        }
        socket.emit('chat', { sender, recipient, content, timestamp: newMessage.timestamp });
    });
    socket.on('disconnect', () => {
        for (let [username, socketId] of clients.entries()) {
            if (socketId === socket.id) {
                clients.delete(username);
                console.log(`User ${username} disconnected. Total online: ${clients.size}`);
                socket.broadcast.emit('user_offline', username);
                break;
            }
        }
    });
});

// --- Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
});
app.use(sessionMiddleware);

// --- Multer Configuration ---
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // LIMIT: 5MB
    fileFilter: (req, file, cb) => {
        // STRICT FILTER: Only JPG and PNG allowed
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error('Error: Only JPG and PNG image files are allowed!'));
    }
}).single('image');

const cvStorage = multer.diskStorage({
    destination: './public/uploads/cvs/',
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname.replace(/ /g, '_')}`); }
});
const uploadCv = multer({
    storage: cvStorage,
    limits: { fileSize: 10000000 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        cb('Error: Only PDF files are allowed!');
    }
}).single('cv');

// --- GraphQL AI Chatbot Endpoint ---
const gqlHandler = createHandler({ schema: schema, rootValue: root });
app.use('/graphql', (req, res, next) => {
    gqlHandler(req, res, next).catch(next);
});

// --- API Routes ---
const SETTINGS_FILE_PATH = path.join(__dirname, 'settings.json');
const ABOUT_CONTENT_FILE_PATH = path.join(__dirname, 'about-content.json');

async function getSettings() {
    try {
        await fs.access(SETTINGS_FILE_PATH);
        const settingsData = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
        return JSON.parse(settingsData);
    } catch (error) {
        return { defaultPersonAvatar: '', defaultAgencyAvatar: '' };
    }
}

async function getAboutContent() {
    try {
        await fs.access(ABOUT_CONTENT_FILE_PATH);
        const contentData = await fs.readFile(ABOUT_CONTENT_FILE_PATH, 'utf-8');
        return JSON.parse(contentData);
    } catch (error) {
        console.error("Could not read about-content.json:", error);
        return { ourStory: { paragraphs: [] }, vision: {}, mission: { items: [] }, values: { cards: [] }, problemSolution: { problem: { items: [] }, solution: { items: [] } }, whoWeServe: { audiences: [] }, ourTeam: { title: 'Our Team', members: [] }, cta: {} };
    }
}

app.post('/api/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            // Return specific error message if it's our custom file type error or size limit
            if (err.message === 'Error: Only JPG and PNG image files are allowed!' || err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: err.message === 'File too large' ? 'File size exceeds 5MB limit.' : err.message });
            }
            return res.status(500).json({ message: err.message });
        }
        if (req.file == undefined) {
            return res.status(400).json({ message: 'No file selected!' });
        }
        const filePath = req.file.path.replace('public', '');
        res.json({
            message: 'File uploaded successfully',
            filePath: filePath
        });
    });
});

app.post('/api/upload/cv', (req, res) => {
    uploadCv(req, res, (err) => {
        if (err) {
            console.error('Multer CV upload error:', err);
            return res.status(500).json({ message: err.message });
        }
        if (req.file == undefined) {
            return res.status(400).json({ message: 'No CV file selected!' });
        }
        const filePath = req.file.path.replace('public', '');
        res.json({
            message: 'CV uploaded successfully',
            filePath: filePath
        });
    });
});

app.get('/', async (req, res) => {
    try {
        const settings = await getSettings();
        const aboutContent = await getAboutContent();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dataPromises = [
            Job.find().lean(),
            Profile.find().lean(),
            Agency.find().lean(),
            JobCategory.find().lean(),
            User.find().select('-password').lean(),
            Like.find().lean(),
            AgencyRequest.find().lean(),
            Follower.find().lean(),
            NewsArticle.find().sort({ createdAt: -1 }).limit(10).lean(),
            TimelineEvent.find().sort({ date: -1 }).lean(),
            Rating.find().lean() // <-- NEW
        ];
        let notificationsPromise = Promise.resolve([]);
        let conversationsPromise = Promise.resolve([]);
        let eventLogsPromise = Promise.resolve([]);
        let allNewsArticlesForAdminPromise = Promise.resolve([]);

        if (req.session.user) {
            notificationsPromise = Notification.find({ recipientUsername: req.session.user.username }).sort({ createdAt: -1 }).limit(30).lean();
            conversationsPromise = (async () => {
                const currentUser = req.session.user.username;
                const messages = await Message.find({ $or: [{ sender: currentUser }, { recipient: currentUser }] }).sort({ timestamp: -1 }).lean();
                const conversationMap = new Map();
                messages.forEach(message => {
                    const otherUser = message.sender === currentUser ? message.recipient : message.sender;
                    if (!conversationMap.has(otherUser)) {
                        conversationMap.set(otherUser, {
                            username: otherUser,
                            lastMessage: message.content,
                            timestamp: message.timestamp
                        });
                    }
                });
                return Array.from(conversationMap.values());
            })();
            if (req.session.user.username === process.env.ADMIN_USERNAME) {
                 eventLogsPromise = EventLog.find().sort({ createdAt: -1 }).limit(100).lean();
                 allNewsArticlesForAdminPromise = NewsArticle.find().sort({ createdAt: -1 }).lean();
            }
        }
        
        dataPromises.push(notificationsPromise, conversationsPromise, eventLogsPromise, allNewsArticlesForAdminPromise);

        const [
            jobs, profiles, agencies, jobCategories, users, likes, 
            agencyRequests, followers, newsArticles, timelineEvents, ratings, // <-- NEW
            notifications, conversations, eventLogs, allNewsArticlesForAdmin
        ] = await Promise.all(dataPromises);

        // Prepare people-only profiles (exclude users with type 'Employer')
        const peopleProfiles = (profiles || []).filter(p => {
            const user = (users || []).find(u => u.username === p.username);
            return user && user.type !== 'Employer';
        });

        let currentUser = null;
        if (req.session.user) {
            const userFromDB = await User.findById(req.session.user._id).select('-password').lean();
            if (userFromDB) {
                currentUser = { ...userFromDB, isAdmin: userFromDB.username === process.env.ADMIN_USERNAME };
            }
        }
        
        res.render('index', {
            content: { 
                jobs, profiles, peopleProfiles, agencies, jobCategories, users, likes, 
                agencyRequests, followers, notifications, conversations, eventLogs,
                newsArticles: currentUser?.isAdmin ? allNewsArticlesForAdmin : newsArticles,
                timelineEvents, ratings // <-- NEW
            },
            currentUser: currentUser,
            settings: settings,
            aboutContent: aboutContent,
            process: { env: {} }
        });
    } catch (error) {
        console.error("Error fetching page data:", error);
        res.status(500).send("Server error");
    }
});

// Employers listing page
app.get('/employers', async (req, res) => {
    try {
        const settings = await getSettings();
        // Find users with type 'Employer' (case-insensitive to handle inconsistent casing)
        const employers = await User.find({ type: { $regex: '^employer$', $options: 'i' } }).select('-password').lean();
        console.log(`Found ${employers.length} employers for /employers`);
        // collect distinct business types for the employers page (e.g., 'formal','informal')
        const businessTypes = Array.from(new Set(employers.map(e => (e.businessType || 'formal').toString()))).sort();
        const employerUsernames = employers.map(u => u.username);
        const profiles = await Profile.find({ username: { $in: employerUsernames } }).lean();

        res.render('employers', {
            employers,
            profiles,
            businessTypes,
            currentUser: req.session.user || null,
            settings
        });
    } catch (error) {
        console.error('Error rendering employers page:', error);
        res.status(500).send('Server error');
    }
});

// --- Authentication Routes ---
app.post('/api/signup', async (req, res) => {
    const { username, email, cellphone, password, fullName, type, namibiaId, businessType } = req.body;
    try {
        if (username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase()) {
            const adminExists = await User.findOne({ username: new RegExp(`^${process.env.ADMIN_USERNAME}$`, 'i') });
            if (adminExists) {
                return res.status(400).json({ message: 'This username is reserved.' });
            }
        }
        
        const userExists = await User.findOne({ $or: [{ email }, { username }, { namibiaId }] });
        if (userExists) {
            let message = 'User with that email or username already exists.';
            if (userExists.namibiaId === namibiaId) {
                message = 'A user with that Namibia ID already exists.';
            }
            return res.status(400).json({ message });
        }

        // Prepare user data - include businessType if provided (for Employer type)
        const userData = { username, email, cellphone, password, fullName, type, namibiaId };
        if (type === 'Employer' && businessType) {
            userData.businessType = businessType;
        }

        const user = new User(userData);
        
        // Generate verification token before saving
        const verificationToken = user.getVerificationToken();
        await user.save(); // pre-save hook hashes password and creates J-KIT ID

        const profile = new Profile({ 
            username, 
            fullName, 
            email, 
            phone: cellphone, 
            bio: 'New user! Update your bio...', 
            skills: ['Newbie']
        });
        await profile.save();
        
        logEvent({
            eventType: 'USER_SIGNUP',
            actorUsername: username,
            details: { message: `User '${username}' created an account of type '${type}'. Awaiting verification.` },
            target: { id: username, model: 'User' }
        });
        
        io.emit('content_created', { type: 'users', data: user.toJSON() });
        io.emit('content_created', { type: 'profiles', data: profile.toJSON() });

        // Prepare data for the frontend to send the verification email
        // Use request domain in production, fallback to FRONTEND_URL if explicitly set
        let baseUrl = `${req.protocol}://${req.get('host')}`;
        if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'http://localhost:8080') {
            baseUrl = process.env.FRONTEND_URL;
        }
        const verificationUrl = `${baseUrl}/#verify?token=${verificationToken}`;

        res.status(201).json({ 
            success: true, 
            message: 'Account registered successfully! Please check your email to activate your account.',
            emailData: {
                action: 'newUserSignup', // Action for Google Apps Script router
                email: user.email,
                fullName: user.fullName,
                verificationUrl: verificationUrl,
                verificationCode: verificationToken // Use the same token as the code for simplicity
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { loginIdentifier, password } = req.body;
    try {
        const user = await User.findOne({ $or: [{ email: loginIdentifier }, { username: loginIdentifier }] });
        if (user && (await user.matchPassword(password))) {
            
            if (!user.isVerified && !user.isAdmin) {
                return res.status(403).json({
                    message: 'Your account has not been verified. Please check your email.',
                    notVerified: true,
                    email: user.email
                });
            }

            req.session.user = { _id: user._id, username: user.username, type: user.type };
            logEvent({
                eventType: 'USER_LOGIN',
                actorUsername: user.username,
                details: { message: `User '${user.username}' logged in.` }
            });
            // *** FIX: Added jkitId to the login response ***
            res.status(200).json({ 
                message: 'Logged in successfully', 
                user: { 
                    username: user.username, 
                    type: user.type, 
                    isAdmin: user.isAdmin, 
                    jkitId: user.jkitId // <-- ADDED THIS LINE
                } 
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/logout', (req, res) => {
    if (req.session.user) {
        logEvent({
            eventType: 'USER_LOGOUT',
            actorUsername: req.session.user.username,
            details: { message: `User '${req.session.user.username}' logged out.` }
        });
    }

    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Could not log out.' });
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

const protect = (req, res, next) => {
    if (req.session.user) { next(); } 
    else { res.status(401).json({ message: 'Not authorized, no session' }); }
};
const admin = async (req, res, next) => {
    if (req.session.user && req.session.user.username === process.env.ADMIN_USERNAME) { next(); } 
    else { res.status(403).json({ message: 'Not authorized as an admin' }); }
};

// --- NEW ACCOUNT VERIFICATION AND RESEND ROUTES ---
app.post('/api/users/verify-account', async (req, res) => {
    try {
        const { token } = req.body;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token.' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        
        req.session.user = { _id: user._id, username: user.username, type: user.type };

        logEvent({
            eventType: 'USER_ACCOUNT_VERIFIED',
            actorUsername: user.username,
            details: { message: `User '${user.username}' verified their account.` }
        });

        // *** FIX: Added jkitId to the verification response ***
        res.status(200).json({
            message: 'Account verified successfully. You are now logged in.',
            user: { 
                username: user.username, 
                type: user.type, 
                isAdmin: user.isAdmin,
                jkitId: user.jkitId // <-- ADDED THIS LINE
            }
        });

    } catch (error) {
        console.error('Account verification error:', error);
        res.status(500).json({ message: 'Server error during account verification.' });
    }
});

app.post('/api/users/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user && !user.isVerified) {
            const verificationToken = user.getVerificationToken();
            await user.save();
            // Use request domain in production, fallback to FRONTEND_URL if explicitly set
            let baseUrl = `${req.protocol}://${req.get('host')}`;
            if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'http://localhost:8080') {
                baseUrl = process.env.FRONTEND_URL;
            }
            const verificationUrl = `${baseUrl}/#verify?token=${verificationToken}`;

            return res.status(200).json({
                success: true,
                message: 'A new verification email has been sent. Please check your inbox.',
                emailData: {
                    action: 'newUserSignup', // Action for Google Apps Script router
                    email: user.email,
                    fullName: user.fullName,
                    verificationUrl: verificationUrl,
                    verificationCode: verificationToken // Use the same token for the code
                }
            });
        }
        
        // Generic response to prevent user enumeration
        res.status(200).json({
            success: true,
            message: 'If an account with that email exists and requires verification, a new email has been sent.'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Server error while resending verification.' });
    }
});
// --- END NEW ROUTES ---


app.post('/api/users/delete-account', protect, async (req, res) => {
    const { password } = req.body;
    const { _id, username } = req.session.user;

    if (username === process.env.ADMIN_USERNAME) {
        return res.status(403).json({ message: 'The admin account cannot be deleted.' });
    }

    try {
        const user = await User.findById(_id);
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid password. Account not deleted.' });
        }

        await User.deleteOne({ _id });
        await Profile.deleteOne({ username });
        await Like.deleteOne({ username });
        await AgencyRequest.deleteMany({ username });
        await Follower.deleteMany({ $or: [{ user: username }, { follower: username }] });
        await Job.deleteMany({ postedBy: username });
        await Message.deleteMany({ $or: [{ sender: username }, { recipient: username }] });
        await Notification.deleteMany({ recipientUsername: username });
        
        const ownedAgency = await Agency.findOne({ owner: username });
        if (ownedAgency) {
            await AgencyRequest.deleteMany({ agencyId: ownedAgency.agencyId });
            await Agency.deleteOne({ _id: ownedAgency.id });
        }
        await Agency.updateMany({}, { $pull: { members: username } });

        logEvent({
            eventType: 'USER_ACCOUNT_DELETED',
            actorUsername: username,
            details: { message: `User '${username}' permanently deleted their account.` }
        });

        io.emit('user_deleted', { username });

        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ message: 'Account deleted, but failed to log out session.' });
            }
            res.status(200).json({ message: 'Your account has been permanently deleted.' });
        });

    } catch (error) {
        console.error(`Error deleting account for ${username}:`, error);
        res.status(500).json({ message: `An error occurred during account deletion: ${error.message}` });
    }
});

app.post('/api/users/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if a user exists or not for security.
            return res.status(200).json({ 
                success: true, 
                message: 'If an account with that email exists, a password reset link has been sent.',
            });
        }

        logEvent({
            eventType: 'PASSWORD_RESET_REQUESTED',
            actorUsername: user.username,
            details: { message: `Password reset requested for email: ${email}` },
            target: { id: user.username, model: 'User' }
        });
        
        // The client will get this data and make the call to Google Apps Script
        res.status(200).json({
            success: true,
            message: 'Password reset instructions are being sent.',
            emailData: {
                email: user.email,
                fullName: user.fullName,
            }
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error while processing password reset.' });
    }
});

app.post('/api/users/:username/follow', protect, async (req, res) => {
    const userToFollow = req.params.username;
    const follower = req.session.user.username;

    if (userToFollow === follower) {
        return res.status(400).json({ message: "You cannot follow yourself." });
    }

    try {
        const existingFollow = await Follower.findOne({ user: userToFollow, follower: follower });
        if (existingFollow) {
            return res.status(409).json({ message: "You are already following this user." });
        }

        const newFollow = new Follower({ user: userToFollow, follower: follower });
        await newFollow.save();

        await sendNotification(
            userToFollow,
            `${follower} started following you.`,
            '#people-page'
        );
        
        io.emit('follow_updated', { user: userToFollow, follower: follower, isFollowing: true });

        res.status(201).json({ message: `Successfully followed ${userToFollow}.` });
    } catch (error) {
        console.error("Error in /follow route:", error);
        res.status(500).json({ message: "Server error while trying to follow user." });
    }
});

app.post('/api/users/:username/unfollow', protect, async (req, res) => {
    const userToUnfollow = req.params.username;
    const follower = req.session.user.username;

    try {
        const result = await Follower.deleteOne({ user: userToUnfollow, follower: follower });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "You were not following this user." });
        }
        
        io.emit('follow_updated', { user: userToUnfollow, follower: follower, isFollowing: false });

        res.status(200).json({ message: `Successfully unfollowed ${userToUnfollow}.` });
    } catch (error) {
        console.error("Error in /unfollow route:", error);
        res.status(500).json({ message: "Server error while trying to unfollow user." });
    }
});

// --- NEW RATING ENDPOINT ---
app.post('/api/ratings', protect, async (req, res) => {
    const { jobId, ratedUsername, rating, comment } = req.body;
    const raterUsername = req.session.user.username;

    try {
        // 1. Validation
        const job = await Job.findOne({ jobId: jobId });
        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.postedBy !== raterUsername) {
            return res.status(403).json({ message: 'You are not authorized to rate for this job.' });
        }
        if (job.assignedTo !== ratedUsername) {
            return res.status(400).json({ message: 'This user was not assigned to the specified job.' });
        }
        if (job.status !== 'closed') {
            return res.status(400).json({ message: 'You can only rate workers for completed (closed) jobs.' });
        }

        // 2. Save the new rating
        const newRating = new Rating({
            jobId,
            ratedUsername,
            raterUsername,
            rating,
            comment
        });
        await newRating.save();

        // 3. Recalculate average rating for the rated user
        const stats = await Rating.aggregate([
            { $match: { ratedUsername: ratedUsername } },
            { $group: {
                _id: '$ratedUsername',
                averageRating: { $avg: '$rating' },
                ratingCount: { $sum: 1 }
            }}
        ]);

        if (stats.length > 0) {
            const { averageRating, ratingCount } = stats[0];
            const updatedProfile = await Profile.findOneAndUpdate(
                { username: ratedUsername },
                { 
                    averageRating: averageRating.toFixed(1), // Store with one decimal place
                    ratingCount: ratingCount 
                },
                { new: true }
            ).lean();
            
            // Emit real-time update
            if(updatedProfile) {
                io.emit('content_updated', { type: 'profiles', data: updatedProfile });
            }
        }

        // 4. Log event and send notification
        logEvent({
            eventType: 'USER_RATED',
            actorUsername: raterUsername,
            details: { message: `User '${raterUsername}' rated ${ratedUsername} ${rating} stars for job '${job.title}'.` },
            target: { id: ratedUsername, model: 'User' }
        });

        await sendNotification(
            ratedUsername,
            `${raterUsername} gave you a ${rating}-star rating for the job: "${job.title}"!`,
            '#dashboard-page'
        );

        res.status(201).json({ message: 'Rating submitted successfully!' });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'You have already submitted a rating for this job.' });
        }
        console.error("Error submitting rating:", error);
        res.status(500).json({ message: 'Server error while submitting rating.' });
    }
});


app.put('/api/content/:type/:id', protect, async (req, res) => {
    const { type, id } = req.params;
    const data = req.body;
    let Model;
    let query;

    switch(type) {
        case 'profiles': Model = Profile; query = { username: id }; break;
        case 'jobs': Model = Job; query = { jobId: id }; break;
        case 'agencies': Model = Agency; query = { agencyId: id }; break;
        case 'agencyRequests': Model = AgencyRequest; query = { requestId: id }; break;
        default: return res.status(400).json({ message: 'Invalid content type' });
    }
    
    try {
        const originalDoc = await Model.findOne(query).lean();
        
        if (originalDoc && type === 'jobs' && data.status && originalDoc.status !== data.status) {
            logEvent({
                eventType: 'JOB_STATUS_UPDATED',
                actorUsername: req.session.user.username,
                details: { title: originalDoc.title, from: originalDoc.status, to: data.status },
                target: { id: id, model: 'Job' }
            });
            if (data.status === 'in-progress' && data.assignedTo) {
                await sendNotification(
                    originalDoc.postedBy,
                    `🎉 ${data.assignedTo} has ACCEPTED the job: "${originalDoc.title}"!`,
                    '#dashboard'
                );
            } else if (data.status === 'open' && data.assignedTo === null && originalDoc.assignedTo) {
                await sendNotification(
                    originalDoc.postedBy,
                    `⚠️ ${originalDoc.assignedTo} has DECLINED the job: "${originalDoc.title}". It is now open for applications again.`,
                    '#dashboard'
                );
            }
        }
        
        const updatedDoc = await Model.findOneAndUpdate(query, data, { new: true, upsert: type !== 'jobs' }).lean();

        if (!updatedDoc && type === 'jobs') {
            return res.status(404).json({ message: 'Job not found. Updates should be on existing jobs.' });
        }
        
        if (!originalDoc && type !== 'jobs') {
             io.emit('content_created', { type, data: updatedDoc });
        } else {
             io.emit('content_updated', { type, data: updatedDoc });
        }

        if (type === 'jobs' && data.status === 'assigned' && data.assignedTo && data.assignedTo !== originalDoc?.assignedTo) {
            await sendNotification(
                data.assignedTo,
                `You have been hired for the job: "${updatedDoc.title}"! Please accept or decline the offer in your dashboard.`,
                '#dashboard'
            );
        }

        if (type === 'agencyRequests' && data.status && data.status !== originalDoc?.status) {
            const agency = await Agency.findOne({ agencyId: updatedDoc.agencyId }).lean();
            if (agency) {
                let message = '';
                if (data.status === 'accepted') {
                    message = `Congratulations! Your request to join "${agency.name}" has been accepted.`;
                } else if (data.status === 'rejected') {
                    message = `Your request to join "${agency.name}" has been rejected.`;
                }
                if (message) {
                    await sendNotification(updatedDoc.username, message, '#zone-page');
                }
            }
        }

        if (type === 'profiles' && !originalDoc) {
            logEvent({ eventType: 'PROFILE_CREATED', actorUsername: req.session.user.username, target: { id: id, model: 'Profile' } });
        } else if (type === 'profiles' && originalDoc) {
            logEvent({ eventType: 'PROFILE_UPDATED', actorUsername: req.session.user.username, details: { updatedFields: Object.keys(data) }, target: { id: id, model: 'Profile' } });
        } else if (type === 'agencies') {
             logEvent({ eventType: 'AGENCY_UPDATED', actorUsername: req.session.user.username, details: { updatedFields: Object.keys(data) }, target: { id: id, model: 'Agency' } });
        }
        res.status(200).json(updatedDoc);
    } catch(error) {
        res.status(500).json({ message: `Error updating ${type}: ${error.message}` });
    }
});

app.post('/api/content/jobs', protect, async (req, res) => {
    // Save initially as Uncategorized, AI will fix it.
    const data = { ...req.body, category: 'Uncategorized' }; 
    try {
        // Step 1: Save the job initially to get an ID and respond to the user quickly.
        const newJob = new Job(data);
        await newJob.save();
        
        logEvent({
            eventType: 'JOB_CREATED',
            actorUsername: req.session.user.username,
            details: { title: data.title, category: 'Pending AI Categorization' },
            target: { id: newJob.jobId, model: 'Job' }
        });

        // Emit initial creation so UI can show a "processing" state if desired
        io.emit('content_created', { type: 'jobs', data: newJob.toJSON() });
        
        // Respond to the user immediately. The rest happens in the background.
        res.status(201).json(newJob);

        // Step 2: Perform AI categorization asynchronously.
        (async () => {
            try {
                // Validate that we have the necessary data
                if (!newJob.title) {
                    console.error(`Cannot categorize job ${newJob.jobId}: missing title`);
                    return;
                }

                const allCategories = await JobCategory.find().select('name').lean();
                const categoryNames = allCategories.map(c => c.name);

                // Call AI with both title and description for better context
                const suggestion = await suggestCategory(newJob.title, newJob.description || '', categoryNames);
                
                if (!suggestion || !suggestion.name) {
                    console.error(`AI categorization returned invalid result for job ${newJob.jobId}:`, suggestion);
                    return;
                }

                const suggestedCategoryName = suggestion.name;
                
                let categoryDoc;

                if (suggestion.isNew) {
                    // Create a new category if the AI suggests it
                    try {
                        categoryDoc = new JobCategory({
                            name: suggestedCategoryName,
                            types: ["Informal", "Formal", "Temporary"], // Default types
                            jobs: [{ name: newJob.title, imagePath: '' }],
                            imagePath: '',
                            useCategoryDefaultImage: true
                        });
                        await categoryDoc.save();
                        console.log(`Created new category "${suggestedCategoryName}" for job "${newJob.title}"`);
                        // Notify clients (especially admin) that a new category was created
                        io.emit('content_created', { type: 'jobCategories', data: categoryDoc.toJSON() });
                    } catch (categoryError) {
                        // If category creation fails (e.g., duplicate), try to find existing one
                        if (categoryError.code === 11000) {
                            console.log(`Category "${suggestedCategoryName}" already exists, using existing category`);
                            categoryDoc = await JobCategory.findOne({ name: suggestedCategoryName });
                        } else {
                            throw categoryError;
                        }
                    }
                } else {
                    // Find the existing category
                    categoryDoc = await JobCategory.findOne({ name: suggestedCategoryName });
                    if (!categoryDoc) {
                        console.warn(`Category "${suggestedCategoryName}" not found in database, creating it`);
                        // Create the category if it doesn't exist (shouldn't happen, but handle gracefully)
                        categoryDoc = new JobCategory({
                            name: suggestedCategoryName,
                            types: ["Informal", "Formal", "Temporary"],
                            jobs: [{ name: newJob.title, imagePath: '' }],
                            imagePath: '',
                            useCategoryDefaultImage: true
                        });
                        await categoryDoc.save();
                        io.emit('content_created', { type: 'jobCategories', data: categoryDoc.toJSON() });
                    } else {
                        // Add the specific job title to the category's job list if it doesn't exist
                        const jobTypeExists = categoryDoc.jobs.some(j => j.name.toLowerCase() === newJob.title.toLowerCase());
                        if (!jobTypeExists) {
                            categoryDoc.jobs.push({ name: newJob.title, imagePath: '' });
                            await categoryDoc.save();
                            // Notify clients of the update
                            io.emit('content_updated', { type: 'jobCategories', data: categoryDoc.toJSON() });
                        }
                    }
                }
                
                // Step 3: Update the job with the correct category determined by the AI
                const jobToUpdate = await Job.findById(newJob._id);
                if (jobToUpdate) {
                    jobToUpdate.category = suggestedCategoryName;
                    const updatedJob = await jobToUpdate.save();
                    
                    console.log(`Successfully categorized job "${newJob.title}" as "${suggestedCategoryName}"`);
                    
                    // Notify all clients of the final, categorized job
                    io.emit('content_updated', { type: 'jobs', data: updatedJob.toJSON() });
                    
                    // Send notifications if it was a direct hire
                    if (updatedJob.assignedTo && updatedJob.status === 'assigned') {
                        await sendNotification(
                            updatedJob.assignedTo,
                            `You have been hired for the job: "${updatedJob.title}"! Please accept or decline the offer in your dashboard.`,
                            '#dashboard'
                        );
                    }
                } else {
                    console.error(`Job ${newJob._id} not found when trying to update category`);
                }
            } catch (aiError) {
                console.error(`AI Categorization failed for job ${newJob.jobId}:`, {
                    error: aiError.message,
                    stack: aiError.stack,
                    jobTitle: newJob.title
                });
                // Job will remain as 'Uncategorized', which admin can fix later.
            }
        })();

    } catch(error) {
        if (error.code === 11000) {
             // This error can still be sent as the main response hasn't been sent yet in this block.
            return res.status(409).json({ message: 'An active job with this exact title and location already exists. Please modify the title or location, or close the existing job before posting a new one.' });
        }
        console.error("Detailed error creating job:", {
            message: error.message,
            stack: error.stack,
            requestBody: req.body,
            user: req.session.user ? req.session.user.username : 'No session',
        });
        // The initial response might have already been sent, so we can't send another one here. Just log the error.
    }
});

app.post('/api/jobs/:jobId/apply', protect, async (req, res) => {
    const { jobId } = req.params;
    const applicantUsername = req.session.user.username;

    try {
        const job = await Job.findOne({ jobId: jobId, status: 'open' });
        if (!job) {
            return res.status(404).json({ message: 'Job not found or is no longer open for applications.' });
        }

        if (job.postedBy === applicantUsername) {
            return res.status(400).json({ message: 'You cannot apply to your own job.' });
        }

        const updatedJob = await Job.findOneAndUpdate(
            { jobId: jobId, status: 'open' },
            { $addToSet: { applicants: applicantUsername } },
            { new: true }
        ).lean();
        
        if (!updatedJob) {
            return res.status(404).json({ message: 'Job is no longer available.' });
        }

        logEvent({
            eventType: 'JOB_APPLICATION_RECEIVED',
            actorUsername: applicantUsername,
            details: { message: `User '${applicantUsername}' applied for job '${job.title}'.` },
            target: { id: jobId, model: 'Job' }
        });

        await sendNotification(
            job.postedBy,
            `${applicantUsername} has applied for your job: "${job.title}"!`,
            '#dashboard'
        );

        io.emit('content_updated', { type: 'jobs', data: updatedJob });

        res.status(200).json({ message: 'Application submitted successfully!' });

    } catch (error) {
        console.error("Error applying for job:", error);
        res.status(500).json({ message: `Error applying for job: ${error.message}` });
    }
});

app.post('/api/jobs/:jobId/applicants/:username/handle', protect, async (req, res) => {
    const { jobId, username: applicantUsername } = req.params;
    const { action } = req.body;
    const jobPosterUsername = req.session.user.username;

    try {
        const job = await Job.findOne({ jobId: jobId });

        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.postedBy !== jobPosterUsername) {
            return res.status(403).json({ message: 'You are not authorized to manage applicants for this job.' });
        }
        if (!job.applicants.includes(applicantUsername)) {
            return res.status(400).json({ message: 'This user is not an applicant for this job.' });
        }

        if (action === 'accept') {
            if (job.status !== 'open') {
                return res.status(400).json({ message: 'This job is not open for new assignments.' });
            }
            
            const otherApplicants = job.applicants.filter(app => app !== applicantUsername);

            job.assignedTo = applicantUsername;
            job.status = 'assigned';
            job.applicants = [];
            await job.save();

            await sendNotification(
                applicantUsername,
                `Congratulations! You have been hired for the job: "${job.title}"! Please accept or decline the offer in your dashboard.`,
                '#dashboard'
            );

            for (const otherApplicant of otherApplicants) {
                await sendNotification(
                    otherApplicant,
                    `Your application for "${job.title}" was not successful as the position has been filled.`,
                    '#dashboard'
                );
            }
            
            io.emit('content_updated', { type: 'jobs', data: job.toJSON() });

            res.status(200).json({ message: `Accepted ${applicantUsername}. They and other applicants have been notified.` });

        } else if (action === 'reject') {
            job.applicants.pull(applicantUsername);
            await job.save();

            await sendNotification(
                applicantUsername,
                `Unfortunately, your application for "${job.title}" was not successful at this time.`,
                '#dashboard'
            );
            
            io.emit('content_updated', { type: 'jobs', data: job.toJSON() });
            
            res.status(200).json({ message: `Rejected ${applicantUsername}. They have been notified.` });

        } else {
            return res.status(400).json({ message: 'Invalid action specified.' });
        }
    } catch (error) {
        console.error("Error handling job application:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

app.post('/api/content/agencies', protect, async (req, res) => {
    const data = req.body;
    if (req.session.user.username !== data.owner) {
        return res.status(403).json({ message: 'Forbidden: You can only create an agency for yourself.' });
    }
    const existingAgency = await Agency.findOne({ owner: data.owner });
    if (existingAgency) {
        return res.status(409).json({ message: 'You already own an agency.' });
    }
    try {
        const newAgency = new Agency(data);
        await newAgency.save();
        logEvent({
            eventType: 'AGENCY_CREATED',
            actorUsername: req.session.user.username,
            details: { name: newAgency.name },
            target: { id: newAgency.agencyId, model: 'Agency' }
        });

        io.emit('content_created', { type: 'agencies', data: newAgency.toJSON() });

        res.status(201).json(newAgency);
    } catch (error) {
        res.status(500).json({ message: `Error creating agency: ${error.message}` });
    }
});

app.post('/api/content/agencyRequests', protect, async (req, res) => {
    const data = req.body;
    if (req.session.user.username !== data.username) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    try {
        const newRequest = new AgencyRequest(data);
        await newRequest.save();

        const agency = await Agency.findOne({ agencyId: data.agencyId }).lean();
        logEvent({
            eventType: 'AGENCY_JOIN_REQUEST_SENT',
            actorUsername: req.session.user.username,
            details: { agency: agency ? agency.name : data.agencyId },
            target: { id: data.agencyId, model: 'Agency' }
        });

        if (agency) {
            const ownerSocketId = clients.get(agency.owner);
            if (ownerSocketId) {
                const requesterProfile = await Profile.findOne({ username: data.username }).lean();
                io.to(ownerSocketId).emit('agency_join_request_received', {
                    request: newRequest,
                    requesterProfile: requesterProfile
                });
            }
        }
        
        io.emit('content_created', { type: 'agencyRequests', data: newRequest.toJSON() });

        res.status(201).json(newRequest);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'You have already sent a request to this agency.' });
        }
        res.status(500).json({ message: `Error creating agency request: ${error.message}` });
    }
});

app.delete('/api/content/:type/:id', protect, async(req, res) => {
    const { type, id } = req.params;
    let Model;
    let query;
    switch(type) {
        case 'jobs': Model = Job; query = { jobId: id }; break;
        default: return res.status(400).json({ message: 'Invalid content type' });
    }
    try {
        if (type === 'jobs') {
            const job = await Model.findOne(query).lean();
            if (job) {
                logEvent({
                    eventType: 'JOB_DELETED',
                    actorUsername: req.session.user.username,
                    details: { title: job.title },
                    target: { id: id, model: 'Job' }
                });
            }
        }

        await Model.deleteOne(query);
        io.emit('content_deleted', { type, id });
        res.status(200).json({ message: `${type} with id ${id} deleted successfully.`});
    } catch(error) {
        res.status(500).json({ message: `Error deleting ${type}: ${error.message}` });
    }
});

app.delete('/api/agencies/:agencyId/members/:username', protect, async (req, res) => {
    const { agencyId, username: memberToRemove } = req.params;
    const ownerUsername = req.session.user.username;

    try {
        const agency = await Agency.findOne({ agencyId: agencyId });

        if (!agency) {
            return res.status(404).json({ message: 'Agency not found.' });
        }

        if (agency.owner !== ownerUsername) {
            return res.status(403).json({ message: 'You are not authorized to manage this agency.' });
        }
        
        if (agency.owner === memberToRemove) {
             return res.status(400).json({ message: 'Agency owner cannot be removed.' });
        }

        const initialMemberCount = agency.members.length;
        agency.members.pull(memberToRemove);

        if (agency.members.length === initialMemberCount) {
            return res.status(404).json({ message: `User '${memberToRemove}' is not a member of this agency.` });
        }
        
        const updatedAgency = await agency.save();

        logEvent({
            eventType: 'AGENCY_MEMBER_REMOVED', 
            actorUsername: ownerUsername,
            details: { message: `User '${ownerUsername}' removed member '${memberToRemove}' from agency '${agency.name}'.` },
            target: { id: agencyId, model: 'Agency' }
        });
        
        await sendNotification(
            memberToRemove,
            `You have been removed from the agency: "${agency.name}".`,
            '#zone-page'
        );

        io.emit('content_updated', { type: 'agencies', data: updatedAgency.toObject() }); 

        res.status(200).json({ message: `Successfully removed ${memberToRemove} from the agency.` });

    } catch (error) {
        console.error("Error removing agency member:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

app.put('/api/likes', protect, async (req, res) => {
    const username = req.session.user.username;
    const { likedItems, dislikedItems, favoritedItems } = req.body;

    try {
        const oldLikes = await Like.findOne({ username }).lean();
        const newLikes = await Like.findOneAndUpdate(
            { username },
            { likedItems, dislikedItems, favoritedItems },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        io.emit('likes_updated', newLikes);

        const oldLikedSet = new Set(oldLikes?.likedItems || []);
        const newLikedSet = new Set(newLikes.likedItems || []);
        const oldDislikedSet = new Set(oldLikes?.dislikedItems || []);
        const newDislikedSet = new Set(newLikes.dislikedItems || []);
        const oldFavoritedSet = new Set(oldLikes?.favoritedItems || []);
        const newFavoritedSet = new Set(newLikes.favoritedItems || []);

        const processChange = async (newItemId, eventType, messagePrefix) => {
            if (newItemId.startsWith('job')) {
                const job = await Job.findOne({ jobId: newItemId }).lean();
                if (job) {
                    await logEvent({ eventType, actorUsername: username, details: { message: `User '${username}' ${messagePrefix} job '${job.title}'.` }, target: { id: newItemId, model: 'Job' } });
                    if (username !== job.postedBy) {
                        await sendNotification(job.postedBy, `${username} ${messagePrefix} your job: "${job.title}"`, '#dashboard');
                    }
                }
            }
            else if (newItemId.startsWith('news_')) {
                const article = await NewsArticle.findOne({ articleId: newItemId }).lean();
                if (article) {
                    await logEvent({ eventType: eventType.replace('JOB', 'NEWS_ARTICLE'), actorUsername: username, details: { message: `User '${username}' ${messagePrefix} news article '${article.title}'.` }, target: { id: newItemId, model: 'NewsArticle' } });
                }
            }
        };

        for (const itemId of newLikedSet) { if (!oldLikedSet.has(itemId)) { await processChange(itemId, 'JOB_LIKED', 'liked'); } }
        for (const itemId of newDislikedSet) { if (!oldDislikedSet.has(itemId)) { await processChange(itemId, 'JOB_DISLIKED', 'disliked'); } }
        for (const itemId of newFavoritedSet) { if (!oldFavoritedSet.has(itemId)) { await processChange(itemId, 'JOB_FAVORITED', 'favorited'); } }

        res.status(200).json({ message: 'Preferences saved.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/notifications/mark-read', protect, async (req, res) => {
    try {
        const { notificationIds } = req.body;
        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({ message: 'Invalid notification IDs provided.' });
        }
        await Notification.updateMany(
            { _id: { $in: notificationIds }, recipientUsername: req.session.user.username },
            { $set: { isRead: true } }
        );
        res.status(200).json({ message: 'Notifications marked as read.' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notifications as read.' });
    }
});

app.get('/api/chat/history/:recipientUsername',


 protect, async (req, res) => {
    try {
        const currentUser = req.session.user.username;
        const recipientUser = req.params.recipientUsername;
        const messages = await Message.find({
            $or: [
                { sender: currentUser, recipient: recipientUser },
                { sender: recipientUser, recipient: currentUser }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chat history." });
    }
});

// --- Admin Routes ---
app.delete('/api/admin/users/:username', protect, admin, async (req, res) => {
    const { username } = req.params;
    if (username === process.env.ADMIN_USERNAME) {
        return res.status(400).json({ message: 'Cannot delete the main admin account.' });
    }
    try {
        await User.deleteOne({ username });
        await Profile.deleteOne({ username });
        await Like.deleteOne({ username });
        await AgencyRequest.deleteMany({ username });
        await Agency.updateMany({}, { $pull: { members: username } });
        await Follower.deleteMany({ $or: [{ user: username }, { follower: username }] });
        
        logEvent({
            eventType: 'USER_DELETED_BY_ADMIN',
            actorUsername: req.session.user.username,
            details: { message: `Admin deleted user: ${username}` },
            target: { id: username, model: 'User' }
        });
        
        io.emit('user_deleted', { username });
        
        res.status(200).json({ message: `User ${username} and all associated data deleted.` });
    } catch (error) {
        res.status(500).json({ message: `Error deleting user: ${error.message}` });
    }
});

app.post('/api/admin/users/reset-password/:username', protect, admin, async (req, res) => {
    const { username } = req.params;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        console.log(`--- ADMIN ACTION ---`);
        console.log(`Password reset triggered for user: ${username} (email: ${user.email})`);
        console.log(`In a real app, an email with a secure reset link would be sent.`);
        console.log(`------------------`);
        
        logEvent({
            eventType: 'PASSWORD_RESET_TRIGGERED',
            actorUsername: req.session.user.username,
            details: { message: `Password reset triggered for user: ${username}` },
            target: { id: username, model: 'User' }
        });

        res.status(200).json({ message: `A password reset link has been sent to ${user.email}.` });
    } catch (error) {
        res.status(500).json({ message: `Error triggering password reset: ${error.message}` });
    }
});

app.post('/api/admin/jobs/cleanup-duplicates', protect, admin, async (req, res) => {
    try {
        const duplicates = await Job.aggregate([
            {
                $group: {
                    _id: { 
                        postedBy: "$postedBy", 
                        title: { $toLower: "$title" },
                        location: "$location"
                    },
                    docs: { $push: { _id: "$_id", createdAt: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            return res.status(200).json({ message: 'No duplicate jobs found to clean up.' });
        }

        let idsToDelete = [];
        for (const group of duplicates) {
            group.docs.sort((a, b) => b.createdAt - a.createdAt);
            const toDelete = group.docs.slice(1).map(doc => doc._id);
            idsToDelete.push(...toDelete);
        }

        if (idsToDelete.length === 0) {
            return res.status(200).json({ message: 'No older duplicate jobs to remove.' });
        }
        
        const { deletedCount } = await Job.deleteMany({ _id: { $in: idsToDelete } });

        logEvent({
            eventType: 'ADMIN_JOB_CLEANUP',
            actorUsername: req.session.user.username,
            details: { message: `Admin cleaned up ${deletedCount} duplicate job postings.` }
        });
        
        idsToDelete.forEach(id => {
            const job = { jobId: id.toString() }; // Construct a minimal object for deletion event
            io.emit('content_deleted', { type: 'jobs', id: job.jobId });
        });

        res.status(200).json({ message: `Successfully deleted ${deletedCount} duplicate job(s).` });

    } catch (error) {
        console.error('Error cleaning up duplicate jobs:', error);
        res.status(500).json({ message: `Server error during cleanup: ${error.message}` });
    }
});

app.post('/api/admin/jobs/:jobId/recategorize', protect, admin, async (req, res) => {
    try {
        const { jobId } = req.params;
        const jobToUpdate = await Job.findOne({ jobId });

        if (!jobToUpdate) {
            return res.status(404).json({ message: 'Job not found.' });
        }

        const allCategories = await JobCategory.find().select('name').lean();
        const categoryNames = allCategories.map(c => c.name);

        const suggestion = await suggestCategory(jobToUpdate.title, jobToUpdate.description, categoryNames);
        const suggestedCategoryName = suggestion.name;
        
        let categoryDoc;

        if (suggestion.isNew) {
            categoryDoc = new JobCategory({
                name: suggestedCategoryName,
                types: ["Informal", "Formal", "Temporary"],
                jobs: [{ name: jobToUpdate.title, imagePath: '' }],
                imagePath: '',
                useCategoryDefaultImage: true
            });
            await categoryDoc.save();
            io.emit('content_created', { type: 'jobCategories', data: categoryDoc.toJSON() });
        } else {
            categoryDoc = await JobCategory.findOne({ name: suggestedCategoryName });
            if (categoryDoc) {
                const jobTypeExists = categoryDoc.jobs.some(j => j.name.toLowerCase() === jobToUpdate.title.toLowerCase());
                if (!jobTypeExists) {
                    categoryDoc.jobs.push({ name: jobToUpdate.title, imagePath: '' });
                    await categoryDoc.save();
                    io.emit('content_updated', { type: 'jobCategories', data: categoryDoc.toJSON() });
                }
            }
        }
        
        jobToUpdate.category = suggestedCategoryName;
        const updatedJob = await jobToUpdate.save();
        io.emit('content_updated', { type: 'jobs', data: updatedJob.toJSON() });
        
        logEvent({
            eventType: 'JOB_STATUS_UPDATED',
            actorUsername: req.session.user.username,
            details: { message: `Admin manually recategorized job '${updatedJob.title}' into '${suggestedCategoryName}'.` },
            target: { id: jobId, model: 'Job' }
        });

        res.status(200).json({ message: `Job successfully recategorized into '${suggestedCategoryName}'.` });

    } catch (error) {
        console.error('Manual recategorization error:', error);
        res.status(500).json({ message: `Server error during recategorization: ${error.message}` });
    }
});


app.put('/api/admin/verify', protect, admin, async (req, res) => {
    const { type, id, isVerified } = req.body;

    try {
        let updatedDoc;
        let modelType;
        if (type === 'profile') {
            updatedDoc = await Profile.findOneAndUpdate(
                { username: id },
                { $set: { isVerified: isVerified } },
                { new: true }
            ).lean();
            modelType = 'profiles';
        } else if (type === 'agency') {
            updatedDoc = await Agency.findOneAndUpdate(
                { agencyId: id },
                { $set: { isVerified: isVerified } },
                { new: true }
            ).lean();
            modelType = 'agencies';
        } else {
            return res.status(400).json({ message: 'Invalid verification type specified.' });
        }

        if (!updatedDoc) {
            return res.status(404).json({ message: `${type} with id ${id} not found.` });
        }
        
        io.emit('content_updated', { type: modelType, data: updatedDoc });

        const recipientUsername = type === 'profile' ? updatedDoc.username : updatedDoc.owner;
        let userMessage = '';
        let adminMessage = '';
        const link = type === 'profile' ? `#profile-detail-page?username=${recipientUsername}` : `#agency-detail-page?id=${updatedDoc.agencyId}`;
        const targetName = type === 'profile' ? updatedDoc.fullName : updatedDoc.name;

        if (isVerified) {
            userMessage = type === 'profile' 
                ? `Congratulations! Your profile has been verified.` 
                : `Congratulations! Your agency "${targetName}" has been verified.`;
            adminMessage = `You have successfully verified the ${type}: ${targetName}.`;
        } else {
            userMessage = `The verification for your ${type} has been removed.`;
            adminMessage = `You have removed verification for the ${type}: ${targetName}.`;
        }

        if (recipientUsername !== req.session.user.username) {
            await sendNotification(recipientUsername, userMessage, link);
        }
        
        await sendNotification(req.session.user.username, adminMessage, '#dashboard-page');

        res.status(200).json({ message: `${type} verification status updated successfully.`, doc: updatedDoc });
    } catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

app.put('/api/admin/settings', protect, admin, async (req, res) => {
    try {
        const currentSettings = await getSettings();
        const newSettings = { ...currentSettings, ...req.body };
        await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(newSettings, null, 2));
        io.emit('settings_updated', newSettings);
        res.status(200).json({ message: 'Settings saved successfully.' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: `Error saving settings: ${error.message}` });
    }
});

app.put('/api/admin/about-content', protect, admin, async (req, res) => {
    try {
        const newContent = req.body;
        await fs.writeFile(ABOUT_CONTENT_FILE_PATH, JSON.stringify(newContent, null, 2));
        io.emit('about_content_updated', newContent);
        res.status(200).json({ message: 'About page content saved successfully.' });
    } catch (error) {
        console.error('Error saving about page content:', error);
        res.status(500).json({ message: `Error saving content: ${error.message}` });
    }
});

app.post('/api/admin/news', protect, admin, async (req, res) => {
    try {
        const newArticle = new NewsArticle(req.body);
        await newArticle.save();
        io.emit('content_created', { type: 'newsArticles', data: newArticle.toJSON() });
        res.status(201).json(newArticle);
    } catch (error) {
        res.status(500).json({ message: `Error creating news article: ${error.message}` });
    }
});

app.put('/api/admin/news/:id', protect, admin, async (req, res) => {
    try {
        const updatedArticle = await NewsArticle.findOneAndUpdate(
            { articleId: req.params.id },
            req.body,
            { new: true }
        ).lean();
        if (!updatedArticle) return res.status(404).json({ message: 'News article not found' });
        io.emit('content_updated', { type: 'newsArticles', data: updatedArticle });
        res.status(200).json(updatedArticle);
    } catch (error) {
        res.status(500).json({ message: `Error updating news article: ${error.message}` });
    }
});

app.delete('/api/admin/news/:id', protect, admin, async (req, res) => {
    try {
        const result = await NewsArticle.deleteOne({ articleId: req.params.id });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'News article not found' });
        io.emit('content_deleted', { type: 'newsArticles', id: req.params.id });
        res.status(200).json({ message: 'News article deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Error deleting news article: ${error.message}` });
    }
});

app.put('/api/admin/job-categories/:categoryName/config', protect, admin, async (req, res) => {
    try {
        const category = await JobCategory.findOne({ name: req.params.categoryName });
        if (!category) {
            return res.status(404).json({ message: 'Job category not found' });
        }

        const { imagePath, useCategoryDefaultImage, jobs } = req.body;
        if (imagePath !== undefined) category.imagePath = imagePath;
        if (useCategoryDefaultImage !== undefined) category.useCategoryDefaultImage = useCategoryDefaultImage;

        if (jobs && Array.isArray(jobs)) {
            const newJobsMap = new Map(jobs.map(j => [j.name, j.imagePath]));
            category.jobs.forEach(jobInDb => {
                if (newJobsMap.has(jobInDb.name)) {
                    jobInDb.imagePath = newJobsMap.get(jobInDb.name);
                }
            });
        }

        const updatedCategory = await category.save();
        io.emit('content_updated', { type: 'jobCategories', data: updatedCategory.toJSON() });
        res.status(200).json({ message: 'Category configuration updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error updating category configuration: ${error.message}` });
    }
});

app.post('/api/admin/job-categories', protect, admin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required.' });
        const existing = await JobCategory.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (existing) return res.status(409).json({ message: 'A category with this name already exists.' });
        
        const newCategory = new JobCategory({ name, types: ["Formal", "Informal"], jobs: [], imagePath: '' });
        await newCategory.save();
        io.emit('content_created', { type: 'jobCategories', data: newCategory.toJSON() });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: `Error creating category: ${error.message}` });
    }
});

app.put('/api/admin/job-categories/:name', protect, admin, async (req, res) => {
    try {
        const { newName } = req.body;
        if (!newName) return res.status(400).json({ message: 'New category name is required.' });
        
        if (req.params.name.toLowerCase() !== newName.toLowerCase()) {
            const existing = await JobCategory.findOne({ name: new RegExp(`^${newName}$`, 'i') });
            if (existing) return res.status(409).json({ message: 'A category with this new name already exists.' });
        }

        const updated = await JobCategory.findOneAndUpdate({ name: req.params.name }, { name: newName }, { new: true }).lean();
        if (!updated) return res.status(404).json({ message: 'Category not found.' });
        
        io.emit('content_updated', { type: 'jobCategories', data: updated });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: `Error updating category: ${error.message}` });
    }
});

app.delete('/api/admin/job-categories/:name', protect, admin, async (req, res) => {
    try {
        const toDelete = await JobCategory.findOne({ name: req.params.name });
        if (!toDelete) return res.status(404).json({ message: 'Category not found.' });
        const idToDelete = toDelete._id.toString();
        
        await toDelete.deleteOne();
        
        io.emit('content_deleted', { type: 'jobCategories', id: idToDelete });
        res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error deleting category: ${error.message}` });
    }
});

app.post('/api/admin/job-categories/:categoryName/jobs', protect, admin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Job name is required.' });
        
        const category = await JobCategory.findOne({ name: req.params.categoryName });
        if (!category) return res.status(404).json({ message: 'Category not found.' });

        if (category.jobs.some(job => job.name.toLowerCase() === name.toLowerCase())) {
            return res.status(409).json({ message: 'This job type already exists in the category.' });
        }

        category.jobs.push({ name, imagePath: '' });
        const updatedCategory = await category.save();
        
        io.emit('content_updated', { type: 'jobCategories', data: updatedCategory.toJSON() });
        res.status(201).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: `Error adding job to category: ${error.message}` });
    }
});

app.put('/api/admin/job-categories/:categoryName/jobs', protect, admin, async (req, res) => {
    try {
        const { newName } = req.body;
        const { jobName } = req.query;
        if (!newName) return res.status(400).json({ message: 'New job name is required.' });
        if (!jobName) return res.status(400).json({ message: 'Original job name is required in query.' });
        
        const category = await JobCategory.findOne({ name: req.params.categoryName });
        if (!category) return res.status(404).json({ message: 'Category not found.' });
        
        const jobToUpdate = category.jobs.find(j => j.name === jobName);
        if (!jobToUpdate) return res.status(404).json({ message: 'Job not found in category.' });
        
        jobToUpdate.name = newName;
        const updatedCategory = await category.save();
        
        io.emit('content_updated', { type: 'jobCategories', data: updatedCategory.toJSON() });

        res.status(200).json({ message: 'Job updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: `Error updating job: ${error.message}` });
    }
});

app.delete('/api/admin/job-categories/:categoryName/jobs', protect, admin, async (req, res) => {
    try {
        const { jobName } = req.query;
        if (!jobName) return res.status(400).json({ message: 'Job name is required in query.' });
        
        const category = await JobCategory.findOne({ name: req.params.categoryName });
        if (!category) return res.status(404).json({ message: 'Category not found.' });

        const initialLength = category.jobs.length;
        category.jobs = category.jobs.filter(j => j.name !== jobName);
        if (category.jobs.length === initialLength) return res.status(404).json({ message: 'Job not found in category.' });
        
        const updatedCategory = await category.save();

        io.emit('content_updated', { type: 'jobCategories', data: updatedCategory.toJSON() });
        
        res.status(200).json({ message: 'Job deleted successfully from category.' });
    } catch (error) {
        res.status(500).json({ message: `Error deleting job: ${error.message}` });
    }
});

app.post('/api/admin/timeline-events', protect, admin, async (req, res) => {
    try {
        const eventData = { ...req.body, postedBy: req.session.user.username };
        const newEvent = new TimelineEvent(eventData);
        await newEvent.save();
        io.emit('content_created', { type: 'timelineEvents', data: newEvent.toJSON() });
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(500).json({ message: `Error creating timeline event: ${error.message}` });
    }
});

app.put('/api/admin/timeline-events/:id', protect, admin, async (req, res) => {
    try {
        const updatedEvent = await TimelineEvent.findOneAndUpdate(
            { timelineEventId: req.params.id },
            req.body,
            { new: true }
        ).lean();
        if (!updatedEvent) return res.status(404).json({ message: 'Timeline event not found' });
        io.emit('content_updated', { type: 'timelineEvents', data: updatedEvent });
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: `Error updating timeline event: ${error.message}` });
    }
});

app.delete('/api/admin/timeline-events/:id', protect, admin, async (req, res) => {
    try {
        const result = await TimelineEvent.deleteOne({ timelineEventId: req.params.id });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Timeline event not found' });
        io.emit('content_deleted', { type: 'timelineEvents', id: req.params.id });
        res.status(200).json({ message: 'Timeline event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Error deleting timeline event: ${error.message}` });
    }
});

app.get('/api/seed', async (req, res) => {
    try {
        const seedData = require('./utils/seedData');
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

        await User.insertMany(Object.values(seedData.users));
        await Profile.insertMany(Object.values(seedData.profiles));
        await Job.insertMany(Object.values(seedData.jobs));
        await Agency.insertMany(Object.values(seedData.agencies));
        await JobCategory.insertMany(seedData.jobCategoryData);
        
        await Counter.create({ _id: 'jkitId', seq: Object.values(seedData.users).length });

        console.log('Database seeded!');
        res.send('Database Seeded!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error seeding database.');
    }
});

// --- Database Connection and Server Start ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jkit-db';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected...');
        server.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`GraphQL IDE available at http://localhost:${port}/graphql`);
            }
        });
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });