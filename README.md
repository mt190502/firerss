# FireRSS

FireRSS is a simple RSS scrape tool to find the RSS feeds in the current web page.

## Installation (Chrome)

- **Note**: This extension is not available on the Chrome Web Store. You can install it manually by following the steps below.

1. Clone the repository

   ```bash
   git clone <this-repo>
   ```

2. Install the nodejs and npm dependencies

   ```bash
   npm install
   ```

3. Generate PEM key

   ```bash
   mkdir ~/.ssh && cd ~/.ssh
   openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out crx.pem
   ```

4. Build the extension

   ```bash
   CHROMIUM_PATH=$(which chromium-browser) make chromium
   ```

5. Open Chrome and go to `chrome://extensions/`

   ```bash
   chrome://extensions/
   ```

6. Open the file explorer and drag and drop the `build/chromium.crx` file to the extensions page.

7. Click on `Add Extension` to install the extension.

## Installation (Firefox)

This extension is already available on the Firefox Add-ons store. You can install it from [here](https://addons.mozilla.org/en-US/firefox/addon/firerss-feed-scraper/)
