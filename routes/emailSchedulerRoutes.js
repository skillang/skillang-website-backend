// routes/emailSchedulerRoutes.js
const express = require('express');
const router = express.Router();
const emailSchedulerService = require('../services/emailSchedulerService');
const { customZeptoClient } = require('../config/customzeptomail');

/**
 * POST /api/send-template - Send or schedule emails using ZeptoMail templates
 */
router.post('/send-template', async (req, res) => {
    console.log("Received request body:", req.body);

    const { senderEmail, templateKey, recipients, scheduledTime } = req.body;

    // Basic validations
    if (!senderEmail) {
        return res.status(400).json({ success: false, message: 'Sender email is required' });
    }

    if (!templateKey) {
        return res.status(400).json({ success: false, message: 'Template key is required' });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Recipients list is required and must be an array'
        });
    }

    // Handle scheduling - store the original request for scheduled emails
    if (scheduledTime) {
        const scheduleDate = new Date(scheduledTime);
        const now = new Date();

        if (isNaN(scheduleDate.getTime()) || scheduleDate <= now) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or past scheduled time.'
            });
        }

        try {
            // Format recipients properly for ZeptoMail (no merge_info in recipient objects)
            const formattedRecipients = recipients.map(recipient => ({
                email_address: {
                    address: recipient.email,
                    name: recipient.username || recipient.email.split('@')[0]
                }
            }));

            // Create a base payload - merge_info will be added when sending
            const payload = {
                mail_template_key: templateKey,
                from: {
                    address: senderEmail,
                    name: "Skillang"
                },
                to: formattedRecipients
            };

            // Schedule the email
            const scheduledEmail = await emailSchedulerService.scheduleEmail(
                senderEmail,
                templateKey,
                recipients, // Store original recipients with username
                scheduleDate,
                payload
            );

            return res.status(200).json({
                success: true,
                message: `Email scheduled to be sent at ${scheduleDate.toISOString()}`,
                jobId: scheduledEmail._id.toString()
            });
        } catch (error) {
            console.error('Error scheduling email:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to schedule email: ' + (error.message || 'Unknown error'),
                error: error.message
            });
        }
    } else {
        // Send immediately
        try {
            let results = [];
            let successCount = 0;
            let errorCount = 0;

            // Process each recipient individually for personalization
            for (const recipient of recipients) {
                try {
                    // Format for ZeptoMail API
                    const singleRecipient = {
                        email_address: {
                            address: recipient.email,
                            name: recipient.username || recipient.email.split('@')[0]
                        }
                    };

                    // Create payload with merge_info at top level
                    const payload = {
                        mail_template_key: templateKey,
                        from: {
                            address: senderEmail,
                            name: "Skillang"
                        },
                        to: [singleRecipient],
                        // Add merge_info at top level for personalization
                        merge_info: {
                            username: recipient.username || recipient.email.split('@')[0]
                        }
                    };

                    console.log(`Sending email to ${recipient.email} with payload:`, JSON.stringify(payload, null, 2));
                    const response = await customZeptoClient.mailBatchWithTemplate(payload);

                    results.push({
                        recipient: recipient.email,
                        success: true,
                        response
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Error sending to ${recipient.email}:`, err);
                    results.push({
                        recipient: recipient.email,
                        success: false,
                        error: err.message
                    });
                    errorCount++;
                }
            }

            console.log(`Email sending complete. Success: ${successCount}, Errors: ${errorCount}`);

            if (successCount > 0) {
                res.json({
                    success: true,
                    message: `Emails sent successfully to ${successCount} recipients. Errors: ${errorCount}`,
                    results
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to send any emails',
                    results
                });
            }
        } catch (error) {
            console.error('Error sending emails:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send emails: ' + (error.message || 'Unknown error'),
                error: error.message
            });
        }
    }
});

/**
 * GET /api/scheduled-emails - Get all scheduled emails
 */
router.get('/scheduled-emails', async (req, res) => {
    try {
        const scheduledEmails = await emailSchedulerService.getAllScheduledEmails();
        res.json({
            success: true,
            data: scheduledEmails
        });
    } catch (error) {
        console.error('Error getting scheduled emails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get scheduled emails',
            error: error.message
        });
    }
});

/**
 * DELETE /api/scheduled-emails/:id - Cancel a scheduled email
 */
router.delete('/scheduled-emails/:id', async (req, res) => {
    try {
        const success = await emailSchedulerService.cancelScheduledEmail(req.params.id);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Scheduled email not found or already processed'
            });
        }

        res.json({
            success: true,
            message: 'Scheduled email cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling scheduled email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel scheduled email',
            error: error.message
        });
    }
});

module.exports = router;