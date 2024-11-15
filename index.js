const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const dotenv = require('dotenv');
const SpotifyWebApi = require('spotify-web-api-node');
const app = express();

// Load environment variables
dotenv.config();

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

app.use(bodyParser.json());

// Store the valid PIN and feature status
let validPin = process.env.VALID_PIN;
let featureEnabled = process.env.FEATURE_ENABLED === 'true';

// Route to handle song requests
app.post('/queue-song', async (req, res) => {
    const { song, artist, pin } = req.body;

    if (!song || !artist || pin !== validPin) {
        return res.status(400).json({ message: 'Invalid song request or incorrect PIN.' });
    }

    if (!featureEnabled) {
        return res.status(400).json({ message: 'Song requests are currently disabled.' });
    }

    try {
        const searchResponse = await spotifyApi.searchTracks(`track:${song} artist:${artist}`);
        const track = searchResponse.body.tracks.items[0];

        if (!track) {
            return res.status(404).json({ message: 'Song not found.' });
        }

        // Add track to the queue (you can modify this logic for actual queuing)
        await spotifyApi.addTracksToQueue(track.uri);

        res.json({ message: 'Song added to the queue successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding song to the queue.' });
    }
});

// Route to update the PIN
app.post('/update-pin', (req, res) => {
    const { newPin } = req.body;

    if (!newPin || newPin.length !== 4) {
        return res.status(400).json({ message: 'Invalid PIN format. It must be 4 digits.' });
    }

    // Update the .env file with the new PIN
    const envFilePath = '.env';
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    const newEnvContent = envContent.replace(/VALID_PIN=.*/, `VALID_PIN=${newPin}`);

    fs.writeFileSync(envFilePath, newEnvContent);

    validPin = newPin;  // Update the in-memory variable
    res.json({ message: 'PIN updated successfully!' });
});

// Route to toggle the song request feature
app.post('/toggle-feature', (req, res) => {
    const { enableRequests } = req.body;

    if (typeof enableRequests !== 'boolean') {
        return res.status(400).json({ message: 'Invalid feature toggle value.' });
    }

    // Update the feature setting in the .env file
    const envFilePath = '.env';
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    const newEnvContent = envContent.replace(/FEATURE_ENABLED=.*/, `FEATURE_ENABLED=${enableRequests}`);

    fs.writeFileSync(envFilePath, newEnvContent);

    featureEnabled = enableRequests;  // Update the in-memory variable
    res.json({ message: `Song request feature ${enableRequests ? 'enabled' : 'disabled'} successfully!` });
});

// Route to serve the admin page (you should secure this with authentication)
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Route to serve the website
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
