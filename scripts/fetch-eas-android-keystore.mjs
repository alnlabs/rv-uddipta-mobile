#!/usr/bin/env node
/**
 * Download the EAS Android production keystore and wire local release signing.
 *
 *   npm run android:keystore
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const packageName = "com.alnlabs.rvuddipta";

function loadSession() {
  const statePath = path.join(os.homedir(), ".expo", "state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const sessionSecret = state.auth?.sessionSecret;
  const username = state.auth?.username;
  if (!sessionSecret || !username) {
    throw new Error("Not logged in to Expo. Run: eas login");
  }
  return { sessionSecret, username };
}

function gql(sessionSecret, query, variables) {
  const body = JSON.stringify({ query, variables });
  const bodyFile = path.join(os.tmpdir(), `eas-gql-${process.pid}.json`);
  fs.writeFileSync(bodyFile, body, { mode: 0o600 });
  try {
    const raw = execFileSync(
      "curl",
      [
        "-sS",
        "https://api.expo.dev/graphql",
        "-H",
        "content-type: application/json",
        "-H",
        `expo-session: ${sessionSecret}`,
        "--data-binary",
        `@${bodyFile}`,
      ],
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );
    const json = JSON.parse(raw);
    if (json.errors) {
      throw new Error(JSON.stringify(json.errors, null, 2).slice(0, 800));
    }
    return json.data;
  } finally {
    fs.rmSync(bodyFile, { force: true });
  }
}

function main() {
  const { sessionSecret, username } = loadSession();
  const projectFullName = `@${username}/rv-uddipta`;

  const data = gql(
    sessionSecret,
    `
    query ($projectFullName: String!, $applicationIdentifier: String) {
      app {
        byFullName(fullName: $projectFullName) {
          id
          androidAppCredentials(
            filter: {
              applicationIdentifier: $applicationIdentifier
              legacyOnly: false
            }
          ) {
            id
            androidAppBuildCredentialsList {
              id
              name
              isDefault
              androidKeystore {
                id
                type
                keystore
                keystorePassword
                keyAlias
                keyPassword
                sha1CertificateFingerprint
              }
            }
          }
        }
      }
    }
  `,
    {
      projectFullName,
      applicationIdentifier: packageName,
    },
  );

  const app = data.app?.byFullName;
  if (!app) throw new Error(`App not found: ${projectFullName}`);

  const creds = app.androidAppCredentials?.[0];
  const builds = creds?.androidAppBuildCredentialsList || [];
  const build =
    builds.find((item) => item.isDefault && item.androidKeystore) ||
    builds.find((item) => item.androidKeystore);
  const keystore = build?.androidKeystore;
  if (!keystore?.keystore) {
    throw new Error("No Android keystore on EAS. Create one with: eas credentials -p android");
  }

  const androidDir = path.join(root, "android");
  const appDir = path.join(androidDir, "app");
  if (!fs.existsSync(appDir)) {
    throw new Error("android/ folder missing. Run: npx expo prebuild -p android");
  }

  const keystorePath = path.join(appDir, "release.keystore");
  const propsPath = path.join(androidDir, "keystore.properties");

  fs.writeFileSync(keystorePath, Buffer.from(keystore.keystore, "base64"));
  fs.writeFileSync(
    propsPath,
    [
      "storeFile=app/release.keystore",
      `storePassword=${keystore.keystorePassword}`,
      `keyAlias=${keystore.keyAlias}`,
      `keyPassword=${keystore.keyPassword}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  console.log("Wrote", path.relative(root, keystorePath));
  console.log("Wrote", path.relative(root, propsPath));
  console.log("SHA1", keystore.sha1CertificateFingerprint);
  console.log("Alias", keystore.keyAlias);
  console.log("");
  console.log("Next:");
  console.log("  adb uninstall com.alnlabs.rvuddipta");
  console.log("  npx expo run:android --variant release");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
