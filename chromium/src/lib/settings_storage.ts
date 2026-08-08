import { Settings, UrlRule } from '../types/settings_interface';

const settings_key = 'firerss_settings';
const sync_enabled_key = 'firerss_sync_enabled';
const legacy_backup_key = 'firerss_legacy_settings_backup';
const migration_notice_key = 'firerss_migration_notice_pending';
const sync_item_limit = 8192;
const export_format = 'firerss-settings';
const export_schema_version = 3;
const color_keys = ['background', 'foreground', 'active', 'inactive'] as const;
let sync_operation_generation = 0;

const default_ignored_sites: Settings['ignored_sites'] = [
    { pattern: 'retrotool.io', match_type: 'domain' },
    { pattern: 'wallhaven.cc', match_type: 'domain' },
    { pattern: 'live.com', match_type: 'domain' },
    { pattern: 'pkgs.org', match_type: 'domain' },
    { pattern: 'fiverr.com', match_type: 'domain' },
    ...['duckduckgo', 'icloud', 'linkedin', 'outlook', 'telegram', 'upwork'].map((pattern) => ({
        pattern,
        match_type: 'contains' as const,
    })),
];

const default_extended_scan_exclusions: Settings['extended_scan_exclusions'] = [
    { pattern: 'deepl.com', match_type: 'domain' },
    { pattern: 'jetbrains.com', match_type: 'domain' },
    { pattern: 'gitlab.com', match_type: 'domain' },
    { pattern: 'linuxfoundation.org', match_type: 'domain' },
    ...[
        'amazon',
        'apple',
        'bing',
        'dailymotion',
        'facebook',
        'google',
        'hetzner',
        'instagram',
        'netflix',
        'reddit',
        'soundcloud',
        'spotify',
        'twitter',
        'vimeo',
        'whatsapp',
        'yahoo',
        'yandex',
    ].map((pattern) => ({ pattern, match_type: 'contains' as const })),
];

const default_feed_templates: Settings['feed_templates'] = [
    {
        page_url_template: 'https://t.me/<username>',
        feed_url_template:
            'https://rss-bridge.org/bridge01/?action=display&bridge=TelegramBridge&username=<username>&format=Atom',
    },
    {
        page_url_template: 'https://youtube.com/channel/<channel_id>',
        feed_url_template: 'https://www.youtube.com/feeds/videos.xml?channel_id=<channel_id>',
    },
];

const default_settings: Settings = {
    color_scheme: 'system',
    theme: { name: 'default', url: 'default', colors: {} },
    ignored_sites: default_ignored_sites,
    extended_scan_exclusions: default_extended_scan_exclusions,
    feed_templates: default_feed_templates,
    extended_feed_scan: 0,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};

const isAllowedThemeUrl = (value: string): boolean => {
    if (value === 'default') return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com';
    } catch {
        return false;
    }
};

const isTheme = (value: unknown): value is Settings['theme'] => {
    if (
        !isRecord(value) ||
        typeof value.name !== 'string' ||
        typeof value.url !== 'string' ||
        !isAllowedThemeUrl(value.url) ||
        !isRecord(value.colors)
    ) {
        return false;
    }
    return Object.values(value.colors).every(
        (color) => isRecord(color) && color_keys.every((key) => typeof color[key] === 'string')
    );
};

const isUrlRules = (value: unknown): value is UrlRule[] => {
    return (
        Array.isArray(value) &&
        value.every(
            (site) =>
                isRecord(site) &&
                typeof site.pattern === 'string' &&
                site.pattern.trim() !== '' &&
                ['contains', 'domain', 'subdomain'].includes(String(site.match_type))
        )
    );
};

const isFeedTemplates = (value: unknown): value is Settings['feed_templates'] => {
    return (
        Array.isArray(value) &&
        value.every(
            (template) =>
                isRecord(template) &&
                typeof template.page_url_template === 'string' &&
                template.page_url_template.trim() !== '' &&
                typeof template.feed_url_template === 'string' &&
                template.feed_url_template.trim() !== ''
        )
    );
};

type LegacySettingsV1 = Omit<
    Settings,
    'color_scheme' | 'extended_feed_scan' | 'extended_scan_exclusions' | 'feed_templates' | 'ignored_sites' | 'theme'
> & {
    color_scheme?: Settings['color_scheme'];
    extended_feed_scan?: Settings['extended_feed_scan'];
    theme: Settings['theme'] | 'default' | Settings['color_scheme'];
    ignored_sites: (UrlRule | string)[];
};
type LegacySettingsV2 = LegacySettingsV1 & Pick<Settings, 'feed_templates'>;

export interface LegacySettingsBackup {
    created_at: string;
    schema_version: 1 | 2;
    source: 'local' | 'sync';
    settings: LegacySettingsV1 | LegacySettingsV2;
}

const isLegacySettings = (value: unknown): value is LegacySettingsV1 => {
    if (!isRecord(value)) return false;
    return (
        (value.color_scheme === undefined || ['dark', 'light', 'system'].includes(String(value.color_scheme))) &&
        (['default', 'dark', 'light', 'system'].includes(String(value.theme)) || isTheme(value.theme)) &&
        Array.isArray(value.ignored_sites) &&
        value.ignored_sites.every((site) => (typeof site === 'string' && site.trim() !== '') || isUrlRules([site])) &&
        (value.extended_feed_scan === undefined ||
            (typeof value.extended_feed_scan === 'number' && [0, 1, 2].includes(value.extended_feed_scan)))
    );
};

const isVersion2Settings = (value: unknown): value is LegacySettingsV2 => {
    return isLegacySettings(value) && isFeedTemplates((value as LegacySettingsV2).feed_templates);
};

const IsSettings = (value: unknown): value is Settings => {
    return (
        isRecord(value) &&
        isVersion2Settings(value) &&
        ['dark', 'light', 'system'].includes(String(value.color_scheme)) &&
        isTheme(value.theme) &&
        isUrlRules(value.ignored_sites) &&
        typeof value.extended_feed_scan === 'number' &&
        [0, 1, 2].includes(value.extended_feed_scan) &&
        isUrlRules((value as Record<string, unknown>).extended_scan_exclusions)
    );
};

const isLegacySettingsBackup = (value: unknown): value is LegacySettingsBackup => {
    return (
        isRecord(value) &&
        typeof value.created_at === 'string' &&
        [1, 2].includes(Number(value.schema_version)) &&
        ['local', 'sync'].includes(String(value.source)) &&
        isLegacySettings(value.settings)
    );
};

const BackupLegacySettings = async (value: unknown, source: LegacySettingsBackup['source']) => {
    let backup_settings = isLegacySettings(value) && !IsSettings(value) ? value : undefined;
    let backup_source = source;
    if (source === 'sync') {
        const local_settings = (await chrome.storage.local.get(settings_key))[settings_key];
        if (isLegacySettings(local_settings) && !IsSettings(local_settings)) {
            backup_settings = local_settings;
            backup_source = 'local';
        }
    }
    const existing = (await chrome.storage.local.get(legacy_backup_key))[legacy_backup_key];
    if (isLegacySettingsBackup(existing)) return;
    if (!backup_settings) return;
    const backup: LegacySettingsBackup = {
        created_at: new Date().toISOString(),
        schema_version: isVersion2Settings(backup_settings) ? 2 : 1,
        source: backup_source,
        settings: backup_settings,
    };
    await chrome.storage.local.set({ [legacy_backup_key]: backup, [migration_notice_key]: true });
};

const isSameUrlRule = (first: UrlRule, second: UrlRule) => {
    return first.pattern === second.pattern && first.match_type === second.match_type;
};

const isDefaultExtendedScanExclusion = (rule: UrlRule) => {
    return default_extended_scan_exclusions.some((exclusion) => isSameUrlRule(rule, exclusion));
};

const NormalizeUrlRules = (value: unknown): UrlRule[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const rules = value.map((site): UrlRule | undefined => {
        if (isUrlRules([site])) return { ...site };
        if (typeof site !== 'string' || site.trim() === '') return undefined;
        const original_pattern = site.trim();
        const migrated_pattern = original_pattern
            .replace(/^\(\.\*\)\.?/, '')
            .replace(/\.?\(\.\*\)$/, '')
            .replaceAll('\\.', '.');
        return { pattern: migrated_pattern || original_pattern, match_type: 'contains' };
    });
    return rules.every((rule): rule is UrlRule => rule !== undefined) ? rules : undefined;
};

export const NormalizeSettings = (value: unknown): Settings => {
    const stored = isRecord(value) ? value : {};
    const stored_ignored_sites = NormalizeUrlRules(stored.ignored_sites) ?? default_settings.ignored_sites;
    const stored_extended_scan_exclusions = isUrlRules(stored.extended_scan_exclusions)
        ? stored.extended_scan_exclusions
        : undefined;
    const migrated_ignored_sites = stored_extended_scan_exclusions
        ? stored_ignored_sites
        : stored_ignored_sites.filter((rule) => !isDefaultExtendedScanExclusion(rule));
    const stored_color_scheme = ['dark', 'light', 'system'].includes(String(stored.color_scheme))
        ? stored.color_scheme
        : stored.theme;
    return {
        color_scheme: ['dark', 'light', 'system'].includes(String(stored_color_scheme))
            ? (stored_color_scheme as Settings['color_scheme'])
            : default_settings.color_scheme,
        theme: isTheme(stored.theme) ? stored.theme : default_settings.theme,
        ignored_sites: migrated_ignored_sites.map((site) => ({ ...site })),
        extended_scan_exclusions: (stored_extended_scan_exclusions ?? default_settings.extended_scan_exclusions).map(
            (site) => ({ ...site })
        ),
        feed_templates: (isFeedTemplates(stored.feed_templates)
            ? stored.feed_templates
            : default_settings.feed_templates
        ).map((template) => ({ ...template })),
        extended_feed_scan: [0, 1, 2].includes(Number(stored.extended_feed_scan))
            ? (Number(stored.extended_feed_scan) as Settings['extended_feed_scan'])
            : default_settings.extended_feed_scan,
    };
};

export const GetSettings = async (): Promise<Settings> => {
    const stored = (await chrome.storage.local.get(settings_key))[settings_key];
    const settings = NormalizeSettings(stored);
    if (!IsSettings(stored)) {
        await BackupLegacySettings(stored, 'local');
        await chrome.storage.local.set({ [settings_key]: settings });
    }
    return settings;
};

export const IsSettingsSyncEnabled = async (): Promise<boolean> => {
    return (await chrome.storage.local.get(sync_enabled_key))[sync_enabled_key] === true;
};

const EnsureSyncQuota = (settings: Settings) => {
    const bytes = new TextEncoder().encode(JSON.stringify(settings)).length + settings_key.length;
    if (bytes > sync_item_limit) {
        throw new Error(`Settings use ${bytes} bytes; browser sync allows at most ${sync_item_limit} bytes per item.`);
    }
};

export const SaveSettings = async (settings: Settings): Promise<Settings> => {
    const normalized = NormalizeSettings(settings);
    const sync_enabled = await IsSettingsSyncEnabled();
    if (sync_enabled) EnsureSyncQuota(normalized);
    await chrome.storage.local.set({ [settings_key]: normalized });
    if (sync_enabled) {
        try {
            await chrome.storage.sync.set({ [settings_key]: normalized });
        } catch (error: unknown) {
            throw new Error(`Settings were saved locally, but Browser Sync failed: ${getErrorMessage(error)}`, {
                cause: error,
            });
        }
    }
    return normalized;
};

export const ResetSettings = async (): Promise<Settings> => {
    sync_operation_generation++;
    const settings = NormalizeSettings({});
    await chrome.storage.local.set({ [sync_enabled_key]: false });
    await chrome.storage.sync.remove(settings_key);
    await chrome.storage.local.set({ [settings_key]: settings });
    await chrome.storage.local.remove([legacy_backup_key, migration_notice_key]);
    return settings;
};

export const SetSettingsSyncEnabled = async (enabled: boolean): Promise<Settings> => {
    const operation_generation = ++sync_operation_generation;
    const EnsureCurrentOperation = () => {
        if (operation_generation !== sync_operation_generation) {
            throw new Error('Browser Sync change was cancelled by a newer settings operation.');
        }
    };
    const local_settings = await GetSettings();
    EnsureCurrentOperation();
    if (!enabled) {
        await chrome.storage.local.set({ [sync_enabled_key]: false });
        return local_settings;
    }

    const profile = await chrome.identity.getProfileUserInfo({ accountStatus: chrome.identity.AccountStatus.SYNC });
    EnsureCurrentOperation();
    if (!profile.id) {
        throw new Error('Sign in to a Google account and enable Chrome Sync before enabling FireRSS sync.');
    }

    const synced = (await chrome.storage.sync.get(settings_key))[settings_key];
    EnsureCurrentOperation();
    const has_synced_settings = isLegacySettings(synced);
    if (has_synced_settings) await BackupLegacySettings(synced, 'sync');
    EnsureCurrentOperation();
    const settings = has_synced_settings ? NormalizeSettings(synced) : local_settings;
    EnsureSyncQuota(settings);
    if (has_synced_settings) {
        await chrome.storage.local.set({ [settings_key]: settings });
    } else {
        await chrome.storage.sync.set({ [settings_key]: settings });
    }
    EnsureCurrentOperation();
    await chrome.storage.local.set({ [sync_enabled_key]: true });
    return settings;
};

export const RegisterSettingsSync = () => {
    chrome.storage.onChanged.addListener((changes, area_name) => {
        if (area_name !== 'sync' || !changes[settings_key]) return;
        if (changes[settings_key].newValue === undefined) {
            void chrome.storage.local.set({ [sync_enabled_key]: false });
            return;
        }
        if (!isLegacySettings(changes[settings_key].newValue)) return;
        void IsSettingsSyncEnabled().then(async (enabled) => {
            if (!enabled) return;
            const synced = changes[settings_key].newValue;
            await BackupLegacySettings(synced, 'sync');
            if (!(await IsSettingsSyncEnabled())) return;
            await chrome.storage.local.set({ [settings_key]: NormalizeSettings(synced) });
        });
    });

    void IsSettingsSyncEnabled().then(async (enabled) => {
        if (!enabled) return;
        const synced = (await chrome.storage.sync.get(settings_key))[settings_key];
        if (isLegacySettings(synced)) {
            await BackupLegacySettings(synced, 'sync');
            if (!(await IsSettingsSyncEnabled())) return;
            await chrome.storage.local.set({ [settings_key]: NormalizeSettings(synced) });
        }
    });
};

export const GetLegacySettingsBackup = async (): Promise<LegacySettingsBackup | undefined> => {
    const backup = (await chrome.storage.local.get(legacy_backup_key))[legacy_backup_key];
    return isLegacySettingsBackup(backup) ? backup : undefined;
};

export const IsMigrationNoticePending = async (): Promise<boolean> => {
    const stored = await chrome.storage.local.get([legacy_backup_key, migration_notice_key]);
    return isLegacySettingsBackup(stored[legacy_backup_key]) && stored[migration_notice_key] !== false;
};

export const DismissMigrationNotice = async () => {
    await chrome.storage.local.set({ [migration_notice_key]: false });
};

export const CreateLegacySettingsBackupExport = (backup: LegacySettingsBackup): string => {
    return JSON.stringify(
        {
            format: export_format,
            schema_version: backup.schema_version,
            exported_at: new Date().toISOString(),
            backup_created_at: backup.created_at,
            backup_source: backup.source,
            settings: backup.settings,
        },
        null,
        4
    );
};

export const CreateSettingsExport = (settings: Settings): string => {
    return JSON.stringify(
        {
            format: export_format,
            schema_version: export_schema_version,
            exported_at: new Date().toISOString(),
            settings: NormalizeSettings(settings),
        },
        null,
        4
    );
};

export const ParseSettingsExport = (value: unknown): Settings => {
    if (isLegacySettings(value)) return NormalizeSettings(value);
    if (!isRecord(value) || value.format !== export_format) {
        throw new Error('The selected file is not a valid FireRSS settings export.');
    }
    const schema_version = Number(value.schema_version);
    const is_valid =
        (schema_version === 1 && isLegacySettings(value.settings)) ||
        (schema_version === 2 && isVersion2Settings(value.settings)) ||
        (schema_version === export_schema_version && IsSettings(value.settings));
    if (!is_valid) throw new Error('The selected file is not a valid FireRSS settings export.');
    return NormalizeSettings(value.settings);
};
