const crypto = require('crypto');
const tokens = new Map();

const tokenExpiry = process.env.TOKEN_EXPIRY_MS || 15 * 60 * 1000; // 15 minutes

function generateToken() {
	const token = crypto.randomBytes(16).toString('hex');
	tokens.set(token, Date.now() + tokenExpiry);
	return token;
}

function validateToken(token) {
	const expiry = tokens.get(token);
	return expiry && expiry > Date.now();
}

function cleanupTokens() {
	const now = Date.now();
	for (const [token, expiry] of tokens.entries()) {
		if (expiry < now) tokens.delete(token);
	}
}

setInterval(cleanupTokens, 60 * 1000);

module.exports = { generateToken, validateToken, tokens };
