import { Settings } from '../types/settings_interface';

export const ApplyTheme = (theme?: Settings['theme']) => {
    if (!theme || theme.name === 'default') {
        document.documentElement.removeAttribute('style');
        return;
    } else {
        document.documentElement.removeAttribute('style');
        for (const key in theme.colors) {
            document.documentElement.style.setProperty(`--bg-${key}`, theme.colors[key].background);
            document.documentElement.style.setProperty(`--fg-${key}`, theme.colors[key].foreground);
            document.documentElement.style.setProperty(`--active-${key}`, theme.colors[key].active);
            document.documentElement.style.setProperty(`--inactive-${key}`, theme.colors[key].inactive);
        }
    }
};

chrome.storage.local.onChanged.addListener((changes) => {
    const new_settings = changes.firerss_settings?.newValue as Settings | undefined;
    if (new_settings) {
        ApplyTheme(new_settings.theme);
    }
});
