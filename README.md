# ExtBlocks Manual Trigger

A small SillyTavern extension that adds a panel for running [ExtBlocks](https://gitgud.io/sleepydraqon/ext-blocks-custom) blocks by hand. It lists every block you have added and puts a ▶ button next to each one.

## Install

1. Copy this folder (`extblocks-manual-trigger`, containing `index.js` and `manifest.json`) into SillyTavern's third-party extensions folder, next to the ExtBlocks folder:
   - `SillyTavern/public/scripts/extensions/third-party/`, or
   - `SillyTavern/data/<your-user>/extensions/` (for example `data/default-user/extensions/`)
2. Restart SillyTavern, or reload the page.
3. ExtBlocks itself must be installed and enabled.

## Usage

1. Open **Extensions** (the stacked-blocks icon) and expand **ExtBlocks: Manual Trigger**.
2. The list shows all blocks: preset (global) and character-scoped, each with its type (generated, rewrite, script, accumulation). Disabled blocks are dimmed but can still be run.
3. Open a chat that has at least one message, then press ▶ next to the block you want.
4. A spinner shows while it runs, and toasts report the result.

### Controls

| Control | What it does |
| --- | --- |
| ▶ (per block) | Runs that block against the last message in the chat |
| Additional prompt field | Optional text passed to the block as `{{additionalPrompt}}` (only has an effect if the block's prompt contains that macro) |
| ⟳ | Re-reads the block list (it also refreshes when you open the drawer or switch chats) |
| ■ | Aborts the current block generation |
| "After a run, generate images..." checkbox | On by default. After a block finishes, hands the message to Inline Image Generation (see below) |

### What each block type does

- **Generated**: runs the block and, if it produced output, feeds that into accumulation blocks, same as `/generate`.
- **Rewrite**: rewrites the last message, same as the rewrite slash command.
- **Script**: executes the script, same as the execute-script slash command.
- **Accumulation**: applies that single block to the last message. It only does something if the message contains the block's `<updater>` tag and the block's user/character trigger flags match the message.

Everything goes through ExtBlocks' own command code, so the behavior matches the slash commands exactly.

## Image blocks (Inline Image Generation)

Blocks whose output contains `<img data-iig-instruction='...' src="[IMG:GEN]">` are turned into real images by the [Inline Image Generation](https://github.com/0xl0cal/sillyimages) extension. That extension only scans a message when SillyTavern fires a "message rendered" event. When a block runs automatically, that event fires right after ExtBlocks writes the block, so it works. A manual run fires no such event, so the placeholder stays as a broken image icon.

This extension fixes that: after a manual run finishes, it calls Inline Image Generation's own `processMessageTags` for the last message, which generates the image exactly as it would after an automatic run. Inline Image Generation shows its own progress and toasts, and its "ExtBlocks / external blocks" support must be enabled in its settings (it already is if automatic runs work for you).

You can turn this off with the checkbox in the panel. If a block already left a broken image, use the "Regenerate images" button (picture icon) in that message's "..." menu, which comes from Inline Image Generation.

## Troubleshooting

- **"ExtBlocks not found"**: the extension auto-detects the ExtBlocks folder. If that fails, expand "ExtBlocks folder name" at the bottom of the panel, type the folder name (for example `ext-blocks-custom`), and press ⟳.
- **Broken image still appears after a manual run**: make sure the checkbox is on and Inline Image Generation is enabled and configured (API, model). If it can't be found, expand "Folder names" and enter its folder name (for example `sillyimages`). The console will show `[ExtBlocks Manual Trigger] using Inline Image Generation at ...` when it is found.
- **List is empty**: add blocks in ExtBlocks first. Character-scoped blocks only show up once a character chat is open.
- **Nothing happens or an error toast appears**: open the browser console (F12) and look for lines starting with `[ExtBlocks Manual Trigger]`.

## Limitations

- It relies on ExtBlocks' internal file and function names (`CommandService`, `BlockService`, `GenerationService`, `ApiService`, `core/constants.js`) and on Inline Image Generation's `src/pipeline.js` (`processMessageTags`). If a future update renames or moves them, this extension will need a small update.
- Block names containing a comma won't work, because ExtBlocks splits names on commas.
- Only one block can run at a time.
