// models/scheduledEmail.js
const mongoose = require('mongoose');
const scheduledEmailSchema = new mongoose.Schema({
    senderEmail: {
        type: String,
        required: true,
        trim: true
    },
    templateKey: {
        type: String,
        required: true,
        trim: true
    },
    recipients: [{
        email: {
            type: String,
            required: true,
            trim: true
        },
        username: {
            type: String,
            trim: true
        }
    }],
    scheduledTime: {
        type: Date,
        required: true
    },
    emailData: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'cancelled', 'partial'],
        default: 'pending'
    },
    sentAt: {
        type: Date
    },
    failedAt: {
        type: Date
    },
    error: {
        type: String
    },
    results: {
        type: Array
    },
    cancelledAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create an index on the scheduledTime for better query performance
scheduledEmailSchema.index({ scheduledTime: 1, status: 1 });

// Check if the model already exists to avoid OverwriteModelError
let ScheduledEmail;
try {
    ScheduledEmail = mongoose.model('ScheduledEmail');
} catch (e) {
    ScheduledEmail = mongoose.model('ScheduledEmail', scheduledEmailSchema);
}

module.exports = ScheduledEmail;