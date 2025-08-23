import crypto from 'crypto';

export const tokens = new Map();

const tokenExpiry = process.env.TOKEN_EXPIRY_MS ? Number(process.env.TOKEN_EXPIRY_MS) : 15 * 60 * 1000; // 15 minutes

export function generateToken() {
	const token = crypto.randomBytes(16).toString('hex');
	tokens.set(token, Date.now() + tokenExpiry);
	return token;
}

export function validateToken(token: string) {
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
