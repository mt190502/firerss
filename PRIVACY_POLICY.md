# FireRSS – Privacy Policy

_Last updated: 9 June 2025_

FireRSS is an open-source browser extension that helps you discover RSS / Atom feeds on the web.  
Your privacy matters — this document explains **what information we collect, why we collect it, how it is stored, how long it is retained, with whom it is shared, and how you can control or delete it**.

---

## 1. What Information We Collect

| Category                      | Data Elements                                                                                                                                                                                                                                                                                                                            | Origin                                   | Scope                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| **User Settings**             | • colour-scheme preference (light / dark / system)  <br>• selected theme (built-in or remote)  <br>• list of ignored sites (patterns + match-type)  <br>• extended feed-scan option (0 / 1 / 2)                                                                                                                                          | Options & Popup pages                    | Stored **locally** in `chrome.storage.local`     |
| **Feed Cache (Session Only)** | List of feed URLs (`firerss_feeds:<page-key>`) discovered for the current tab                                                                                                                                                                                                                                                            | Background service-worker                | Stored **in-memory** in `chrome.storage.session` |
| **Network Requests**          | • Anonymous HTTP(S) GET requests to:  <br> – Current web page (to inject feed-scanner code)  <br> – Guessed feed endpoints (e.g. `/feed.xml`)  <br> – `https://youtube.com/<user>/about` (when visiting YouTube channels)  <br> – GitHub API `https://api.github.com/repos/mt190502/firerss/contents/themes` (to list remote themes) | Initiated by background or options pages | Transient; responses are not stored after use    |

**We do not collect or store personal identifiers, browsing history, analytics, cookies, crash reports, or telemetry.**

---

## 2. Why We Collect This Information

1. **User Settings** – to remember your visual preferences and feature choices between browsing sessions.  
2. **Feed Cache** – to speed up popup loading and avoid running the feed scanner multiple times while you stay on a page.  
3. **Network Requests** – to retrieve additional data required for functionality:  
   • fetch candidate feed files,  
   • fetch YouTube page markup (for channel feeds),  
   • download optional theme definitions.

---

## 3. How We Store and Protect Your Data

| Storage                                      | Location                                   | Persistence                                                                               | Encryption                                          |
| -------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `chrome.storage.local` (`firerss_settings`)  | Inside your browser profile on your device | Until you delete it or uninstall the extension                                            | Protected by the browser’s profile mechanisms       |
| `chrome.storage.session` (`firerss_feeds:*`) | In-memory, managed by the browser          | Cleared automatically when the browser window closes or when you press “Clear feed cache” | Not written to disk                                 |
| In-flight network data                       | Standard browser network stack             | Ephemeral                                                                                 | Encrypted (HTTPS) when supported by the destination |

The extension never transmits these data stores to the developer or any third-party service.

---

## 4. Retention Periods

| Data             | Retention                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Settings    | Kept until you: 1) reset/clear extension data via browser UI, or 2) uninstall FireRSS.                                                                                                        |
| Feed Cache       | Cleared when: 1) the browser session ends, 2) you click “Clear feed cache” (triggered automatically when ignored-site list or extended scan setting changes), or 3) you remove the extension. |
| Network Requests | No storage; retained only in browser network logs (if enabled).                                                                                                                               |

---

## 5. Sharing and Third-Party Services

FireRSS **does not** share any collected information with analytics providers, advertising networks, or the extension author.

External requests performed by the extension:

1. **Current website** – necessary to inject feed-scanner or verify guessed feed URLs.  
2. **YouTube** – only when the visited URL is a YouTube channel; retrieves public “About” page to locate the channel’s feed link.  
3. **GitHub API** – anonymous GET to list optional theme files.  

All requests use HTTPS where available and include only the default headers your browser adds (e.g. `User-Agent`, `Accept`). No additional identifiers or tokens are attached.

---

## 6. Your Choices & Control

| Action                             | How to Perform                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Change appearance or behaviour** | Open the FireRSS options page → adjust colour-scheme, theme, ignored sites, extended feed scan.                                               |
| **Clear feed cache**               | Options page → change ignored sites or extended feed scan (automatically clears), or click “Clear feed cache” if available.                   |
| **Delete all extension data**      | Browser settings → _Extensions_ → _Details_ → “Remove” FireRSS **or** “Clear data”.                                                         |
| **Opt out of remote theme list**   | Simply avoid opening the theme selector; FireRSS contacts GitHub only when the options page loads the list.                                    |
| **Block all external requests**    | Use browser-level network filtering/firewall extensions; FireRSS will continue to work but may not display remote themes or detect some feeds. |

---

## 7. Permissions Explained

FireRSS requests the following Chrome Extension Manifest v3 permissions:

| Permission                                       | Reason                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `activeTab`                                      | Allows the extension to run the feed-scanner on the currently active tab only when needed.      |
| `scripting`                                      | Injects a lightweight script to parse the page’s DOM for feed links.                            |
| `storage`                                        | Saves user settings (`chrome.storage.local`) and session feed cache (`chrome.storage.session`). |
| `host_permissions` (`https://*/*`, `http://*/*`) | Enables fetching candidate feed URLs and remote theme files from any site you visit.            |

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
