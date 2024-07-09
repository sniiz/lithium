# lithium

android app for [cobalt.tools](https://github.com/imputnet/cobalt), made with react native + expo

## screenshots

<!-- ![home](https://github.com/sniiz/lithium/blob/main/screenshots/home.png?raw=true)

![loading](https://github.com/sniiz/lithium/blob/main/screenshots/loading.png?raw=true)

![settings](https://github.com/sniiz/lithium/blob/main/screenshots/settings.png?raw=true)

![about](https://github.com/sniiz/lithium/blob/main/screenshots/about.png?raw=true) -->

<div align='center'>
<img src="https://github.com/sniiz/lithium/blob/main/screenshots/home.png?raw=true" width="200" alt="home">
<img src="https://github.com/sniiz/lithium/blob/main/screenshots/loading.png?raw=true" width="200" alt="loading">
<img src="https://github.com/sniiz/lithium/blob/main/screenshots/settings.png?raw=true" width="200" alt="settings">
<img src="https://github.com/sniiz/lithium/blob/main/screenshots/about.png?raw=true" width="200" alt="about">
</div>

## setup

if you just want the app, a prebuilt apk is available in the [releases](https://github.com/sniiz/lithium/releases) section.

if you want to build the app yourself, you can do so with the following steps:

1. clone the repo

2. install dependencies

```sh
yarn install
```

3. make an [expo](https://expo.dev/) account and log in with eas-cli

```sh
npx eas-cli login
```

4. build the app

```sh
npx eas-cli build -p android
```

5. profit

## license

cobalt and, by extension, lithium, are licensed under [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)
