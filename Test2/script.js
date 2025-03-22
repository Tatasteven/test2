const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("YOUR_GOOGLE_CLIENT_ID");

async function verifyToken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: "886708446597-eeg5h6gs6hr2m8j7sr2a6r4e0q2igtvm.apps.googleusercontent.com",
    });
    const payload = ticket.getPayload();
    console.log(payload); // User info
}
