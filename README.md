# 🔄 Session Switcher

**Session Switcher** is a browser extension that allows users to manage, save, and switch between multiple login sessions with ease. It's especially useful for developers, testers, or anyone who frequently switches between accounts or environments.

![Session Switcher Screenshot 1](https://github.com/user-attachments/assets/7d3a0d5b-d760-4c66-8d67-2d6b6bb0add1)
![Session Switcher Screenshot 2](https://github.com/user-attachments/assets/27d8ab68-9a21-4346-a13f-c5f809701328)

---

## 🌍 Installation

Check out the [release page](https://github.com/kuronekony4n/session-switcher/releases)!

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

## 🐞 Bug Report / Feature Request

Kindly create an issue [here](https://github.com/kuronekony4n/session-switcher/issues).
<br>Write a descriptive problem, step-to-reproduce, web browser that you use, and the website url.

---

## 📦 Manual Installation

### Chrome / Edge

1. Download and extract from the [release tab](https://github.com/kuronekony4n/session-switcher/releases).
2. Open `chrome://extensions/` in your browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the downloaded folder.

### Firefox

1. Open `about:debugging`.
2. Click **This Firefox** > **Load Temporary Add-on**.
3. Select the `manifest.json` file from the `dist` folder.

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
