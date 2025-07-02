const request = require('supertest');
const express = require('express');


const app = express();
app.use(express.json());


app.post("/submit-to-google-sheets", (req, res) => {
    const { name, email } = req.body;


    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: "Name and email are required"
        });
    }


    res.json({
        success: true,
        message: "Data submitted successfully"
    });
});

// TESTS
describe('Simple Tests', () => {

    test('✅ Should work with name and email', async () => {
        const response = await request(app)
            .post('/submit-to-google-sheets')
            .send({
                name: 'John',
                email: 'john@test.com'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('❌ Should fail without name', async () => {
        const response = await request(app)
            .post('/submit-to-google-sheets')
            .send({
                email: 'john@test.com'
                // No name!
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

});