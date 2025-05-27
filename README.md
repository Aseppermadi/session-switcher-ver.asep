# 🔄 Session Switcher

**Session Switcher** is a browser extension that allows users to manage, save, and switch between multiple login sessions with ease. It's especially useful for developers, testers, or anyone who frequently switches between accounts or environments.

---

## 🌍 Store Links

> Coming soon to browser extension stores:

- **Chrome Web Store** → [Session Switcher](https://chromewebstore.google.com/detail/session-switcher/mgekglkbhkpphbnhkmlhlnehaplibleh)
- **Firefox Add-ons** → [Session Switcher](https://addons.mozilla.org/en-US/firefox/addon/session-switcher)
- **Edge Add-ons** → _[Not Tested Yet](#)_

---

## 🚀 Features

- 🔐 **Save Login Sessions**  
  Capture and store cookies for the current session.

- 🔄 **Switch Between Sessions Instantly**  
  Load saved sessions with one click — no more logging in/out manually.

- 💾 **Persistent Storage**  
  All session data is stored locally and securely in your browser.

- 🌐 **Multi-Site Support**  
  Manage sessions for different websites independently.

---

## 📦 Manual Installation

### Chrome / Edge

1. Download and extract from the [release tab](https://github.com/fanesz/session-switcher/releases).
2. Open `chrome://extensions/` in your browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the downloaded folder.

### Firefox

1. Open `about:debugging`.
2. Click **This Firefox** > **Load Temporary Add-on**.
3. Select the `manifest.json` file from the `dist` folder.

---

## Todo

#### Core
- Modify browser cookies (currently it only modify localStorage and sessionStorage)
- List blocked web to avoid missclick

#### UX
- Draggable stored session to freely move up/down
- Shortcut to switch to next/previous stored session
- Folder feature for stored session

---

## 🛠️ Build Instructions

```bash
# Install dependencies (requires Bun)
bun install

# Dev the project
bun run dev:<firefox or chrome>

# Build the project
bun run build:<firefox or chrome>
```

---

## 🙌 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📜 License

MIT License