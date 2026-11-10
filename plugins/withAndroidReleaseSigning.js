const { withAppBuildGradle } = require("@expo/config-plugins");

const MARK = "rv-uddipta-release-signing";

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARK)) {
      return cfg;
    }

    if (!contents.includes("signingConfigs {")) {
      return cfg;
    }

    contents = contents.replace(
      /signingConfigs\s*\{/,
      `// ${MARK}
    def rvKeystorePropertiesFile = rootProject.file("keystore.properties")
    def rvKeystoreProperties = new Properties()
    if (rvKeystorePropertiesFile.exists()) {
        rvKeystoreProperties.load(new FileInputStream(rvKeystorePropertiesFile))
    }
    signingConfigs {`,
    );

    contents = contents.replace(
      /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n\s*\})/,
      `$1
        release {
            if (rvKeystorePropertiesFile.exists()) {
                storeFile rootProject.file(rvKeystoreProperties['storeFile'])
                storePassword rvKeystoreProperties['storePassword']
                keyAlias rvKeystoreProperties['keyAlias']
                keyPassword rvKeystoreProperties['keyPassword']
            }
        }`,
    );

    contents = contents.replace(
      /signingConfig\s+signingConfigs\.debug(\s*\n\s*def enableShrinkResources)/,
      `signingConfig rvKeystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug$1`,
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withAndroidReleaseSigning;
