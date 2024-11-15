const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

//const spotifyClientId = 'REDACTED';
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;

//const spotifyClientSecret = 'REDACTED';
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = '';
let isEnabled = true;
let pinCode = '1234'; // Default PIN, changeable in backend

// Get access token from Spotify
async function getAccessToken() {
    const authOptions = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64'),
        },
        data: 'grant_type=client_credentials',
    };
    const response = await axios(authOptions);
    accessToken = response.data.access_token;
}

// Middleware to check if feature is enabled
app.use((req, res, next) => {
    if (!isEnabled) return res.status(403).send('Feature is disabled');
    next();
});

// Endpoint to set PIN and enable/disable feature
app.post('/admin', (req, res) => {
    const { newPin, enableFeature } = req.body;
    if (newPin) pinCode = newPin;
    if (typeof enableFeature === 'boolean') isEnabled = enableFeature;
    res.send({ message: 'Settings updated' });
});

// Endpoint to queue a song
app.post('/queue-song', async (req, res) => {
    const { song, artist, pin } = req.body;
    if (pin !== pinCode) return res.status(401).send('Invalid PIN');

    // Search for the song on Spotify
    try {
        const searchResponse = await axios.get(`https://api.spotify.com/v1/search`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { q: `${song} ${artist}`, type: 'track', limit: 1 },
        });
        
        const track = searchResponse.data.tracks.items[0];
        if (!track) return res.status(404).send('Song not found');
        
        // Add track to queue
        await axios.post(
            `https://api.spotify.com/v1/me/player/queue?uri=${track.uri}`,
            {},
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        res.send({ message: `Added ${song} by ${artist} to queue` });
    } catch (error) {
        res.status(500).send('Failed to queue song');
    }
});

app.listen(3000, async () => {
    await getAccessToken();
    console.log('Server is running on port 3000');
});
