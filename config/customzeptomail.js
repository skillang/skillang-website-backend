// config/customZeptomail.js
const axios = require('axios');
require('dotenv').config();

// Use environment variables with fallback values
const ZEPTOMAIL_URL = process.env.ZEPTOMAIL_URL || "api.zeptomail.in/";
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_TOKEN || "Zoho-enczapikey PHtE6r0MFOG/iGJ59xEJsPa4Q8asMIl89LwzLgBE5IxLWKRXF01cqth4wTe/ohx8UfUTE/CYmotq4+me5eLRcGvuZz1OXmqyqK3sx/VYSPOZsbq6x00etVsecEzUVYPodNZi3SLWst/aNA==";

/**
 * Improved ZeptoMail client implementation
 */
const customZeptoClient = {
    /**
     * Send email using template
     * @param {Object} payload - Email payload
     * @returns {Promise<Object>} - Response from ZeptoMail API
     */
    mailBatchWithTemplate: async (payload) => {
        try {
            // Log the complete payload for debugging
            console.log('Sending payload to ZeptoMail:', JSON.stringify(payload, null, 2));

            const response = await axios.post(`https://${ZEPTOMAIL_URL}v1.1/email/template`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ZEPTOMAIL_TOKEN
                }
            });

            return response.data;
        } catch (error) {
            // Enhanced error logging
            console.error('ZeptoMail API Error Status:', error.response?.status);
            console.error('ZeptoMail API Error Details:', JSON.stringify(error.response?.data, null, 2));
            throw error;
        }
    }
};

// Create an alias to match the original implementation
const zeptoClient = customZeptoClient;

module.exports = {
    customZeptoClient,
    zeptoClient, // Export both names for backward compatibility
    ZEPTOMAIL_URL,
    ZEPTOMAIL_TOKEN
};