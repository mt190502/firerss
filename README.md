<div align="center">

# FireRSS

FireRSS is a simple RSS scrape tool to find the RSS feeds in the current web page.

![image](https://github.com/user-attachments/assets/f3b02ade-8512-4a36-8855-1b219a48bbdf)

[Google Chrome](https://chromewebstore.google.com/detail/firerss-rss-and-atom-feed/bpckagecmifbdpklfcjbkfdeefkijjkd) <a href="https://chromewebstore.google.com/detail/firerss-rss-and-atom-feed/bpckagecmifbdpklfcjbkfdeefkijjkd" target="_blank"><img alt="Chrome Web Store" src="https://img.shields.io/chrome-web-store/users/bpckagecmifbdpklfcjbkfdeefkijjkd?color=blue"></a> • [Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/firerss-feed-scraper) <a href="https://addons.mozilla.org/en-US/firefox/addon/firerss-feed-scraper" target="_blank"><img alt="Mozilla Add-on" src="https://img.shields.io/amo/users/firerss-feed-scraper"></a>

</div>

<hr>

## Manual Installation (for Development)

<details>
  <summary>Chrome</summary>

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

</details>

<details>
   <summary>Firefox</summary>

1. Clone the repository

   ```bash
   git clone <this-repo>
   ```

2. Install the nodejs and npm dependencies

   ```bash
   npm install
   ```

3. Build the extension

   ```bash
   make firefox
   ```

5. Open Firefox and go to `about:debugging`

6. Then click `This Firefox` and click `Load Temporary Add-on...`

7. Select manifest.json from dist/firefox/ under project folder

</details>

<hr>

## License

See [LICENSE](./LICENSE)
