import { ApplyColorScheme } from './lib/color_scheme';
import { ApplyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

let settings: Settings;

const initPopup = async () => {
    ApplyColorScheme(settings.color_scheme);
    ApplyTheme(settings.theme);

    const popup_url = new URL(window.location.href);
    const feed_urls: string[] = JSON.parse(popup_url.searchParams.get('feedlinks'));
    const feed_list = document.getElementById('feed_url_list');

    document.getElementById('settings_button').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById('exclude_site_button').addEventListener('click', async () => {
        const current_tab = await chrome.tabs.query({ active: true, currentWindow: true });
        if (current_tab.length === 0) return;
        const current_url = new URL(current_tab[0].url);
        const new_entry = {
            pattern: current_url.hostname,
            match_type: 'subdomain' as 'contains' | 'domain' | 'subdomain'
        };
        settings.ignored_sites.push(new_entry);
        chrome.storage.local.set({ firerss_settings: settings });
        chrome.runtime.sendMessage({ type: 'exclude_site', url: current_tab[0].url, tabId: current_tab[0].id });
        window.close();
    });

    for (let feed_url of feed_urls) {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');
        const td3 = document.createElement('td');
        const a = document.createElement('a');
        const info_div = document.createElement('div');
        const copy_btn = document.createElement('button');

        if (feed_url.startsWith('_')) {
            info_div.setAttribute('class', 'help-icon');
            info_div.setAttribute('aria-label', 'This feed was found by Extended Feed Scan');
            info_div.innerText = '!';
            feed_url = feed_url.slice(1);
        }

        td1.setAttribute('class', 'col1 feed_url');
        td2.setAttribute('class', 'col2 info_button_area');
        td3.setAttribute('class', 'col3 copy_button_area');
        a.setAttribute('class', 'feed_url_link');
        a.setAttribute('target', '_blank');
        a.setAttribute('href', feed_url);
        a.setAttribute('title', feed_url);
        a.innerText = feed_url;
        copy_btn.setAttribute('class', 'copy_button');
        copy_btn.setAttribute('title', 'Copy to clipboard');
        copy_btn.setAttribute('value', feed_url);
        copy_btn.innerText = 'Copy';

        td1.appendChild(a);
        if (info_div.innerText) {
            td2.appendChild(info_div);
            td2.appendChild(document.createTextNode('\u00A0'));
        }
        td3.appendChild(copy_btn);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        feed_list.appendChild(tr);
    }

    const copy_buttons = document.querySelectorAll('.copy_button');
    for (const button of Array.from(copy_buttons)) {
        button.addEventListener('click', async (event) => {
            const feed_url = (event.target as HTMLButtonElement).value;
            await navigator.clipboard.writeText(feed_url);
            (button as HTMLButtonElement).innerText = 'Copied!';
            setTimeout(() => {
                (button as HTMLButtonElement).innerText = 'Copy';
            }, 2000);
        });
    }

    const iconButtons = document.querySelectorAll('.icon-button[data-href]');
    for (const btn of Array.from(iconButtons)) {
        btn.addEventListener('click', (event) => {
            const href = (event.currentTarget as HTMLElement).getAttribute('data-href');
            if (href) {
                window.open(href, '_blank');
            }
        });
    }
};
chrome.storage.local.get('firerss_settings', (setting) => {
    settings = setting.firerss_settings;
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initPopup();
    } else {
        document.addEventListener('DOMContentLoaded', initPopup, { once: true });
    }
});
