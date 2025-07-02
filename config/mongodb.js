// config/mongodb.js
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URL
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/skillang_email_scheduler';

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected successfully for email scheduler');
        return mongoose.connection;
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        // Don't exit process to allow the server to continue running
        return null;
    }
}

module.exports = {
    connectToMongoDB,
    connection: mongoose.connection,
    MONGO_URI
};