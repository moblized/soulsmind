# Souls Mind

A hard 2D action-exploration platformer for Android. You play a small lamplighter carrying a flame through places where something stopped.

- **Level 1: Rimebell.** A frozen mountain monastery whose bells went silent a hundred winters ago. Six rooms, two bosses (the Rime Matriarch and the Silent Abbot), Ice Claws and the Gale Sash.
- **Level 2: Duskmarch.** A fallen kingdom where the sun began to set a hundred years ago and never finished. Four rooms, with Barrow Hounds that lunge, Oathbound Knights whose shields block strikes from the front, and Ash Archers on the walls. Two bosses: the Barrow Warden and Varhelm, the Unsetting Knight, who likes to delay his swings. The new ability is the Cinder Step (a double jump).

## Install on Android

Every push to `main` builds a fresh APK. On your phone, open the latest release under **Releases**, tap `soulsmind.apk`, and allow installs from your browser when Android asks. New builds install over old ones and keep your save.

## How it plays

- **Move** with the left half of the screen. Use **JUMP**, **STRIKE** (drag up or down to aim), **DASH** (once found) and **FLASK**. A gamepad also works.
- **Death costs you.** Your chimes stay where you fell. Reach them before you die again or they are gone.
- **The flask is limited.** It mends two embers per drink, only while you stand still. It refills only when you rest.
- **Resting is a choice.** Push up at a lit brazier to rest. Resting heals you, refills the flask, opens the upgrade menu, and brings every enemy you killed back to life.
- **Bosses drop loot.** Each boss drops a heap of chimes and a relic with a lasting effect.
- **Level up at braziers.** Rest, then spend chimes on levels. Each level raises one stat and costs more than the last: **Vitality** (health), **Might** (strike damage), **Spirit** (flask drinks) or **Resonance** (a stronger Peal that charges faster). Points can be shuffled before you confirm.
- **Updates itself.** The Android app checks this repository's releases on launch and offers new versions; the pause menu shows the version and can check by hand.
- **Heavy hits take two embers.** A dash briefly passes through attacks.
- **Shields:** strike a knight from behind or from above, punish his thrust, or break his guard with a Peal.

## Project layout

| Path | What it is |
| --- | --- |
| `game/src/` | The game: plain JavaScript drawn on a canvas, with all sound synthesized |
| `game/build.js` | Builds `dist/index.html` (browser) and `dist/app/index.html` (Android, offline) |
| `game/test/` | Headless-Chrome tests: room reachability, Level 1 and Level 2 systems, random play, and app checks |
| `android/` | A small native shell (one Activity hosting a WebView), the icon, and the signing key |
| `android/build.sh` | Builds and signs `build/soulsmind.apk` without Gradle |

## Build it yourself

```sh
sudo apt-get install -y aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
./android/build.sh            # writes build/soulsmind.apk
cd game && npm install && npm test   # optional; tests need Google Chrome
```

`android/rimebell-debug.keystore` is a debug signing key (password `android`). It is committed so that every build can update the last one without wiping your save. Before publishing to Google Play, switch to a private release key.
