# Web server
```
node backend/index.js
```

# Feeds

Download the feed from https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip

# Uptime Monitor

https://dashboard.uptimerobot.com/monitors/801132204

# Defaults

```
ACCEPTABLE_DELAY=60 // 60s
MIN_DISTANCE=500 // 500m
SECRET_KEYWORD=test
TOKEN_EXPIRY_MS=900000 // 15 minutes
```

# Puppeteer

Takes a screenshot of the site every hour
```
0 * * * * /usr/local/bin/node /Users/balri/Documents/busstop/scripts/screenshot.js
```

# Linting
```
npm run lint
```

# Dependency check
```
npx depcheck
```
