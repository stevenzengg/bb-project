require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Fetches part data from the NestJS API.
 * @param {string} partNumber - The part number to fetch details for.
 */
async function fetchPartDetails(partNumber) {
    try {
        console.log(`Fetching details for part: ${partNumber}...`);

        const response = await axios.get(`${API_BASE_URL}/parts?partNumber=${partNumber}`);
        console.log('Part Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${error.response.data.message}`);
        } else {
            console.error(`Request Error: ${error.message}`);
        }
    }
}

// Read the part number from command-line arguments
const partNumber = process.argv[2];

if (!partNumber) {
    console.error('Please provide a part number. Example: node client.js 0510210200');
    process.exit(1);
}

// Call the API
fetchPartDetails(partNumber);
