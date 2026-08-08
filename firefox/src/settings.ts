import { ApplyColorScheme } from './lib/color_scheme';
import {
    CreateLegacySettingsBackupExport,
    CreateSettingsExport,
    DismissMigrationNotice,
    GetLegacySettingsBackup,
    GetSettings,
    IsMigrationNoticePending,
    IsSettingsSyncEnabled,
    LegacySettingsBackup,
    ParseSettingsExport,
    ResetSettings,
    SaveSettings,
    SetSettingsSyncEnabled,
} from './lib/settings_storage';
import { ApplyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

let settings: Settings;
let theme_selector: HTMLSelectElement;
let color_scheme_buttons: HTMLButtonElement[];
let ignored_urls_summary: HTMLElement;
let feed_templates_summary: HTMLElement;
let extended_scan_exclusions_summary: HTMLElement;
let extended_feed_scan_buttons: HTMLButtonElement[];
let settings_sync_buttons: HTMLButtonElement[];
let settings_status: HTMLElement;
let sync_confirmation_pending = false;
let reset_button: HTMLButtonElement;
let reset_confirmation_step = 0;
let reset_confirmation_timeout: number | undefined;
let remote_themes_loaded = false;
let legacy_settings_backup: LegacySettingsBackup | undefined;
let migration_notice: HTMLElement;
let migration_notice_details: HTMLElement;
let settings_backup_button: HTMLButtonElement;
let theme_request_id = 0;

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};

const ShowStatus = (message: string) => {
    settings_status.textContent = message;
    settings_status.title = message;
};

const formatEntryCount = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;

const DownloadJson = (contents: string, filename: string) => {
    const blob_url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = blob_url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blob_url);
};

const EnsureThemeOption = (url: string, name: string) => {
    if (Array.from(theme_selector.options).some((option) => option.value === url)) return;
    const option = document.createElement('option');
    option.value = url;
    option.innerText = name;
    theme_selector.appendChild(option);
};

const UpdateColorSchemeButtons = (color_scheme: Settings['color_scheme']) => {
    for (const button of color_scheme_buttons) {
        const is_active = button.value === color_scheme;
        button.classList.toggle('active', is_active);
        button.setAttribute('aria-pressed', is_active.toString());
    }
};

const UpdateExtendedFeedScanButtons = (opt: Settings['extended_feed_scan']) => {
    for (const button of extended_feed_scan_buttons) {
        const is_active = button.value === opt.toString();
        button.classList.toggle('active', is_active);
        button.setAttribute('aria-pressed', is_active.toString());
    }
};

const UpdateSyncButtons = (enabled: boolean) => {
    for (const button of settings_sync_buttons) {
        const is_active = button.value === (enabled ? '1' : '0');
        button.classList.toggle('active', is_active);
        button.setAttribute('aria-pressed', is_active.toString());
    }
};

const RenderSettings = async () => {
    EnsureThemeOption(settings.theme.url, settings.theme.name);
    UpdateColorSchemeButtons(settings.color_scheme);
    ApplyColorScheme(settings.color_scheme);
    ApplyTheme(settings.theme);
    UpdateExtendedFeedScanButtons(settings.extended_feed_scan);
    UpdateSyncButtons(await IsSettingsSyncEnabled());
    theme_selector.value = settings.theme.url;
    ignored_urls_summary.textContent = formatEntryCount(settings.ignored_sites.length);
    feed_templates_summary.textContent = formatEntryCount(settings.feed_templates.length);
    extended_scan_exclusions_summary.textContent = formatEntryCount(settings.extended_scan_exclusions.length);
};

const SaveColorScheme = async (color_scheme: Settings['color_scheme']) => {
    settings = await SaveSettings({ ...settings, color_scheme });
    UpdateColorSchemeButtons(settings.color_scheme);
    ApplyColorScheme(settings.color_scheme);
    ShowStatus('Color scheme updated.');
};

const SaveTheme = async (theme_url: string) => {
    const request_id = ++theme_request_id;
    let theme: Settings['theme'];
    if (theme_url === 'default') {
        theme = { name: 'default', url: 'default', colors: {} };
    } else {
        const response = await fetch(theme_url);
        if (!response.ok) throw new Error(`Theme download failed (${response.status}).`);
        const theme_data = await response.json();
        theme = { name: theme_data.theme, url: theme_url, colors: theme_data.colors };
    }
    if (request_id !== theme_request_id) return;
    settings = await SaveSettings({ ...settings, theme });
    ApplyTheme(settings.theme);
    ShowStatus('Theme updated.');
};

const ToggleExtendedFeedScan = async (opt: Settings['extended_feed_scan']) => {
    settings = await SaveSettings({ ...settings, extended_feed_scan: opt });
    UpdateExtendedFeedScanButtons(settings.extended_feed_scan);
    ShowStatus('Extended Feed Scan updated.');
};

const ToggleSettingsSync = async (enabled: boolean) => {
    if (enabled && !(await IsSettingsSyncEnabled()) && !sync_confirmation_pending) {
        sync_confirmation_pending = true;
        ShowStatus(
            'Firefox cannot verify Mozilla account status. Enable Mozilla Sync and Add-ons, then click On again. Existing synced FireRSS settings, if present, will replace local settings.'
        );
        return;
    }
    sync_confirmation_pending = false;
    settings = await SetSettingsSyncEnabled(enabled);
    await RenderSettings();
    await RenderMigrationBackup();
    ShowStatus(
        enabled
            ? 'Browser sync enabled. Available synced settings were applied.'
            : 'Browser sync disabled. Existing synced data was kept.'
    );
};

const ExportSettings = async () => {
    const current_settings = await GetSettings();
    DownloadJson(
        CreateSettingsExport(current_settings),
        `firerss-settings-${new Date().toISOString().slice(0, 10)}.json`
    );
    ShowStatus('Settings exported.');
};

const RenderMigrationBackup = async () => {
    legacy_settings_backup = await GetLegacySettingsBackup();
    settings_backup_button.hidden = !legacy_settings_backup;
    migration_notice.hidden = !legacy_settings_backup || !(await IsMigrationNoticePending());
    migration_notice_details.textContent = legacy_settings_backup
        ? `Backup created ${new Date(legacy_settings_backup.created_at).toLocaleString()} from ${legacy_settings_backup.source} schema v${legacy_settings_backup.schema_version}.`
        : '';
};

const DownloadLegacyBackup = () => {
    if (!legacy_settings_backup) throw new Error('No legacy settings backup is available.');
    DownloadJson(
        CreateLegacySettingsBackupExport(legacy_settings_backup),
        `firerss-legacy-settings-v${legacy_settings_backup.schema_version}-${legacy_settings_backup.created_at.slice(0, 10)}.json`
    );
    ShowStatus('Legacy settings backup downloaded. It can be restored with Import.');
};

const ImportSettings = async (file: File) => {
    const imported = ParseSettingsExport(JSON.parse(await file.text()) as unknown);
    settings = await SaveSettings(imported);
    await RenderSettings();
    ShowStatus('Settings imported successfully.');
};

const ResetAllOptions = async () => {
    if (reset_confirmation_step < 2) {
        reset_confirmation_step++;
        reset_button.textContent = reset_confirmation_step === 1 ? 'Confirm Reset' : 'Final Confirmation';
        reset_button.classList.add('active');
        ShowStatus(
            reset_confirmation_step === 1
                ? 'Click Confirm Reset within 10 seconds (step 2 of 3).'
                : 'Click Final Confirmation within 10 seconds to reset all options, disable Browser Sync, and delete the legacy backup (step 3 of 3).'
        );
        if (reset_confirmation_timeout !== undefined) window.clearTimeout(reset_confirmation_timeout);
        reset_confirmation_timeout = window.setTimeout(() => {
            reset_confirmation_step = 0;
            reset_confirmation_timeout = undefined;
            reset_button.textContent = 'Reset';
            reset_button.classList.remove('active');
            ShowStatus('Reset cancelled.');
        }, 10_000);
        return;
    }

    if (reset_confirmation_timeout !== undefined) window.clearTimeout(reset_confirmation_timeout);
    reset_confirmation_step = 0;
    reset_confirmation_timeout = undefined;
    reset_button.disabled = true;
    for (const button of settings_sync_buttons) button.disabled = true;
    reset_button.textContent = 'Resetting...';
    reset_button.classList.remove('active');
    try {
        settings = await ResetSettings();
        await RenderSettings();
        await RenderMigrationBackup();
        ShowStatus('All options were reset. Browser Sync, synced FireRSS data, and the legacy backup were removed.');
    } finally {
        reset_button.disabled = false;
        for (const button of settings_sync_buttons) button.disabled = false;
        reset_button.textContent = 'Reset';
    }
};

const LoadRemoteThemes = async () => {
    if (remote_themes_loaded) return;
    remote_themes_loaded = true;
    try {
        const response = await fetch('https://api.github.com/repos/mt190502/firerss/contents/themes');
        if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
        const themes = (await response.json()) as { name: string; download_url: string }[];
        for (const theme of themes) {
            EnsureThemeOption(
                theme.download_url,
                theme.name.charAt(0).toUpperCase() + theme.name.slice(1).replace('.json', '')
            );
        }
        theme_selector.value = settings.theme.url;
        ShowStatus('Optional themes loaded.');
    } catch (error: unknown) {
        remote_themes_loaded = false;
        console.error('Error: FireRSS: Failed to load remote themes', error);
        ShowStatus('Optional themes could not be loaded from GitHub.');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    color_scheme_buttons = Array.from(document.querySelectorAll('.color_scheme_button')) as HTMLButtonElement[];
    theme_selector = document.getElementById('theme_selector') as HTMLSelectElement;
    ignored_urls_summary = document.getElementById('ignored_urls_summary') as HTMLElement;
    feed_templates_summary = document.getElementById('feed_templates_summary') as HTMLElement;
    extended_scan_exclusions_summary = document.getElementById('extended_scan_exclusions_summary') as HTMLElement;
    extended_feed_scan_buttons = Array.from(
        document.querySelectorAll('.extended_feed_scan_button')
    ) as HTMLButtonElement[];
    settings_sync_buttons = Array.from(document.querySelectorAll('.settings_sync_button')) as HTMLButtonElement[];
    settings_status = document.getElementById('settings_status') as HTMLElement;
    migration_notice = document.getElementById('migration_notice') as HTMLElement;
    migration_notice_details = document.getElementById('migration_notice_details') as HTMLElement;
    settings_backup_button = document.getElementById('settings_backup_button') as HTMLButtonElement;
    const migration_download_button = document.getElementById('migration_download_button') as HTMLButtonElement;
    const migration_dismiss_button = document.getElementById('migration_dismiss_button') as HTMLButtonElement;
    const export_button = document.getElementById('settings_export_button') as HTMLButtonElement;
    const import_button = document.getElementById('settings_import_button') as HTMLButtonElement;
    const import_file = document.getElementById('settings_import_file') as HTMLInputElement;
    reset_button = document.getElementById('settings_reset_button') as HTMLButtonElement;
    const edit_ignored_urls = document.getElementById('edit_ignored_urls') as HTMLButtonElement;
    const edit_feed_templates = document.getElementById('edit_feed_templates') as HTMLButtonElement;
    const edit_extended_scan_exclusions = document.getElementById('edit_extended_scan_exclusions') as HTMLButtonElement;

    settings = await GetSettings();
    await RenderSettings();
    await RenderMigrationBackup();

    for (const button of color_scheme_buttons) {
        button.addEventListener('click', async () => {
            try {
                await SaveColorScheme(button.value as Settings['color_scheme']);
            } catch (error: unknown) {
                ShowStatus(getErrorMessage(error));
            }
        });
    }
    for (const button of extended_feed_scan_buttons) {
        button.addEventListener('click', async () => {
            try {
                await ToggleExtendedFeedScan(Number(button.value) as Settings['extended_feed_scan']);
            } catch (error: unknown) {
                ShowStatus(getErrorMessage(error));
            }
        });
    }
    for (const button of settings_sync_buttons) {
        button.addEventListener('click', async () => {
            try {
                await ToggleSettingsSync(button.value === '1');
            } catch (error: unknown) {
                ShowStatus(getErrorMessage(error));
            }
        });
    }
    theme_selector.addEventListener('change', async () => {
        try {
            await SaveTheme(theme_selector.value);
        } catch (error: unknown) {
            theme_selector.value = settings.theme.url;
            ShowStatus(getErrorMessage(error));
        }
    });
    const loadRemoteThemes = () => void LoadRemoteThemes();
    theme_selector.addEventListener('pointerdown', loadRemoteThemes);
    theme_selector.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'Enter', ' '].includes(event.key)) loadRemoteThemes();
    });
    edit_ignored_urls.addEventListener('click', () => {
        window.location.href = '/html/list_editor.html?type=ignored';
    });
    edit_feed_templates.addEventListener('click', () => {
        window.location.href = '/html/list_editor.html?type=templates';
    });
    edit_extended_scan_exclusions.addEventListener('click', () => {
        window.location.href = '/html/list_editor.html?type=extended-exclusions';
    });
    export_button.addEventListener('click', async () => {
        try {
            await ExportSettings();
        } catch (error: unknown) {
            ShowStatus(getErrorMessage(error));
        }
    });
    const downloadLegacyBackup = () => {
        try {
            DownloadLegacyBackup();
        } catch (error: unknown) {
            ShowStatus(getErrorMessage(error));
        }
    };
    migration_download_button.addEventListener('click', downloadLegacyBackup);
    settings_backup_button.addEventListener('click', downloadLegacyBackup);
    migration_dismiss_button.addEventListener('click', async () => {
        try {
            await DismissMigrationNotice();
            migration_notice.hidden = true;
            settings_backup_button.focus();
            ShowStatus('Migration notice dismissed. The legacy backup remains available under Import / Export.');
        } catch (error: unknown) {
            ShowStatus(getErrorMessage(error));
        }
    });
    import_button.addEventListener('click', () => import_file.click());
    import_file.addEventListener('change', async () => {
        const file = import_file.files?.[0];
        if (!file) return;
        try {
            await ImportSettings(file);
        } catch (error: unknown) {
            ShowStatus(getErrorMessage(error));
        } finally {
            import_file.value = '';
        }
    });
    reset_button.addEventListener('click', async () => {
        try {
            await ResetAllOptions();
        } catch (error: unknown) {
            ShowStatus(getErrorMessage(error));
        }
    });

    browser.storage.onChanged.addListener((changes, area_name) => {
        if (area_name !== 'local') return;
        void (async () => {
            if (changes.firerss_settings) settings = await GetSettings();
            if (changes.firerss_settings || changes.firerss_sync_enabled) await RenderSettings();
            if (changes.firerss_legacy_settings_backup || changes.firerss_migration_notice_pending) {
                await RenderMigrationBackup();
            }
        })();
    });
});
