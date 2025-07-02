// services/emailSchedulerService.js
const schedule = require('node-schedule');
const ScheduledEmail = require('../models/scheduledEmail');
// Import the custom ZeptoMail client instead of the official one
const { customZeptoClient } = require('../config/customzeptomail');

// Store active jobs in memory
const activeJobs = {};

/**
 * Schedule an email job
 * @param {Object} emailDoc - MongoDB document for the scheduled email
 * @returns {Object} - Scheduled job object
 */
function scheduleEmailJob(emailDoc) {
    const id = emailDoc._id.toString();
    const scheduledTime = new Date(emailDoc.scheduledTime);
    const emailData = { ...emailDoc.emailData }; // Clone to avoid modifying the original
    const recipients = emailDoc.recipients; // Original recipients with username info

    console.log(`🕒 Scheduling email job ${id} for ${scheduledTime}`);

    // Cancel any existing job with the same ID
    if (activeJobs[id]) {
        activeJobs[id].cancel();
    }

    // Schedule new job
    const job = schedule.scheduleJob(scheduledTime, async function () {
        try {
            console.log(`🕒 Executing scheduled email job ${id} at ${new Date().toISOString()}`);

            let results = [];
            let successCount = 0;
            let errorCount = 0;

            // Send individual emails to each recipient for personalization
            for (const recipient of recipients) {
                try {
                    // Format for ZeptoMail API
                    const singleRecipient = {
                        email_address: {
                            address: recipient.email,
                            name: recipient.username || recipient.email.split('@')[0]
                        }
                    };

                    // Create individual payload with merge_info at top level
                    const payload = {
                        mail_template_key: emailDoc.templateKey,
                        from: {
                            address: emailDoc.senderEmail,
                            name: "Skillang"
                        },
                        to: [singleRecipient],
                        // Add merge_info at top level for personalization
                        merge_info: {
                            username: recipient.username || recipient.email.split('@')[0]
                        }
                    };

                    console.log(`📧 Sending scheduled email to ${recipient.email} with payload:`, JSON.stringify(payload, null, 2));
                    const response = await customZeptoClient.mailBatchWithTemplate(payload);

                    results.push({
                        recipient: recipient.email,
                        success: true
                    });
                    successCount++;
                } catch (err) {
                    console.error(`❌ Error sending to ${recipient.email}:`, err);
                    results.push({
                        recipient: recipient.email,
                        success: false,
                        error: err.message
                    });
                    errorCount++;
                }
            }

            // Update the database based on results
            if (successCount > 0) {
                await ScheduledEmail.findByIdAndUpdate(id, {
                    status: errorCount > 0 ? 'partial' : 'sent',
                    sentAt: new Date(),
                    results: results
                });
                console.log(`✅ Scheduled emails sent successfully to ${successCount} recipients. Errors: ${errorCount}`);
            } else {
                throw new Error(`Failed to send any emails. All ${errorCount} attempts failed.`);
            }
        } catch (error) {
            console.error(`❌ Error sending scheduled email ${id}:`, error);
            console.error('Error details:', error.response?.data || 'No detailed error information available');

            // Mark as failed in the database
            await ScheduledEmail.findByIdAndUpdate(id, {
                status: 'failed',
                error: error.message || JSON.stringify(error),
                failedAt: new Date()
            });
        } finally {
            // Remove the job from active jobs
            delete activeJobs[id];
        }
    });

    // Store the job reference
    activeJobs[id] = job;

    return job;
}

/**
 * Schedule a new email
 * @param {string} senderEmail - Sender email address
 * @param {string} templateKey - ZeptoMail template key
 * @param {Array} recipients - List of recipients
 * @param {Date} scheduledTime - When to send the email
 * @param {Object} emailPayload - ZeptoMail formatted payload
 * @returns {Promise<Object>} - Scheduled email document
 */
async function scheduleEmail(senderEmail, templateKey, recipients, scheduledTime, emailPayload) {
    try {
        // Create a new scheduled email document
        const scheduledEmail = new ScheduledEmail({
            senderEmail,
            templateKey,
            recipients,
            scheduledTime,
            emailData: emailPayload,
            status: 'pending',
            createdAt: new Date()
        });

        // Save to database
        await scheduledEmail.save();

        // Schedule the job
        scheduleEmailJob(scheduledEmail);

        return scheduledEmail;
    } catch (error) {
        console.error('Error scheduling email:', error);
        throw error;
    }
}

/**
 * Cancel a scheduled email
 * @param {string} id - Scheduled email ID
 * @returns {Promise<boolean>} - Whether cancellation was successful
 */
async function cancelScheduledEmail(id) {
    try {
        // Find and update the email in the database
        const email = await ScheduledEmail.findOneAndUpdate(
            { _id: id, status: 'pending' },
            { status: 'cancelled', cancelledAt: new Date() },
            { new: true }
        );

        if (!email) {
            return false;
        }

        // Cancel the job if it's active
        if (activeJobs[id]) {
            activeJobs[id].cancel();
            delete activeJobs[id];
        }

        return true;
    } catch (error) {
        console.error('Error cancelling scheduled email:', error);
        throw error;
    }
}

/**
 * Get all scheduled emails
 * @returns {Promise<Array>} - Array of scheduled email documents
 */
async function getAllScheduledEmails() {
    try {
        return await ScheduledEmail.find()
            .sort({ scheduledTime: -1 })
            .limit(100); // Limit to 100 most recent
    } catch (error) {
        console.error('Error getting scheduled emails:', error);
        throw error;
    }
}

/**
 * Recover pending scheduled emails on startup
 * @returns {Promise<void>}
 */
async function recoverScheduledEmails() {
    try {
        // Find all pending emails scheduled for the future
        const pendingEmails = await ScheduledEmail.find({
            status: 'pending',
            scheduledTime: { $gt: new Date() }
        });

        console.log(`📧 Recovered ${pendingEmails.length} pending scheduled emails`);

        // Reschedule each email
        for (const email of pendingEmails) {
            if (new Date(email.scheduledTime) > new Date()) {
                scheduleEmailJob(email);
            }
        }
    } catch (error) {
        console.error('Error recovering scheduled emails:', error);
    }
}

module.exports = {
    scheduleEmail,
    cancelScheduledEmail,
    getAllScheduledEmails,
    recoverScheduledEmails,
    scheduleEmailJob
};