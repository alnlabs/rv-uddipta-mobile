const app = require("./app.json");

function iosUrlScheme(clientId) {
  if (!clientId.endsWith(".apps.googleusercontent.com")) return "";
  const id = clientId.slice(0, -".apps.googleusercontent.com".length);
  return id ? `com.googleusercontent.apps.${id}` : "";
}

const scheme = iosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "");
const plugins = (app.expo.plugins || []).filter((plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return name !== "@react-native-google-signin/google-signin";
});

if (scheme) {
  plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme: scheme }]);
}

module.exports = {
  expo: {
    ...app.expo,
    plugins,
  },
};
