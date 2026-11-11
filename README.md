# Rimebell

A hard 2D action-exploration platformer for Android, set in a frozen mountain monastery. You play a small lamplighter climbing toward the bells that went silent a hundred winters ago.

**Stage 1: The Lower Cloister.** Six connected rooms, two bosses, two movement abilities, and one hidden health upgrade.

## Install on Android

Every push to `main` builds a fresh APK. On your phone, open the latest release under **Releases**, tap `rimebell.apk`, and allow installs from your browser when Android asks. New builds install over old ones and keep your save.

## How it plays

- **Move** with the left half of the screen. Use **JUMP**, **STRIKE** (drag up or down to aim), **DASH** (once found) and **FLASK**. A gamepad also works.
- **Death costs you.** Your chimes stay where you fell. Reach them before you die again or they are gone.
- **The flask is limited.** It mends two embers per drink, only while you stand still. It refills only when you rest.
- **Resting is a choice.** Push up at a lit brazier to rest. Resting heals you, refills the flask, opens the upgrade menu, and brings every enemy you killed back to life.
- **Bosses drop loot.** Each boss drops a heap of chimes and a relic with a lasting effect. Spend chimes at braziers on a stronger staff, a deeper flask, or more health.
- **Heavy hits take two embers.** A dash briefly passes through attacks.

## Project layout

| Path | What it is |
| --- | --- |
| `game/src/` | The game: plain JavaScript drawn on a canvas, with all sound synthesized |
| `game/build.js` | Builds `dist/index.html` (browser) and `dist/app/index.html` (Android, offline) |
| `game/test/` | Headless-Chrome tests: room reachability, a random-play smoke test, and app checks |
| `android/` | A small native shell (one Activity hosting a WebView), the icon, and the signing key |
| `android/build.sh` | Builds and signs `build/rimebell.apk` without Gradle |

## Build it yourself

```sh
sudo apt-get install -y aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
./android/build.sh            # writes build/rimebell.apk
cd game && npm install && npm test   # optional; tests need Google Chrome
```

`android/rimebell-debug.keystore` is a debug signing key (password `android`). It is committed so that every build can update the last one without wiping your save. Before publishing to Google Play, switch to a private release key.
