# lithium

android app for [cobalt.tools](https://github.com/imputnet/cobalt), made with react native + expo

## screenshots

![home](https://github.com/sniiz/lithium/blob/main/screenshots/home.png?raw=true)

![loading](https://github.com/sniiz/lithium/blob/main/screenshots/loading.png?raw=true)

![settings](https://github.com/sniiz/lithium/blob/main/screenshots/settings.png?raw=true)

![about](https://github.com/sniiz/lithium/blob/main/screenshots/about.png?raw=true)

## setup

if you just want the app, a prebuilt apk is available in the [releases](https://github.com/sniiz/lithium/releases) section.

if you want to build the app yourself, you can do so with the following steps:

1. clone the repo

2. install dependencies

```sh
yarn install
```

3. install eas-cli

```sh
yarn global add eas-cli
```

4. make an [expo](https://expo.dev/) account and log in with eas-cli

```sh
eas login
```

5. build the app

```sh
eas build -p android
```

6. profit

## license

cobalt and, by extension, lithium, are licensed under [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)
