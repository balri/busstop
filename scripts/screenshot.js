const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	const page = await browser.newPage();
	await page.goto('https://busstop-ufgc.onrender.com/', { waitUntil: 'networkidle2' });

	// Optional: set viewport size
	await page.setViewport({ width: 375, height: 812, isMobile: true });

	// Save screenshot with timestamp
	const outDir = path.join(__dirname, '../screenshots');
	const fs = require('fs');
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

	const filename = `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
	await page.screenshot({ path: path.join(outDir, filename) });

	await browser.close();
})();
