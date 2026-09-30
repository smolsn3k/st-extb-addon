/**
 * ExtBlocks Manual Trigger
 * Adds a panel to the Extensions settings that lists every ExtBlocks block
 * (preset + character-scoped) and lets you run one with a button.
 *
 * It imports ExtBlocks' own modules (same URLs => same module instances),
 * so it runs blocks exactly like the /ExtBlocks slash commands do.
 */

const MODULE_NAME = 'extblocks_manual_trigger';
const LOG = '[ExtBlocks Manual Trigger]';
const KNOWN_FOLDERS = ['ext-blocks-custom', 'ExtBlocks', 'extblocks'];

const { eventSource, event_types, extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();

let ext = null;   // resolved ExtBlocks modules
let busy = false; // one manual run at a time

function getSettings() {
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = { folder: '' };
    }
    return extensionSettings[MODULE_NAME];
}

/** Possible base URLs of the ExtBlocks extension folder, best guesses first. */
function candidateBases() {
    const own = new URL('./', import.meta.url).href;
    const matching = [];
    const rest = [];
    const seen = new Set([own]);

    const add = (href) => {
        if (seen.has(href)) return;
        seen.add(href);
        (/ext-?blocks/i.test(href) ? matching : rest).push(href);
    };

    const override = String(getSettings().folder || '').trim();
    const overrideHref = override ? new URL(`../${encodeURIComponent(override)}/`, own).href : null;

    document.querySelectorAll('script[src]').forEach((s) => {
        if (/\/extensions\/.+\/index\.js(\?.*)?$/.test(s.src)) add(new URL('./', s.src).href);
    });
    KNOWN_FOLDERS.forEach((f) => add(new URL(`../${f}/`, own).href));

    return [...(overrideHref ? [overrideHref] : []), ...matching, ...rest];
}

/** Finds ExtBlocks and imports the modules we need. Returns null if not found. */
async function loadExtBlocks(force = false) {
    if (ext && !force) return ext;
    ext = null;

    for (const base of candidateBases()) {
        try {
            const [cmd, blocks, gen, apiMod, consts] = await Promise.all([
                import(`${base}src/services/CommandService.js`),
                import(`${base}src/services/BlockService.js`),
                import(`${base}src/services/GenerationService.js`),
                import(`${base}src/services/ApiService.js`),
                import(`${base}src/core/constants.js`),
            ]);
            if (cmd.CommandService && blocks.BlockService && gen.GenerationService && consts.BlockType) {
                ext = {
                    base,
                    CommandService: cmd.CommandService,
                    BlockService: blocks.BlockService,
                    GenerationService: gen.GenerationService,
                    ApiService: apiMod.ApiService,
                    BlockType: consts.BlockType,
                };
                console.log(`${LOG} using ExtBlocks at ${base}`);
                return ext;
            }
        } catch {
            // not this folder, try the next one
        }
    }
    return null;
}

function typeLabel(block, BlockType) {
    const t = block.block_type ?? BlockType.GENERATED;
    if (t === BlockType.REWRITE) return 'rewrite';
    if (t === BlockType.SCRIPT) return 'script';
    if (t === BlockType.ACCUMULATION) return 'accumulation';
    return 'generated';
}

async function runBlock(name, $btn) {
    if (busy) {
        toastr.info('Another block is still running.', 'ExtBlocks');
        return;
    }
    const { chat } = SillyTavern.getContext();
    if (!chat || chat.length === 0) {
        toastr.warning('Open a chat with at least one message first.', 'ExtBlocks');
        return;
    }

    const api = await loadExtBlocks();
    if (!api) {
        toastr.error('ExtBlocks not found. See the panel for details.', 'ExtBlocks');
        return;
    }

    const block = api.BlockService.getAllBlocks().find((b) => b.name === name);
    if (!block) {
        toastr.error(`Block "${name}" no longer exists. Refresh the list.`, 'ExtBlocks');
        return;
    }

    if (!extensionSettings.ExtBlocks?.extblocks_is_enabled) {
        toastr.warning('ExtBlocks is switched off in its own settings.', 'ExtBlocks');
    }

    const extra = String($('#extblocks_run_extra').val() || '').trim();
    const { BlockType, CommandService, GenerationService } = api;
    const type = block.block_type ?? BlockType.GENERATED;

    busy = true;
    $('.extblocks-run-btn').addClass('disabled');
    const $icon = $btn.find('i');
    const oldIcon = $icon.attr('class');
    $icon.attr('class', 'fa-solid fa-spinner fa-spin');
    toastr.info(`Running "${name}"...`, 'ExtBlocks');

    try {
        if (type === BlockType.GENERATED) {
            await CommandService.runBlockGenerationCallback({ name }, extra);
        } else if (type === BlockType.REWRITE) {
            await CommandService.runRewriteBlocksCallback({ name }, extra);
        } else if (type === BlockType.SCRIPT) {
            await CommandService.runScriptsExecutionCallback({ name });
        } else if (type === BlockType.ACCUMULATION) {
            // Applies this one accumulation block to the last message
            // (only does something if the message contains its <updater> tag).
            const messageId = chat.length - 1;
            await GenerationService.handleBlocksAccumulation(messageId, !!chat[messageId].is_user, [block]);
        }
        toastr.success(`Finished "${name}".`, 'ExtBlocks');
    } catch (err) {
        console.error(`${LOG} run failed`, err);
        toastr.error(`"${name}" failed: ${err?.message ?? err}`, 'ExtBlocks');
    } finally {
        busy = false;
        $icon.attr('class', oldIcon);
        $('.extblocks-run-btn').removeClass('disabled');
    }
}

async function refreshList() {
    const $list = $('#extblocks_run_list').empty();
    const $status = $('#extblocks_run_status');
    if ($list.length === 0) return;

    const api = await loadExtBlocks(true);
    if (!api) {
        $status.text('ExtBlocks not found. Make sure it is installed and enabled, or type its folder name below and press Refresh.');
        return;
    }

    const blocks = api.BlockService.getAllBlocks();
    if (blocks.length === 0) {
        $status.text('No blocks found (add blocks in ExtBlocks, or open a chat if you use character-scoped blocks).');
        return;
    }
    $status.text(`${blocks.length} block(s):`);

    blocks.forEach((block) => {
        const $row = $('<div class="flex-container alignItemsCenter"></div>').css({ gap: '6px', margin: '4px 0' });
        const $name = $('<span class="flex1"></span>').text(block.name);
        if (block.disabled) $name.css('opacity', 0.55).append($('<small></small>').text(' (disabled)'));
        const $type = $('<small></small>').css('opacity', 0.7).text(typeLabel(block, api.BlockType));
        const $btn = $('<div class="menu_button menu_button_icon interactable extblocks-run-btn" title="Run this block"><i class="fa-solid fa-play"></i></div>');
        $btn.on('click', () => {
            if ($btn.hasClass('disabled')) return;
            runBlock(block.name, $btn);
        });
        $row.append($name, $type, $btn);
        $list.append($row);
    });
}

function buildPanel() {
    const html = `
    <div class="extblocks-run-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>ExtBlocks: Manual Trigger</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container alignItemsCenter" style="gap:6px;">
                    <input id="extblocks_run_extra" class="text_pole flex1" type="text"
                        placeholder="Additional prompt (optional, goes into {{additionalPrompt}})">
                    <div id="extblocks_run_refresh" class="menu_button menu_button_icon interactable" title="Refresh list">
                        <i class="fa-solid fa-rotate"></i>
                    </div>
                    <div id="extblocks_run_stop" class="menu_button menu_button_icon interactable" title="Abort block generation">
                        <i class="fa-solid fa-stop"></i>
                    </div>
                </div>
                <small id="extblocks_run_status" style="display:block;margin:6px 0;"></small>
                <div id="extblocks_run_list"></div>
                <details style="margin-top:6px;">
                    <summary><small>ExtBlocks folder name (only if auto-detect fails)</small></summary>
                    <input id="extblocks_run_folder" class="text_pole" type="text" placeholder="e.g. ext-blocks-custom">
                </details>
            </div>
        </div>
    </div>`;
    $('#extensions_settings').append(html);
    $('#extblocks_run_folder').val(getSettings().folder || '');
}

function bindUi() {
    $('#extblocks_run_refresh').on('click', refreshList);

    $('#extblocks_run_stop').on('click', async () => {
        const api = await loadExtBlocks();
        if (api?.ApiService?.abortGeneration) api.ApiService.abortGeneration();
    });

    $('#extblocks_run_folder').on('change', async function () {
        getSettings().folder = String($(this).val() || '').trim();
        saveSettingsDebounced();
        await refreshList();
    });

    // Re-read the list whenever the drawer is opened
    $('.extblocks-run-settings .inline-drawer-toggle').on('click', () => setTimeout(refreshList, 50));
}

jQuery(() => {
    buildPanel();
    bindUi();
    eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(refreshList, 500));
    setTimeout(refreshList, 1500);
    console.log(`${LOG} loaded`);
});
