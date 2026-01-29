// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Counter = require('./Counter');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    cellphone: { type: String, required: true },
    namibiaId: { type: String, required: true, unique: true },
    jkitId: { type: String, unique: true, index: true }, // J-KIT Identification Number (JIN)
    // *** FIX: Added 'Talent' to the list of valid user types ***
    type: { type: String, enum: ['Worker', 'Talent', 'Employer', 'Agent'], required: true },
    businessType: { type: String, enum: ['formal', 'informal'], default: 'formal' }, // Only relevant for Employer type
    // --- VERIFICATION FIELDS ---
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date }
});

// Add a virtual property `isAdmin` to the schema
UserSchema.virtual('isAdmin').get(function() {
  return this.username === process.env.ADMIN_USERNAME;
});

// Ensure virtuals are included when converting to JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Hash password and generate J-KIT Identification Number (JIN) before saving
UserSchema.pre('save', async function(next) {
    // Hash password if it has been modified
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // Generate J-KIT Identification Number (JIN) for new users
    if (this.isNew && !this.jkitId) {
        try {
            // Determine JIN prefix based on user type
            let jinPrefix = '';
            if (this.type === 'Worker' || this.type === 'Talent') {
                jinPrefix = 'I-JIN'; // Individual JIN
            } else if (this.type === 'Employer') {
                // Use B-JIN for formal business, IB-JIN for informal business
                jinPrefix = this.businessType === 'informal' ? 'IB-JIN' : 'B-JIN';
            } else if (this.type === 'Agent') {
                jinPrefix = 'A-JIN'; // Agent JIN
            } else {
                throw new Error(`Unknown user type: ${this.type}`);
            }

            // Get or create counter for this JIN type
            const counterName = `jin_${jinPrefix}`;
            const sequenceNumber = await Counter.getNextSequenceValue(counterName);

            // Format JIN with zero-padded 6-digit number
            this.jkitId = `${jinPrefix}-${sequenceNumber.toString().padStart(6, '0')}`;        } catch (error) {
            console.error("Error generating J-KIT Identification Number (JIN):", error);
            throw error;
        }
    }
    
    next();
});

// Method to compare password
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- METHOD to generate verification token ---
UserSchema.methods.getVerificationToken = function() {
    const token = crypto.randomBytes(32).toString('hex');

    this.verificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
        
    // Set token to expire in 24 hours
    this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    return token;
};

module.exports = mongoose.model('User', UserSchema);