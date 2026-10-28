# er-editor

A game editor for Pokemon Elite Redux (a rom hack made possible with pret pokeemerald).
Using ElectronJS, Typescript and vanilla + jquery web front end, its a fork a nextdex made specifically for editing the game's files

## Project Setup

Warning, this readme isn't up to date as the build system changed (with protoc), but you can check the online dex readme which should give a hint on how it works.
Also this project can only be ran by people having access to ER source code.
The public source code of ER is outdated and will not work.

### Install


```bash
npm approve-scripts --all
npm install
# If npm run dev doesn't work, with an error "Error: Electron uninstall"
# This will hang for a while because it's downloading a bunch of stuff behind the scene.
# No clue why it doesn't launch despite `npm approve-scripts --all`
node node_modules/electron/install.js 
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
