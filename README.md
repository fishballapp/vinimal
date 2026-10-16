# Vinimal

**The few Vimium keys you actually use, made to look good.** A Chrome extension for browsing with
the keyboard, minimally configurable.

| Keys | Does |
| --- | --- |
| `j` / `k` | Scroll down / up |
| `h` / `l` | Scroll left / right |
| `gg` | Top |
| `G` | Bottom |
| `Ctrl+E` / `Ctrl+Y` | Page down / up |
| `gt` / `gT` | Next / previous tab |
| `f` | Click a link (tap ⌘ first: new tab) |
| `Esc` | Close, or leave a text field |
| `?` | These keys |

- Keys typed in a text field go to the page as usual, and so do keys with ⌘, Ctrl or Alt held,
  apart from Ctrl+E and Ctrl+Y. Those use Control on a Mac too; the new-tab ⌘ is Ctrl on Windows
  and Linux.
- **Click the toolbar icon to disable Vinimal on the site you're on**, for sites with shortcuts of
  their own. It stays disabled until you click again. Right-click the icon → **Options** for the
  keys, your disabled sites and your licence.
- Labels reach into frames and shadow roots, skip what's hidden or covered, and are one or two letters, home row first.
- A faint dashed outline shows what each label clicks; switch it off on the Keys page.
- Scrolling honours "reduce motion" by stepping instead of gliding.
- Nothing leaves your browser except a daily licence check.

Free for 14 days, then a licence key: **pay what you want for a year, from nothing**, or support it
yearly from $5 / £5 / €5. Licensed under [GPL-3.0](LICENSE).

## Permissions

- **Read and change all your data on all websites**: the keys and labels work on every page, so
  the script that listens for them runs on every page and in every frame.
- `storage` (your disabled sites and licence),
  `alarms` (the daily licence check), `webNavigation` (finding a page's frames so labels reach into
  them) and `scripting` (starting Vinimal in the tabs already open when it's installed or updated).
- Vinimal's site, vinimal.fishball.app, may ask whether Vinimal is on there, so it can say whose
  keys it's answering. No other page can ask, and nothing else is answered.

## Building

Needs Node 26 or later and pnpm.

```sh
pnpm install
pnpm -F @vinimal/extension build   # → apps/extension/dist
pnpm -F @vinimal/extension test
```

Then `chrome://extensions` → **Developer mode** → **Load unpacked** → the `apps/extension/dist`
folder. A build that isn't a release carries a fixed public key, so it has the same ID wherever it's
loaded from (`idmbinogldjhklakideijbhkkpclppgb`), and the site's dev server can find it.

The source is GPL-3.0, so anyone may build it themselves.

## Trying it

With the build loaded, on any ordinary page:

1. Tap `j` and `k`: the page glides a step. Hold `j`: it scrolls steadily and eases to a stop when
   you let go. `G` jumps to the bottom, `gg` back to the top.
2. Click into a scrolling panel (a code block, Gmail's list) and press `j`: the panel scrolls.
3. Type `j` in a search box: it types. `Esc` leaves the box; `j` scrolls again.
4. Press `f`: every link and button gets a label. Type one: it's followed. Tap ⌘ (Ctrl) before
   typing it: the labels show an arrow, and the link opens in a new tab behind this one. Scroll
   with the labels showing: they move with their links, keep their letters, and links scrolled
   into view get labels when you stop. `Esc` puts the labels away.
5. Click the toolbar icon: it goes hollow and the keys reach the page. Click again:
   they're back. On `chrome://` pages the icon carries a prohibition sign and does nothing.
6. Right-click the icon → **Options** → **Disabled sites**: the site is listed; **Enable** brings it
   back.
7. Press `?`: the keys appear over the page. `?`, Esc or a click outside puts them away.
