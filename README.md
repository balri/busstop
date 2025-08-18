# Cron

```
*/5 * * * * /opt/homebrew/bin/node /Users/balri/Documents/busstop/backend/cron.js >> /Users/balri/Documents/busstop/backend/cron.log 2>&1
```

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
PORT=3000
SECRET_KEYWORD=test
TOKEN_EXPIRY_MS=900000 // 15 minutes
```
