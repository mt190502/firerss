# FireRSS – Privacy Policy

_Last updated: 8 August 2026_

FireRSS is an open-source browser extension that helps you discover RSS / Atom feeds on the web.  
Your privacy matters — this document explains **what information we collect, why we collect it, how it is stored, how long it is retained, with whom it is shared, and how you can control or delete it**.

---

## 1. What Information We Collect

| Category                      | Data Elements                                                                                                                                                                                                     | Origin                                   | Scope                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Settings**             | • colour-scheme preference (light / dark / system) <br>• selected theme (built-in or remote) <br>• ignored sites, Extended Scan exclusions, and custom feed templates <br>• extended feed-scan option (0 / 1 / 2) | Options & Popup pages                    | Stored locally; optionally copied to browser-native sync                                                                                     |
| **Sync Account Status**       | Presence of a primary Google Sync profile ID (Chromium only; the value itself is not retained)                                                                                                                    | Browser profile                          | Read transiently only when enabling sync                                                                                                     |
| **Legacy Settings Backup**    | One pre-migration copy of valid schema v1/v2 settings, including its creation time and local/sync source                                                                                                          | Existing extension settings              | Stored locally until Reset All Options, extension data removal, or uninstall                                                                 |
| **Feed Cache (Session Only)** | Positive or negative Extended Scan results (`firerss_extended:v1:<encoded-origin>`)                                                                                                                               | Background service-worker                | Stored **in-memory** in browser session storage                                                                                              |
| **Network Requests**          | • HTTP(S) GET requests without cookies or referrer information to: <br> – common feed paths at website origins <br> – GitHub API and a selected theme’s GitHub-provided download URL                              | Initiated by background or options pages | Candidate response bodies are discarded; discovered feed URLs use the session cache, and a selected remote theme is stored as a user setting |

**We do not automatically record visited page paths, personal identifiers, analytics, cookies, crash reports, or telemetry. User-created Contains rules and Feed Templates may include paths entered by the user. Extended Scan temporarily caches encoded website origins to limit repeated requests.**

---

## 2. Why We Collect This Information

1. **User Settings** – to remember your visual preferences and feature choices between browsing sessions.
2. **Feed Cache** – to avoid repeatedly probing the same website origin.
3. **Network Requests** – to retrieve additional data required for functionality:  
   • fetch candidate feed files,  
   • download optional theme definitions.

---

## 3. How We Store and Protect Your Data

| Storage                                            | Location                                   | Persistence                                                                                                                          | Encryption                                          |
| -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `chrome.storage.local` (`firerss_settings`)        | Inside your browser profile on your device | Until you delete it or uninstall the extension                                                                                       | Protected by the browser’s profile mechanisms       |
| `storage.local` (`firerss_legacy_settings_backup`) | Inside your browser profile on your device | Created once before schema v1/v2 migration and retained until Reset All Options, extension data removal, or uninstall                | Protected by the browser’s profile mechanisms       |
| `storage.sync` (`firerss_settings`)                | Browser vendor sync infrastructure         | Written while Browser Sync is enabled; disabling sync stops future writes but keeps the existing synced copy                         | Protected according to Google Sync or Mozilla Sync  |
| Browser session storage (`firerss_extended:v1:*`)  | In-memory, managed by the browser          | Positive results expire after 24 hours, negative results after 15 minutes, and all entries are cleared when the browser session ends | Not written to disk                                 |
| In-flight network data                             | Standard browser network stack             | Ephemeral                                                                                                                            | Encrypted (HTTPS) when supported by the destination |

FireRSS never transmits settings to the extension developer. If you enable Browser Sync, the browser transmits settings through its own Google Sync or Mozilla Sync infrastructure. Chrome/Chromium and Firefox sync ecosystems are separate and do not synchronize directly with each other.

---

## 4. Retention Periods

| Data             | Retention                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User Settings    | Local settings are kept until cleared or FireRSS is uninstalled. Synced settings remain according to the browser vendor's sync and deletion behavior.                                            |
| Legacy Backup    | Kept locally until Reset All Options, extension data removal, or uninstall. Dismissing the migration notice does not delete it.                                                                  |
| Feed Cache       | Positive results expire after 24 hours and negative results after 15 minutes. Entries are also cleared when scan-related settings change, the browser session ends, or the extension is removed. |
| Network Requests | No storage; retained only in browser network logs (if enabled).                                                                                                                                  |

---

## 5. Sharing and Third-Party Services

FireRSS **does not** share any collected information with analytics providers, advertising networks, or the extension author.

External requests performed by the extension:

1. **Websites you load** – after a page finishes loading, a local script passively reads feed candidates already present in that page. When Extended Feed Scan is enabled and the URL is not excluded, the background checks a limited set of root feed paths.
2. **GitHub** – cookie-free, referrer-free requests list optional theme files and download a selected theme from its GitHub-provided URL.

Extended Scan requests omit cookies and referrer information, reject redirects, and never reuse the current page path, query, or fragment. No additional identifiers or tokens are attached.

---

## 6. Your Choices & Control

| Action                             | How to Perform                                                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Change appearance or behaviour** | Open the FireRSS options page → adjust colour-scheme, theme, ignored sites, Extended Scan exclusions, or Extended Feed Scan.                              |
| **Enable or disable Browser Sync** | Options page → Browser Sync. Disabling sync stops future FireRSS sync writes but keeps existing vendor-side synced data.                                  |
| **Transfer between browsers**      | Options page → Export, then Import in the other browser. Export files contain settings only, never feed caches.                                           |
| **Download the migration backup**  | Use Download Backup in the FireRSS 3 migration notice or Legacy Backup under Import / Export. The file can be restored with Import.                       |
| **Clear feed cache**               | Change ignored sites, Extended Scan exclusions, Feed Templates, or the Extended Feed Scan mode.                                                           |
| **Reset FireRSS settings**         | Reset All Options replaces local settings with defaults, disables Browser Sync, and removes synced FireRSS settings.                                      |
| **Opt out of remote theme list**   | Avoid opening the theme selector. FireRSS does not contact GitHub merely because the options page was opened.                                             |
| **Block all external requests**    | Use browser-level network filtering/firewall extensions; FireRSS will continue to work but may not display remote themes or collect some feed candidates. |

---

## 7. Permissions Explained

FireRSS requests the following WebExtension permissions:

| Permission                                       | Reason                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity`, `identity.email`                     | Chromium only: verifies that a primary Google Sync account exists before Browser Sync is enabled. The returned profile details are not stored. |
| `scripting`                                      | Injects a lightweight script after pages load to parse their DOM for feed candidates.                                                          |
| `storage`                                        | Saves settings locally, optionally syncs them through browser-native sync, and keeps session feed cache.                                       |
| `host_permissions` (`https://*/*`, `http://*/*`) | Enables passive candidate detection, cookie-free and referrer-free candidate checks, and loading optional themes from GitHub.                  |

---

## 8. Children’s Privacy

FireRSS is not directed at children under 13 and does not knowingly collect personal information from them.

---

## 9. Changes to This Policy

We may update this policy to reflect new features or legal requirements.  
Changes will be committed to the [GitHub repository](https://github.com/mt190502/firerss) with an updated “Last updated” date.

---

## 10. Contact

For questions or concerns, please open an issue on our GitHub repository:

[`https://github.com/mt190502/firerss/issues`](https://github.com/mt190502/firerss/issues)
