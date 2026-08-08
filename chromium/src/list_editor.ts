import { ApplyColorScheme } from './lib/color_scheme';
import { GetSettings, SaveSettings } from './lib/settings_storage';
import { ApplyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

type EditorType = 'extended-exclusions' | 'ignored' | 'templates';
type MatchMode = Settings['ignored_sites'][number]['match_type'];

const requested_editor_type = new URL(window.location.href).searchParams.get('type');
const editor_type: EditorType =
    requested_editor_type === 'templates' || requested_editor_type === 'extended-exclusions'
        ? requested_editor_type
        : 'ignored';
let settings: Settings;
let editing_index: number | undefined;
let selected_mode: MatchMode = 'subdomain';

const editor_title = document.getElementById('editor_title') as HTMLElement;
const editor_description = document.getElementById('editor_description') as HTMLElement;
const list_title = document.getElementById('list_title') as HTMLElement;
const item_count = document.getElementById('item_count') as HTMLElement;
const editor_list = document.getElementById('editor_list') as HTMLElement;
const empty_message = document.getElementById('empty_message') as HTMLElement;
const editor_status = document.getElementById('editor_status') as HTMLElement;
const ignored_form = document.getElementById('ignored_form') as HTMLElement;
const templates_form = document.getElementById('templates_form') as HTMLElement;
const ignored_pattern = document.getElementById('ignored_pattern') as HTMLInputElement;
const page_url_template = document.getElementById('page_url_template') as HTMLInputElement;
const feed_url_template = document.getElementById('feed_url_template') as HTMLInputElement;
const save_button = document.getElementById('save_button') as HTMLButtonElement;
const cancel_button = document.getElementById('cancel_button') as HTMLButtonElement;
const mode_buttons = Array.from(document.querySelectorAll('.mode_button')) as HTMLButtonElement[];

const GetUrlRules = (source = settings) => {
    return editor_type === 'ignored' ? source.ignored_sites : source.extended_scan_exclusions;
};

const cloneSettingsForEdit = (): Settings => ({
    ...settings,
    ignored_sites: [...settings.ignored_sites],
    extended_scan_exclusions: [...settings.extended_scan_exclusions],
    feed_templates: [...settings.feed_templates],
});

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};

const ShowStatus = (message: string) => {
    editor_status.textContent = message;
    editor_status.title = message;
};

const ClearStatus = () => {
    editor_status.textContent = '';
    editor_status.title = '';
};

const formatEntryCount = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;

const SetMode = (mode: MatchMode) => {
    selected_mode = mode;
    for (const button of mode_buttons) {
        const is_active = button.dataset.mode === mode;
        button.classList.toggle('active', is_active);
        button.setAttribute('aria-pressed', is_active.toString());
    }
};

const ResetForm = () => {
    editing_index = undefined;
    ignored_pattern.value = '';
    page_url_template.value = '';
    feed_url_template.value = '';
    save_button.textContent = 'Add';
    cancel_button.hidden = true;
    SetMode('subdomain');
    ClearStatus();
};

const ValidateTemplate = (page_template: string, feed_template: string) => {
    if (!/^https?:\/\//i.test(page_template) || !/^https?:\/\//i.test(feed_template)) {
        throw new Error('Both templates must start with http:// or https://.');
    }
    const page_placeholders = new Set(
        Array.from(page_template.matchAll(/<([a-zA-Z_][a-zA-Z0-9_]*)>/g), (match) => match[1])
    );
    const feed_placeholders = Array.from(feed_template.matchAll(/<([a-zA-Z_][a-zA-Z0-9_]*)>/g), (match) => match[1]);
    if (feed_placeholders.some((placeholder) => !page_placeholders.has(placeholder))) {
        throw new Error('The feed template contains a placeholder that is not defined by the page template.');
    }
};

const BeginEdit = (index: number) => {
    ClearStatus();
    editing_index = index;
    save_button.textContent = 'Save';
    cancel_button.hidden = false;
    if (editor_type !== 'templates') {
        const item = GetUrlRules()[index];
        ignored_pattern.value = item.pattern;
        SetMode(item.match_type);
        ignored_pattern.focus();
    } else {
        const item = settings.feed_templates[index];
        page_url_template.value = item.page_url_template;
        feed_url_template.value = item.feed_url_template;
        page_url_template.focus();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const DeleteItem = async (index: number) => {
    const updated_settings = cloneSettingsForEdit();
    if (editor_type !== 'templates') {
        GetUrlRules(updated_settings).splice(index, 1);
    } else {
        updated_settings.feed_templates.splice(index, 1);
    }
    settings = await SaveSettings(updated_settings);
    ResetForm();
    RenderList();
    ShowStatus('Entry deleted.');
};

const RenderList = () => {
    editor_list.replaceChildren();
    const entries = editor_type === 'templates' ? settings.feed_templates : GetUrlRules();
    item_count.textContent = formatEntryCount(entries.length);
    editor_list.hidden = entries.length === 0;
    empty_message.hidden = entries.length !== 0;

    for (let index = 0; index < entries.length; index++) {
        const row = document.createElement('div');
        row.className = 'editor-row';
        row.setAttribute('role', 'listitem');
        const values = document.createElement('div');
        values.className = 'row-values';
        const primary = document.createElement('span');
        primary.className = 'row-primary';
        values.appendChild(primary);

        let entry_name: string;
        if (editor_type !== 'templates') {
            const item = GetUrlRules()[index];
            entry_name = item.pattern;
            primary.textContent = item.pattern;
            const badge = document.createElement('span');
            badge.className = 'mode-badge';
            badge.textContent = item.match_type === 'subdomain' ? 'exact host' : item.match_type;
            primary.appendChild(badge);
        } else {
            const item = settings.feed_templates[index];
            entry_name = item.page_url_template;
            primary.textContent = item.page_url_template;
            const secondary = document.createElement('span');
            secondary.className = 'row-secondary';
            secondary.textContent = `→ ${item.feed_url_template}`;
            values.appendChild(secondary);
        }

        const actions = document.createElement('div');
        actions.className = 'row-actions';
        const edit_button = document.createElement('button');
        edit_button.type = 'button';
        edit_button.textContent = 'Edit';
        edit_button.setAttribute('aria-label', `Edit ${entry_name}`);
        edit_button.addEventListener('click', () => BeginEdit(index));
        const delete_button = document.createElement('button');
        delete_button.type = 'button';
        delete_button.className = 'delete_button';
        delete_button.textContent = 'Delete';
        delete_button.setAttribute('aria-label', `Delete ${entry_name}`);
        delete_button.addEventListener('click', async () => {
            try {
                await DeleteItem(index);
            } catch (error: unknown) {
                ShowStatus(getErrorMessage(error));
            }
        });
        actions.append(edit_button, delete_button);
        row.append(values, actions);
        editor_list.appendChild(row);
    }
};

const SaveCurrentItem = async () => {
    const updated_settings = cloneSettingsForEdit();
    if (editor_type !== 'templates') {
        const rules = GetUrlRules(updated_settings);
        let pattern = ignored_pattern.value.trim();
        if (!pattern) throw new Error('URL pattern cannot be empty.');
        if (selected_mode !== 'contains') {
            try {
                const parsed = new URL(`https://${pattern}`);
                if (
                    parsed.pathname !== '/' ||
                    parsed.search ||
                    parsed.hash ||
                    parsed.username ||
                    parsed.password ||
                    parsed.port
                ) {
                    throw new Error();
                }
                pattern = parsed.hostname.replace(/\.$/, '');
            } catch {
                throw new Error('Domain and Exact Host patterns must contain a hostname only.');
            }
        }
        const duplicate = rules.some((item, index) => item.pattern === pattern && index !== editing_index);
        if (duplicate) throw new Error('This URL pattern already exists.');
        const item: Settings['ignored_sites'][number] = { pattern, match_type: selected_mode };
        if (editing_index === undefined) rules.push(item);
        else rules[editing_index] = item;
    } else {
        const page_template = page_url_template.value.trim();
        const feed_template = feed_url_template.value.trim();
        ValidateTemplate(page_template, feed_template);
        const duplicate = updated_settings.feed_templates.some(
            (item, index) => item.page_url_template === page_template && index !== editing_index
        );
        if (duplicate) throw new Error('This page URL template already exists.');
        const item: Settings['feed_templates'][number] = {
            page_url_template: page_template,
            feed_url_template: feed_template,
        };
        if (editing_index === undefined) updated_settings.feed_templates.push(item);
        else updated_settings.feed_templates[editing_index] = item;
    }

    const was_editing = editing_index !== undefined;
    settings = await SaveSettings(updated_settings);
    ResetForm();
    RenderList();
    ShowStatus(was_editing ? 'Entry updated.' : 'Entry added.');
};

const InitializeEditor = async () => {
    settings = await GetSettings();
    ApplyColorScheme(settings.color_scheme);
    ApplyTheme(settings.theme);
    const is_templates = editor_type === 'templates';
    const is_ignored = editor_type === 'ignored';
    if (is_templates) {
        editor_title.textContent = 'Feed Templates';
        list_title.textContent = 'Templates';
        editor_description.textContent =
            'A matching page template produces a feed candidate directly. Named placeholders are copied into the candidate URL.';
    } else if (is_ignored) {
        editor_title.textContent = 'Ignored URLs';
        list_title.textContent = 'Ignored URL rules';
        editor_description.textContent =
            'Ignored URLs are skipped before template matching and feed-candidate detection. Contains matches the full URL, Domain includes all subdomains, and Exact Host matches one hostname.';
    } else {
        editor_title.textContent = 'Extended Scan Exclusions';
        list_title.textContent = 'Excluded URL rules';
        editor_description.textContent =
            'Passive page and Feed Template candidate detection still runs; only active common-path requests are skipped. Contains matches the full URL, Domain includes all subdomains, and Exact Host matches one hostname.';
    }
    ignored_form.hidden = is_templates;
    templates_form.hidden = !is_templates;
    SetMode('subdomain');
    RenderList();
};

document.getElementById('back_button')?.addEventListener('click', () => {
    window.location.href = '/html/settings.html';
});
for (const button of mode_buttons) {
    button.addEventListener('click', () => SetMode(button.dataset.mode as MatchMode));
}
save_button.addEventListener('click', async () => {
    try {
        await SaveCurrentItem();
    } catch (error: unknown) {
        ShowStatus(getErrorMessage(error));
    }
});
cancel_button.addEventListener('click', ResetForm);

chrome.storage.onChanged.addListener((changes, area_name) => {
    if (area_name !== 'local' || !changes.firerss_settings) return;
    void GetSettings().then((updated_settings) => {
        settings = updated_settings;
        RenderList();
    });
});

void InitializeEditor().catch((error: unknown) => ShowStatus(getErrorMessage(error)));
