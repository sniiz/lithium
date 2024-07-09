import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  ClipboardIcon,
  Coins,
  Film,
  Headphones,
  Info,
  Link,
  Megaphone,
  Music4,
  Settings,
  Sparkles,
  Wrench,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableNativeFeedback,
  View,
} from "react-native";
import { getConfig, setConfigKey } from "./config";

import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";

import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as SplashScreen from "expo-splash-screen";

import {
  NotoSansMono_400Regular,
  NotoSansMono_700Bold,
} from "@expo-google-fonts/noto-sans-mono";
import { Picker } from "@react-native-picker/picker";

// TODO for self: clean up this mess of an App.js

SplashScreen.preventAutoHideAsync();

function Button({ children, onPress, style = "", active = false }) {
  return (
    <TouchableNativeFeedback onPress={onPress}>
      <View
        className={`py-2 px-3.5 ${
          active ? "bg-accent" : "bg-accent-button"
        } flex flex-row items-center justify-center ${style}`}
      >
        {children}
      </View>
    </TouchableNativeFeedback>
  );
}

function ButtonText({ children, style = "", active = false }) {
  return (
    <Text
      className={
        active
          ? `text-background text-base font-noto-bold ${style}`
          : `text-accent text-base font-noto-reg ${style}`
      }
    >
      {children}
    </Text>
  );
}

const COBALT_BASE = "https://api.cobalt.tools";
const AGENT = "lithium-client/0.0.2 <haley(at)program(dot)mr>";

function get(url, noBase = false, api = COBALT_BASE, ...args) {
  const res = fetch((noBase ? "" : api) + url, {
    method: "GET",
    headers: {
      // "Content-Type": "application/json",
      "User-Agent": AGENT,
    },
    ...args,
  });
  return res;
}

async function post(url, data, noBase = false, api = COBALT_BASE, ...args) {
  const res = await fetch((noBase ? "" : api) + url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": AGENT,
    },
    body: JSON.stringify(data),
    ...args,
  });
  return await res.json();
}

export default function App() {
  const [audioMode, setAudioMode] = useState(false);
  const [url, setUrl] = useState("");
  const [canDownload, setCanDownload] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState(0);

  const [showAbout, setShowAbout] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  // const [picker, setPicker] = useState(null); // i aint going near that
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");

  const [config, setConfig] = useState(null);

  const [fontsLoaded, fontsError] = useFonts({
    NotoSansMono_400Regular,
    NotoSansMono_700Bold,
  });

  const [albumPermsResponse, requestAlbumPerms] = MediaLibrary.usePermissions();

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError]);

  useEffect(() => {
    getConfig().then(setConfig);
  }, [showSettings, settingsTab]);

  useEffect(() => {
    setCanDownload(url.length > 0 && url.match(/(http(s?)):\/\//));
  }, [url]);

  async function download() {
    if (!canDownload) return;
    if (isLoading) return;

    setStatus("checking permissions");
    if (albumPermsResponse.status !== "granted") {
      let perms = await requestAlbumPerms();
      if (perms.status !== "granted") {
        setError(
          "this app needs access to your media library to download files."
        );
        return;
      }
    }

    const mediaPerms = await MediaLibrary.getPermissionsAsync();
    if (mediaPerms.status !== "granted") {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setError(
          "this app needs access to your media library to download files."
        );
        return;
      }
    }

    setIsLoading(true);
    setError("");

    setStatus("checking config");
    const config = await getConfig();

    try {
      console.log("downloading", url);
      setStatus(`talking to ${config.cobaltServer}`);
      const res = await post(
        "/api/json",
        {
          url: url.trim(),
          isAudioOnly: audioMode,
          dubLang: false,
          ...config,
        },
        false,
        config.cobaltServer
      );

      console.log(res);

      if (["error", "rate-limit"].includes(res.status)) {
        setError(res.text);
        setIsLoading(false);
        return;
      }

      let fileUrl;
      switch (res.status) {
        case "success":
        case "redirect":
        case "stream":
          fileUrl = res.url || res.audio;
          break;
        case "picker":
          // setPicker(res);
          fileUrl = res.picker[0].url;
          break;
        default:
          setError("unknown error");
          setIsLoading(false);
          return;
      }

      console.log(fileUrl);

      setStatus("getting file info");
      // fetch the url to get the filename
      // then download it with FileSystem.downloadAsync
      const filenameRes = await get(fileUrl, true);
      console.log(filenameRes.headers);

      let filename;

      try {
        filename = filenameRes.headers
          .get("content-disposition")
          .match(/filename="(.+)"/)[1]
          .replace(/[^a-zA-Z0-9.\(\)]/g, "_")
          .replace(/_+/g, "_");
      } catch (e) {
        console.log(e);
        let ext;
        // there's gotta be a better way to do this
        switch (filenameRes.headers.get("content-type")) {
          case "video/mp4":
            ext = ".mp4";
            break;
          case "audio/mpeg":
            ext = ".mp3";
            break;
          case "audio/ogg":
            ext = ".ogg";
            break;
          case "audio/wav":
            ext = ".wav";
            break;
          case "audio/opus":
            ext = ".opus";
            break;
          case "video/webm":
            ext = ".webm";
            break;
          case "video/quicktime":
            ext = ".mov";
            break;
          default:
            ext = ".bin";
            break;
        }

        filename = `li_${Date.now()}${ext}`;
      }

      console.log(filename);
      setStatus(`downloading ${filename}`);
      const result = await FileSystem.downloadAsync(
        fileUrl,
        FileSystem.documentDirectory + filename,
        {
          headers: {
            "User-Agent": AGENT,
          },
        }
      );

      console.log(result);

      await MediaLibrary.saveToLibraryAsync(result.uri);

      setIsLoading(false);
      setUrl("");
      setStatus("downloaded successfully");

      // try {
      //   const asset = await MediaLibrary.createAssetAsync(result.uri);
      //   const album = await MediaLibrary.getAlbumAsync("Download");
      //   if (album === null) {
      //     await MediaLibrary.createAlbumAsync("Download", asset, false).catch(
      //       (e) => {
      //         console.log(e);
      //       }
      //     );
      //   } else {
      //     await MediaLibrary.addAssetsToAlbumAsync([asset], album, false).catch(
      //       (e) => {
      //         console.log(e);
      //       }
      //     );
      //   }
      // } catch (e) {
      //   console.log(e);
      //   setError(e.message);
      // }

      // setIsLoading(false);
      // setUrl("");
      // // Alert.alert("downloaded", "file saved to downloads", [
      // //   { text: "ok", onPress: () => {} },
      // // ]);
    } catch (e) {
      setError(e.message);
      setIsLoading(false);
      console.log(e);
    }
  }

  if (!fontsLoaded && !fontsError) return null;

  if (showAbout) {
    return (
      <SafeAreaView className="flex-1 bg-background w-screen h-screen items-center justify-center">
        <StatusBar style="light" />
        <ScrollView
          className="flex-1 w-full h-full"
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "start",
          }}
        >
          <View className="flex flex-row items-center justify-start w-full mt-12 px-4 py-4 bg-accent-button rounded-base">
            <Sparkles size={24} color="#e1e1e1" />
            <Text className="text-accent font-noto-reg ml-4 text-lg">
              what's lithium?
            </Text>
          </View>
          <Text className="text-accent px-2 font-noto-reg mt-2 text-left w-full">
            lithium is an (almost!) complete recreation of the{" "}
            <Text
              className="bg-accent text-background font-noto-bold underline"
              onPress={() => {
                Linking.openURL("https://cobalt.tools");
              }}
            >
              cobalt.tools
            </Text>{" "}
            frontend, written from scratch in react native for android. it's a
            tool that allows you to download stuff from various social media
            platforms with no ads or tracking.
            {"\n"}
            {"\n"}
            lithium is made possible by{" "}
            <Text
              className="bg-accent text-background font-noto-bold underline"
              onPress={() => {
                Linking.openURL("https://imput.net");
              }}
            >
              the geniuses behind cobalt.tools
            </Text>
            , who have been kind enough to allow anyone to use their api for
            free.
            {"\n"}
            {"\n"}
            this app is in no way affiliated with cobalt.tools, imput.net, or
            any of the platforms it supports. it's just a fan project.
            {"\n"}
            {"\n"}
            made with ❤️ by{" "}
            <Text
              className="bg-accent text-background font-noto-bold underline"
              onPress={() => {
                Linking.openURL("https://smhaley.xyz/");
              }}
            >
              haley summerfield
            </Text>
            . you can find lithium's source code on{" "}
            <Text
              className="bg-accent text-background font-noto-bold underline"
              onPress={() => {
                Linking.openURL("https://github.com/sniiz/lithium");
              }}
            >
              github
            </Text>
            .
          </Text>
          <Pressable
            className="flex flex-row items-center justify-start w-full mt-8 px-4 py-2"
            onPress={() => {
              Linking.openURL("https://status.cobalt.tools");
            }}
          >
            <Megaphone size={18} color="#e1e1e1" />
            <View className="flex flex-row items-center justify-center px-2 py-1 rounded-md bg-accent ml-4">
              <Text className="text-background font-noto-bold underline">
                cobalt service status
              </Text>
            </View>
          </Pressable>
          <Pressable
            className="flex flex-row items-center justify-start w-full mt-1 px-4 py-2"
            onPress={() => {
              Linking.openURL(
                "https://github.com/imputnet/cobalt/blob/current/docs/troubleshooting.md"
              );
            }}
          >
            <Wrench size={18} color="#e1e1e1" />
            <View className="flex flex-row items-center justify-center px-2 py-1 rounded-md bg-accent ml-4">
              <Text className="text-background font-noto-bold underline">
                troubleshooting guide
              </Text>
            </View>
          </Pressable>
          <Pressable
            className="flex flex-row items-center justify-start w-full mt-1 px-4 py-2"
            onPress={() => {
              Linking.openURL("https://boosty.to/wukko/donate");
            }}
          >
            <Coins size={18} color="#e1e1e1" />
            <View className="flex flex-row items-center justify-center px-2 py-1 rounded-md bg-accent ml-4">
              <Text className="text-background font-noto-bold underline">
                support cobalt
              </Text>
            </View>
          </Pressable>
        </ScrollView>
        <Pressable
          className="flex flex-row items-center justify-start w-full absolute bottom-0 bg-accent-button px-4 py-4"
          onPress={() => setShowAbout(false)}
        >
          <ArrowLeft size={18} color="#e1e1e1" />
          <Text className="text-accent text-md font-noto-reg ml-2">
            about lithium
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (showSettings) {
    return (
      <SafeAreaView className="flex-1 bg-background w-screen h-screen items-center justify-center">
        <StatusBar style="light" />
        <ScrollView
          className="flex-1 w-full h-full"
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "start",
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          {settingsTab === 0 ? (
            <>
              <View className="flex flex-row items-center justify-start w-full mt-12 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  quality
                </Text>
              </View>
              <Picker
                selectedValue={config.vQuality}
                onValueChange={(itemValue, itemIndex) => {
                  setConfigKey("vQuality", itemValue);
                  setConfig((prev) => ({ ...prev, vQuality: itemValue }));
                }}
                style={{
                  width: "100%",
                  color: "#e1e1e1",
                  fontFamily: "NotoSansMono_400Regular",
                  backgroundColor: "#191919",
                  borderRadius: 8,
                  paddingLeft: 10,
                  paddingRight: 10,
                }}
                dropdownIconColor={"#e1e1e1"}
                itemStyle={{
                  color: "#e1e1e1",
                  fontFamily: "NotoSansMono_400Regular",
                  backgroundColor: "#191919",
                }}
                mode="dropdown"
              >
                {/* <Picker.Item
                label="max"
                value="max"
                style={{
                  color: "#e1e1e1",
                  fontFamily: "NotoSansMono_400Regular",
                  backgroundColor: "#191919",
                }}
                fontFamily="NotoSansMono_400Regular"
              /> */}
                {[
                  "max",
                  "2160p",
                  "1080p",
                  "720p",
                  "480p",
                  "360p",
                  "240p",
                  "144p",
                ].map((v) => (
                  <Picker.Item
                    key={v}
                    label={v}
                    value={v.replace("p", "")}
                    style={{
                      color: "#e1e1e1",
                      fontFamily: "NotoSansMono_400Regular",
                      backgroundColor: "#191919",
                    }}
                    fontFamily="NotoSansMono_400Regular"
                  />
                ))}
              </Picker>
              <Text className="text-accent-subtext text-sm font-noto-reg mt-2 text-left w-full">
                if the selected quality is not available, the closest one will
                be used instead.
              </Text>
              <View className="flex flex-row items-center justify-start w-full mt-8 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  youtube codec
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-tl-base rounded-bl-base w-1/3"
                  active={config.vCodec === "h264"}
                  onPress={() => {
                    setConfigKey("vCodec", "h264");
                    setConfig((prev) => ({ ...prev, vCodec: "h264" }));
                  }}
                >
                  <ButtonText active={config.vCodec === "h264"}>
                    h264 (mp4)
                  </ButtonText>
                </Button>
                <Button
                  style="w-1/3"
                  active={config.vCodec === "av1"}
                  onPress={() => {
                    setConfigKey("vCodec", "av1");
                    setConfig((prev) => ({ ...prev, vCodec: "av1" }));
                  }}
                >
                  <ButtonText active={config.vCodec === "av1"}>
                    av1 (mp4)
                  </ButtonText>
                </Button>
                <Button
                  style="rounded-tr-base rounded-br-base w-1/3"
                  active={config.vCodec === "vp9"}
                  onPress={() => {
                    setConfigKey("vCodec", "vp9");
                    setConfig((prev) => ({ ...prev, vCodec: "vp9" }));
                  }}
                >
                  <ButtonText active={config.vCodec === "vp9"}>
                    vp9 (webm)
                  </ButtonText>
                </Button>
              </View>
              <Text className="text-accent-subtext text-xs font-noto-reg mt-4 text-left w-full">
                h264: best support across platforms, decent quality, up to
                1080p.
                {"\n"}
                av1: less support, smaller files, best quality, up to 2160p with
                hdr support.
                {"\n"}
                vp9: same as av1 but with larger files, up to 2160p with hdr
                support.
              </Text>
              <View className="flex flex-row items-center justify-start w-full mt-8 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  twitter
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-base flex flex-row items-center justify-start pl-2"
                  // active={config.twitterGif}
                  onPress={() => {
                    setConfigKey("twitterGif", !config.twitterGif);
                    setConfig((prev) => ({
                      ...prev,
                      twitterGif: !prev.twitterGif,
                    }));
                  }}
                >
                  <View
                    className="w-6 h-6 flex flex-row items-center justify-center rounded-md border border-accent"
                    style={{
                      backgroundColor: config.twitterGif
                        ? "#e1e1e1"
                        : "#191919",
                    }}
                  >
                    <Check size={20} color="#191919" />
                  </View>
                  <ButtonText style="ml-3 text-logo">
                    download gifs as .gif
                  </ButtonText>
                </Button>
              </View>
              <Text className="text-accent-subtext text-sm font-noto-reg mt-4 text-left w-full">
                converting looping videos to .gif greatly increases the file
                size and reduces quality. keep this off for better efficiency.
              </Text>
              <View className="flex flex-row items-center justify-start w-full mt-8 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  tiktok
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-base flex flex-row items-center justify-start pl-2"
                  // active={config.tiktokH265}
                  onPress={() => {
                    setConfigKey("tiktokH265", !config.tiktokH265);
                    setConfig((prev) => ({
                      ...prev,
                      tiktokH265: !prev.tiktokH265,
                    }));
                  }}
                >
                  <View
                    className="w-6 h-6 flex flex-row items-center justify-center rounded-md border border-accent"
                    style={{
                      backgroundColor: config.tiktokH265
                        ? "#e1e1e1"
                        : "#191919",
                    }}
                  >
                    <Check size={20} color="#191919" />
                  </View>
                  <ButtonText style="ml-3 text-logo">prefer h265</ButtonText>
                </Button>
              </View>
              <Text className="text-accent-subtext text-sm font-noto-reg mt-4 text-left w-full">
                download 1080p videos as h265/hevc when available.
              </Text>
            </>
          ) : settingsTab === 1 ? (
            <>
              <View className="flex flex-row items-center justify-start w-full mt-12 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  format
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-tl-base rounded-bl-base w-1/5"
                  active={config.aFormat === "best"}
                  onPress={() => {
                    setConfigKey("aFormat", "best");
                    setConfig((prev) => ({ ...prev, aFormat: "best" }));
                  }}
                >
                  <ButtonText active={config.aFormat === "best"}>
                    best
                  </ButtonText>
                </Button>
                <Button
                  style="w-1/5"
                  active={config.aFormat === "mp3"}
                  onPress={() => {
                    setConfigKey("aFormat", "mp3");
                    setConfig((prev) => ({ ...prev, aFormat: "mp3" }));
                  }}
                >
                  <ButtonText active={config.aFormat === "mp3"}>mp3</ButtonText>
                </Button>
                <Button
                  style="w-1/5"
                  active={config.aFormat === "ogg"}
                  onPress={() => {
                    setConfigKey("aFormat", "ogg");
                    setConfig((prev) => ({ ...prev, aFormat: "ogg" }));
                  }}
                >
                  <ButtonText active={config.aFormat === "ogg"}>ogg</ButtonText>
                </Button>
                <Button
                  style="w-1/5"
                  active={config.aFormat === "wav"}
                  onPress={() => {
                    setConfigKey("aFormat", "wav");
                    setConfig((prev) => ({ ...prev, aFormat: "wav" }));
                  }}
                >
                  <ButtonText active={config.aFormat === "wav"}>wav</ButtonText>
                </Button>
                <Button
                  style="rounded-tr-base rounded-br-base w-1/5"
                  active={config.aFormat === "opus"}
                  onPress={() => {
                    setConfigKey("aFormat", "opus");
                    setConfig((prev) => ({ ...prev, aFormat: "opus" }));
                  }}
                >
                  <ButtonText active={config.aFormat === "opus"}>
                    opus
                  </ButtonText>
                </Button>
              </View>
              <Text className="text-accent-subtext text-xs font-noto-reg mt-4 text-left w-full">
                best: audio is downloaded as is, without being re-encoded.
                {"\n"}
                mp3: lossy audio format, good compatibility.
                {"\n"}
                ogg: lossy audio format, better quality.
                {"\n"}
                wav: lossless audio format, best quality.
                {"\n"}
                opus: lossy audio format, best quality.
              </Text>
              <View className="flex flex-row items-center justify-start w-full mt-4 border-b border-accent-subtext pb-2 mx-4 mb-4">
                {/* <Text className="text-accent-subtext font-noto-reg">
                  audio
                </Text> */}
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-base flex flex-row items-center justify-start pl-2"
                  // active={config.isAudioMuted}
                  onPress={() => {
                    setConfigKey("isAudioMuted", !config.isAudioMuted);
                    setConfig((prev) => ({
                      ...prev,
                      isAudioMuted: !prev.isAudioMuted,
                    }));
                  }}
                >
                  <View
                    className="w-6 h-6 flex flex-row items-center justify-center rounded-md border border-accent"
                    style={{
                      backgroundColor: config.isAudioMuted
                        ? "#e1e1e1"
                        : "#191919",
                    }}
                  >
                    <Check size={20} color="#191919" />
                  </View>
                  <ButtonText style="ml-3 text-logo">mute audio</ButtonText>
                </Button>
              </View>
              <Text className="text-accent-subtext text-sm font-noto-reg mt-4 text-left w-full">
                download videos without audio when possible.
              </Text>
              <View className="flex flex-row items-center justify-start w-full mt-8 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  tiktok
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-base flex flex-row items-center justify-start pl-2"
                  // active={config.isTTFullAudio}
                  onPress={() => {
                    setConfigKey("isTTFullAudio", !config.isTTFullAudio);
                    setConfig((prev) => ({
                      ...prev,
                      isTTFullAudio: !prev.isTTFullAudio,
                    }));
                  }}
                >
                  <View
                    className="w-6 h-6 flex flex-row items-center justify-center rounded-md border border-accent"
                    style={{
                      backgroundColor: config.isTTFullAudio
                        ? "#e1e1e1"
                        : "#191919",
                    }}
                  >
                    <Check size={20} color="#191919" />
                  </View>
                  <ButtonText style="ml-3 text-logo">original sound</ButtonText>
                </Button>
              </View>
              <Text className="text-accent-subtext text-sm font-noto-reg mt-4 text-left w-full">
                download the original sound used in the video without any
                changes by the uploader.
              </Text>
            </>
          ) : settingsTab === 2 ? (
            <>
              <View className="flex flex-row items-center justify-start w-full mt-12 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  filename
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-tl-base rounded-bl-base w-1/4"
                  active={config.filenamePattern === "classic"}
                  onPress={() => {
                    setConfigKey("filenamePattern", "classic");
                    setConfig((prev) => ({
                      ...prev,
                      filenamePattern: "classic",
                    }));
                  }}
                >
                  <ButtonText active={config.filenamePattern === "classic"}>
                    classic
                  </ButtonText>
                </Button>
                <Button
                  style="w-1/4"
                  active={config.filenamePattern === "basic"}
                  onPress={() => {
                    setConfigKey("filenamePattern", "basic");
                    setConfig((prev) => ({
                      ...prev,
                      filenamePattern: "basic",
                    }));
                  }}
                >
                  <ButtonText active={config.filenamePattern === "basic"}>
                    basic
                  </ButtonText>
                </Button>
                <Button
                  style="w-1/4"
                  active={config.filenamePattern === "pretty"}
                  onPress={() => {
                    setConfigKey("filenamePattern", "pretty");
                    setConfig((prev) => ({
                      ...prev,
                      filenamePattern: "pretty",
                    }));
                  }}
                >
                  <ButtonText active={config.filenamePattern === "pretty"}>
                    pretty
                  </ButtonText>
                </Button>
                <Button
                  style="rounded-tr-base rounded-br-base w-1/4"
                  active={config.filenamePattern === "nerdy"}
                  onPress={() => {
                    setConfigKey("filenamePattern", "nerdy");
                    setConfig((prev) => ({
                      ...prev,
                      filenamePattern: "nerdy",
                    }));
                  }}
                >
                  <ButtonText active={config.filenamePattern === "nerdy"}>
                    nerdy
                  </ButtonText>
                </Button>
              </View>
              <View className="flex flex-row items-center justify-start w-full mt-4 border-b border-accent-subtext p-2 bg-accent-button rounded-tl-base rounded-tr-base">
                <Film size={20} color="#e1e1e1" />
                <Text className="text-accent text-base font-noto-reg ml-2">
                  {config.filenamePattern === "classic"
                    ? "youtube_dQw4w9WgXcQ_1280x720_h264.mp4"
                    : config.filenamePattern === "basic"
                    ? "Video Title (720p, h264).mp4"
                    : config.filenamePattern === "pretty"
                    ? "Video Title (720p, h264, youtube).mp4"
                    : "Video Title (720p, h264, youtube, dQw4w9WgXcQ).mp4"}
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full mt-0 bg-accent-button rounded-bl-base rounded-br-base p-2 mb-4">
                <Headphones size={20} color="#e1e1e1" />
                <Text className="text-accent text-base font-noto-reg ml-2">
                  {config.filenamePattern === "classic"
                    ? "youtube_dQw4w9WgXcQ_audio.mp3"
                    : config.filenamePattern === "basic"
                    ? "Audio Title - Audio Author.mp3"
                    : config.filenamePattern === "pretty"
                    ? "Audio Title - Audio Author (soundcloud).mp3"
                    : "Audio Title - Audio Author (soundcloud, 123456789).mp3"}
                </Text>
              </View>
              <Text className="text-accent-subtext text-xs font-noto-reg text-left w-full">
                some services don't support rich file names and always use the
                classic pattern.
              </Text>
              <View className="flex flex-row items-center justify-start w-full mt-8 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">
                  cobalt api server
                </Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <TextInput
                  style={{
                    backgroundColor: "#191919",
                    color: "#e1e1e1",
                    width: "100%",
                    padding: 10,
                    paddingLeft: 20,
                    paddingRight: 20,
                    borderRadius: 8,
                    fontFamily: "NotoSansMono_400Regular",
                  }}
                  placeholder="https://api.cobalt.tools"
                  selectionColor="#6e6e6e"
                  cursorColor="#e1e1e1"
                  placeholderTextColor="#6e6e6e"
                  keyboardType="url"
                  value={config.cobaltServer}
                  onChangeText={(newUrl) => {
                    setConfigKey("cobaltServer", newUrl);
                    setConfig((prev) => ({
                      ...prev,
                      cobaltServer: newUrl,
                    }));
                  }}
                />
              </View>
              <Text className="text-accent-subtext text-sm font-noto-reg mt-4 text-left w-full">
                the server lithium uses to download videos. don't change this
                unless you're hosting your own cobalt instance.
              </Text>
              <View className="flex flex-row items-center justify-start w-full mt-8 border-b border-accent-subtext pb-2 mx-4 mb-4">
                <Text className="text-accent-subtext font-noto-reg">misc</Text>
              </View>
              <View className="flex flex-row items-center justify-start w-full">
                <Button
                  style="rounded-base flex flex-row items-center justify-start pl-2"
                  // active={config.disableMetadata}
                  onPress={() => {
                    setConfigKey("disableMetadata", !config.disableMetadata);
                    setConfig((prev) => ({
                      ...prev,
                      disableMetadata: !prev.disableMetadata,
                    }));
                  }}
                >
                  <View
                    className="w-6 h-6 flex flex-row items-center justify-center rounded-md border border-accent"
                    style={{
                      backgroundColor: config.disableMetadata
                        ? "#e1e1e1"
                        : "#191919",
                    }}
                  >
                    <Check size={20} color="#191919" />
                  </View>
                  <ButtonText style="ml-3 text-logo">
                    remove metadata
                  </ButtonText>
                </Button>
              </View>
              <Text className="text-accent-subtext text-sm font-noto-reg mt-4 text-left w-full">
                remove metadata (title, author, etc) from downloaded files.
              </Text>
            </>
          ) : null}
        </ScrollView>
        <View className="flex flex-row items-center justify-start w-full absolute bottom-0 bg-accent-button pr-2 py-2">
          <Pressable
            className="flex flex-row items-center justify-center w-1/12 -my-2 py-2"
            onPress={() => setShowSettings(false)}
          >
            <ArrowLeft size={18} color="#e1e1e1" />
          </Pressable>
          <View className="flex flex-row items-center justify-start w-11/12">
            <Button
              style="rounded-base w-1/3"
              active={settingsTab === 0}
              onPress={() => setSettingsTab(0)}
            >
              <Clapperboard
                size={20}
                color={settingsTab === 0 ? "#000000" : "#e1e1e1"}
              />
              <ButtonText active={settingsTab === 0} style="ml-2">
                video
              </ButtonText>
            </Button>
            <Button
              style="rounded-base w-1/3"
              active={settingsTab === 1}
              onPress={() => setSettingsTab(1)}
            >
              <Music4
                size={20}
                color={settingsTab === 1 ? "#000000" : "#e1e1e1"}
              />
              <ButtonText active={settingsTab === 1} style="ml-2">
                audio
              </ButtonText>
            </Button>
            <Button
              style="rounded-base w-1/3"
              active={settingsTab === 2}
              onPress={() => setSettingsTab(2)}
            >
              <Info
                size={20}
                color={settingsTab === 2 ? "#000000" : "#e1e1e1"}
              />
              <ButtonText active={settingsTab === 2} style="ml-2">
                other
              </ButtonText>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background w-screen h-screen items-center justify-center flex-col px-4">
      <StatusBar style="light" />
      <Text className="text-accent text-lg font-noto-reg mb-2">lithium</Text>
      <View className="flex flex-row items-center w-full mb-4">
        <Link
          size={18}
          color="#6e6e6e"
          style={{
            position: "absolute",
            left: 10,
            top: 15,
          }}
        />
        <TextInput
          // className="w-full p-2 border-b border-accent-subtext text-accent text-base font-noto-reg focus:border-accent pl-10 pr-20"
          style={{
            width: "100%",
            padding: 10,
            paddingLeft: 40,
            paddingRight: 80,
            borderBottomWidth: 1,
            borderBottomColor: "#6e6e6e",
            color: "#e1e1e1",
            fontSize: 16,
            fontFamily: "NotoSansMono_400Regular",
          }}
          placeholder="paste the link here"
          selectionColor="#6e6e6e"
          cursorColor="#e1e1e1"
          placeholderTextColor="#6e6e6e"
          keyboardType="text"
          value={url}
          onChangeText={(newUrl) => {
            if (!isLoading) setUrl(newUrl);
          }}
          onSubmitEditing={() => {
            if (!isLoading) download();
          }}
        />
        {url.length ? (
          <View
            style={{
              position: "absolute",
              right: 10,
              top: 0,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Pressable
              style={{
                padding: 10,
                paddingLeft: 5,
                paddingRight: 5,
              }}
              onPress={() => setUrl("")}
            >
              <X size={18} color="#e1e1e1" />
            </Pressable>
            {canDownload ? (
              <Pressable
                style={{
                  padding: 10,
                  marginRight: -5,
                }}
                onPress={() => {
                  if (isLoading) return;
                  download();
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#e1e1e1" />
                ) : (
                  <ArrowRight size={18} color="#e1e1e1" />
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      <View className="flex flex-row items-center justify-center w-full px-1">
        <View className="flex flex-row items-center justify-center w-3/4 mr-2">
          <Button
            style="mr-0 rounded-tl-base rounded-bl-base w-1/2"
            active={!audioMode}
            onPress={() => setAudioMode(false)}
          >
            <Sparkles size={20} color={audioMode ? "#e1e1e1" : "#000000"} />
            <ButtonText active={!audioMode} style="ml-2">
              auto
            </ButtonText>
          </Button>
          <Button
            style="rounded-tr-base rounded-br-base w-1/2"
            active={audioMode}
            onPress={() => setAudioMode(true)}
          >
            <Music4 size={20} color={audioMode ? "#000000" : "#e1e1e1"} />
            <ButtonText active={audioMode} style="ml-2">
              audio only
            </ButtonText>
          </Button>
        </View>
        <Button
          onPress={async () => {
            const text = await Clipboard.getStringAsync();
            setUrl(text);
          }}
          style="rounded-base w-1/4"
        >
          <ClipboardIcon size={20} color={"#e1e1e1"} />
          <ButtonText style="ml-2">paste</ButtonText>
        </Button>
      </View>
      {error ? (
        <View className="flex flex-row items-center justify-center w-full px-1 mt-4">
          <AlertTriangle size={20} color={"#e1e1e1"} />
          <Text className="text-accent text-base font-noto-reg ml-2">
            error: {error}
          </Text>
        </View>
      ) : status ? (
        <View className="flex flex-row items-center justify-center w-full px-1 mt-4">
          <Info size={20} color={"#e1e1e1"} />
          <Text className="text-accent text-base font-noto-reg ml-2">
            {status}
          </Text>
        </View>
      ) : null}
      <View className="flex flex-row items-center justify-center w-full absolute bottom-4 px-1">
        <Button
          onPress={() => {
            if (!isLoading) setShowAbout(true);
          }}
          style="rounded-base w-1/2 mr-2"
        >
          <Info size={20} color={"#e1e1e1"} />
          <ButtonText style="ml-2">about</ButtonText>
        </Button>
        <Button
          onPress={() => {
            if (!isLoading) setShowSettings(true);
          }}
          style="rounded-base w-1/2"
        >
          <Settings size={20} color={"#e1e1e1"} />
          <ButtonText style="ml-2">settings</ButtonText>
        </Button>
      </View>
    </SafeAreaView>
  );
}

/*
reference for self
[data-theme=dark] {
    --accent: rgb(225, 225, 225); // #E1E1E1
    --accent-highlight: rgb(225, 225, 225, 4%); // #E1E1E1
    --accent-subtext: rgb(110, 110, 110); // #6E6E6E
    --accent-hover: rgb(30, 30, 30); // #1E1E1E
    --accent-hover-elevated: rgb(48, 48, 48); // #303030
    --accent-hover-transparent: rgba(48, 48, 48, .5); // #303030 
    --accent-button: rgb(25, 25, 25);  // #191919
    --accent-button-elevated: rgb(42, 42, 42); // #2A2A2A
    --glass: rgba(25, 25, 25, .85); // #191919
    --glass-lite: rgba(25, 25, 25, .98); // #191919
    --subbackground: rgb(10, 10, 10); // #0A0A0A
    --background: rgb(0, 0, 0); // #000000
    --background-backdrop: rgba(0, 0, 0, .5)
*/
