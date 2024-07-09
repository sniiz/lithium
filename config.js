import AsyncStorage from "@react-native-async-storage/async-storage";

const configDefault = {
  vCodec: "h264",
  vQuality: "max",
  aFormat: "mp3",
  filenamePattern: "basic",
  // isAudioOnly: false,
  isTTFullAudio: false,
  isAudioMuted: false,
  // dubLang: false,
  disableMetadata: false,
  twitterGif: false,
  tiktokH265: false,
  cobaltServer: "https://api.cobalt.tools",
};

export async function getConfig() {
  const config = await AsyncStorage.getItem("config");
  return config ? JSON.parse(config) : configDefault;
}

export async function setConfig(config) {
  await AsyncStorage.setItem("config", JSON.stringify(config));
}

export async function setConfigKey(key, value) {
  const config = await getConfig();
  config[key] = value;
  await setConfig(config);
}
