# Web server
```
node backend/index.js
```

# Feeds

Download the feed from https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip

Update the feed:
```
npx ts-node src/filter/index.ts
```

# Uptime Monitor

https://dashboard.uptimerobot.com/monitors/801132204

# Defaults

```
ACCEPTABLE_DELAY=60 // 60s
MIN_DISTANCE=500 // 500m
SECRET_KEYWORD=test
```

# Puppeteer

Takes a screenshot of the site every hour by sending a mock date query param
```
node scripts/screenshot.js
```

# Linting
```
npm run lint
```

# Dependency check
```
npx depcheck
```

# Check for unused exports
```
npm install -g ts-prune
ts-prune
```

# Puppeteer

Takes a screenshot of the site every 10min

```
*/10 * * * * /usr/local/bin/node /Users/balri/Documents/busstop/scripts/screenshot.js
```

# Minify

```
npx terser public/main.js -o public/main.min.js
```

```
npx cleancss -o public/style.min.css public/style.css
```

# Change bus route

1. Update `TARGET_ROUTE_ID` in `src/routes/status.ts`
2. Run `npx ts-node src/filter/index.ts` to update feed
3. Get route colour from `feeds/routes.txt` and update in `public/bus.svg`
