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

### What each block type does

- **Generated**: runs the block and, if it produced output, feeds that into accumulation blocks, same as `/generate`.
- **Rewrite**: rewrites the last message, same as the rewrite slash command.
- **Script**: executes the script, same as the execute-script slash command.
- **Accumulation**: applies that single block to the last message. It only does something if the message contains the block's `<updater>` tag and the block's user/character trigger flags match the message.

Everything goes through ExtBlocks' own command code, so the behavior matches the slash commands exactly.

## Troubleshooting

- **"ExtBlocks not found"**: the extension auto-detects the ExtBlocks folder. If that fails, expand "ExtBlocks folder name" at the bottom of the panel, type the folder name (for example `ext-blocks-custom`), and press ⟳.
- **List is empty**: add blocks in ExtBlocks first. Character-scoped blocks only show up once a character chat is open.
- **Nothing happens or an error toast appears**: open the browser console (F12) and look for lines starting with `[ExtBlocks Manual Trigger]`.

## Limitations

- It relies on ExtBlocks' internal file and function names (`CommandService`, `BlockService`, `GenerationService`, `ApiService`, `core/constants.js`). If a future ExtBlocks update renames or moves them, this extension will need a small update.
- Block names containing a comma won't work, because ExtBlocks splits names on commas.
- Only one block can run at a time.
