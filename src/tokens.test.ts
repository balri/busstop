import { generateToken, validateToken, tokens, tokenCleanupInterval, cleanupTokens } from './tokens';

describe('Token functions', () => {
	it('generates a token and stores it', () => {
		const token = generateToken();
		expect(typeof token).toBe('string');
		expect(token.length).toBe(32); // 16 bytes hex
		expect(tokens.has(token)).toBe(true);
	});

	it('validates a valid token', () => {
		const token = generateToken();
		expect(validateToken(token)).toBe(true);
	});

	it('invalidates an expired token', () => {
		const token = generateToken();
		// Manually expire the token
		tokens.set(token, Date.now() - 1000);
		expect(validateToken(token)).toBe(false);
	});

	it('invalidates a non-existent token', () => {
		expect(validateToken('not_a_real_token')).toBe(false);
	});

	it('does not validate a token after expiry time has passed', async () => {
		const token = generateToken();
		// Fast-forward time by setting expiry in the past
		tokens.set(token, Date.now() - 1);
		expect(validateToken(token)).toBe(false);
	});

	it('removes expired tokens after cleanup', () => {
		const token = generateToken();
		tokens.set(token, Date.now() - 1); // Expire immediately
		cleanupTokens();
		expect(tokens.has(token)).toBe(false);
	});

	it('keeps valid tokens after cleanup', () => {
		const token = generateToken();
		cleanupTokens();
		expect(tokens.has(token)).toBe(true);
	});
});

afterAll(() => {
	clearInterval(tokenCleanupInterval);
});
