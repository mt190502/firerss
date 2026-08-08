<div align="center">

# FireRSS

FireRSS is a browser extension that discovers RSS and Atom feed candidates through page metadata, configurable templates, and optional origin-level scanning.

![FireRSS popup showing discovered feed candidates](https://github.com/user-attachments/assets/d6050798-4ce7-459b-8a2a-60494ae078b7)

[Google Chrome](https://chromewebstore.google.com/detail/firerss-rss-and-atom-feed/bpckagecmifbdpklfcjbkfdeefkijjkd) <a href="https://chromewebstore.google.com/detail/firerss-rss-and-atom-feed/bpckagecmifbdpklfcjbkfdeefkijjkd" target="_blank"><img alt="Chrome Web Store" src="https://img.shields.io/chrome-web-store/users/bpckagecmifbdpklfcjbkfdeefkijjkd?color=blue"></a> • [Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/firerss-feed-scraper) <a href="https://addons.mozilla.org/en-US/firefox/addon/firerss-feed-scraper" target="_blank"><img alt="Mozilla Add-on" src="https://img.shields.io/amo/users/firerss-feed-scraper"></a>

</div>

<hr>

## Features

- Collects RSS and Atom feed candidates exposed by the current page.
- Configurable page/feed URL templates can derive candidates directly with named placeholders and bypass Extended Feed Scan.
- Extended Feed Scan checks common feed paths at the website origin without sending cookies or a referrer.
- Extended Scan Exclusions disable active requests for matching URLs while preserving passive page and Feed Template detection.
- Imports and exports settings as a versioned JSON file.
- Optionally syncs settings through Google Sync on Chromium or Mozilla Sync on Firefox.

Browser-native sync stays within each browser ecosystem. Use settings export/import to transfer between Chromium and Firefox.

Feed templates always run, even when Extended Feed Scan is disabled. They use `page URL template => feed URL template` syntax, and named placeholders are copied from the page URL:

```text
https://t.me/<user> => https://rss-bridge.org/bridge01/?action=display&bridge=TelegramBridge&username=<username>&format=Atom'
```

Extended Feed Scan only probes root paths such as `/feed`, `/rss.xml`, and `/atom.xml`. Positive results are cached per origin for 24 hours and negative results for 15 minutes to avoid repeated requests. Add sensitive sites to Extended Scan Exclusions instead of Ignored URLs when passive feed discovery should remain available.

## Upgrading To FireRSS 3

FireRSS 3 is a breaking release. It changes the settings model, separates Extended Scan Exclusions from fully ignored URLs, and makes Exact Host matching truly hostname-specific.

Before migrating schema v1/v2 settings, FireRSS stores the original settings in local extension storage. On the first upgrade from FireRSS 2, the options page opens with a migration notice. The legacy backup can be downloaded from the notice or later from Import / Export, and the downloaded file can be restored with Import. Reset All Options removes this backup.

<hr>

## Manual Installation (for Development)

<details>
  <summary>Chrome</summary>

1. Clone the repository

    ```bash
    git clone https://github.com/mt190502/firerss.git
    cd firerss
    ```

2. Install the Node.js and pnpm dependencies

    ```bash
    pnpm install
    ```

3. Generate PEM key

    ```bash
    mkdir -p ~/.ssh
    openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out ~/.ssh/crx.pem
    ```

4. Build the extension

    ```bash
    CHROMIUM_PATH=$(which chromium-browser) make chromium
    ```

5. Open Chrome and go to `chrome://extensions/`

    ```bash
    chrome://extensions/
    ```

6. Open the file explorer and drag and drop the `dist/chromium.crx` file to the extensions page.

7. Click on `Add Extension` to install the extension.

</details>

<details>
   <summary>Firefox</summary>

1. Clone the repository

    ```bash
    git clone https://github.com/mt190502/firerss.git
    cd firerss
    ```

2. Install the Node.js and pnpm dependencies

    ```bash
    pnpm install
    ```

3. Build the extension

    ```bash
    make firefox
    ```

4. Open Firefox and go to `about:debugging`

5. Then click `This Firefox` and click `Load Temporary Add-on...`

6. Select `manifest.json` from `dist/firefox/` under the project folder.

</details>

<hr>

## License

See [LICENSE](./LICENSE)

## Privacy

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)
