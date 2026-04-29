const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https'); // Required to bypass SSL errors

const app = express();

app.use(cors());
app.use(express.json());

// List of security headers we want to check for
const SECURITY_HEADERS = [
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy'
];

app.post('/api/scan', async (req, res) => {
    let { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Ensure the URL starts with https://
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 10000,
            // THE FIX: Create an agent that ignores expired/invalid SSL certificates
            httpsAgent: new https.Agent({  
                rejectUnauthorized: false 
            })
        });

        const headers = response.headers;
        const details = {};
        let score = 0;

        SECURITY_HEADERS.forEach(header => {
            const isPresent = !!headers[header.toLowerCase()];
            details[header] = isPresent;
            if (isPresent) score += (100 / SECURITY_HEADERS.length);
        });

        const riskScore = Math.round(score);
        let grade = 'High Risk';
        if (riskScore >= 75) grade = 'Low Risk';
        else if (riskScore >= 50) grade = 'Moderate Risk';

        res.json({
            target: targetUrl,
            riskScore,
            grade,
            details
        });

    } catch (error) {
        console.error("Scan Error:", error.message);
        
        // Handle specific Axios errors to give the user better feedback
        let errorMessage = 'Failed to scan the target.';
        if (error.code === 'ECONNABORTED') errorMessage = 'Request timed out.';
        if (error.response) errorMessage = `Site returned status ${error.response.status}`;
        
        res.status(500).json({ error: errorMessage });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});