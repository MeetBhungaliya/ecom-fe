import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const downloadsDir = path.join(projectRoot, 'public', 'downloads');
const iosPath = path.join(projectRoot, 'ios');
const androidPath = path.join(projectRoot, 'android');

function run(command, cwd = projectRoot) {
  console.log(`\n$ ${command}`);
  execSync(command, {
    cwd,
    stdio: 'inherit',
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✔ ${path.basename(dest)} created`);
    return true;
  }
  return false;
}

function buildAndroid() {
  if (!fs.existsSync(androidPath)) {
    console.log('Android project not found.');
    return;
  }

  console.log('\n========== Android ==========');

  run('./gradlew assembleDebug', androidPath);

  copyIfExists(
    path.join(
      androidPath,
      'app/build/outputs/apk/debug/app-debug.apk'
    ),
    path.join(downloadsDir, 'ecom-app.apk')
  );
}

function getIOSBuildTarget(appDir) {
  const workspace = path.join(appDir, 'App.xcworkspace');
  const project = path.join(appDir, 'App.xcodeproj');

  if (fs.existsSync(workspace)) {
    return '-workspace App.xcworkspace';
  }

  if (fs.existsSync(project)) {
    return '-project App.xcodeproj';
  }

  throw new Error(
    'Neither App.xcworkspace nor App.xcodeproj was found.'
  );
}

function zipApp(appPath, outputZip) {
  const cwd = path.dirname(appPath);
  run(`zip -qry "${outputZip}" "${path.basename(appPath)}"`, cwd);
}

function buildIOS() {
  if (!fs.existsSync(iosPath)) {
    console.log('iOS project not found.');
    return;
  }

  console.log('\n========== iOS ==========');

  const appDir = path.join(iosPath, 'App');
  const buildTarget = getIOSBuildTarget(appDir);

  console.log(`Using ${buildTarget}`);

  fs.rmSync(path.join(appDir, 'build'), {
    recursive: true,
    force: true,
  });

  try {
    console.log('\nArchiving for device...');

    run(
      `xcodebuild archive \
${buildTarget} \
-scheme App \
-archivePath build/App.xcarchive \
-sdk iphoneos \
CODE_SIGNING_ALLOWED=NO`,
      appDir
    );

    const appBundle = path.join(
      appDir,
      'build/App.xcarchive/Products/Applications/App.app'
    );

    if (fs.existsSync(appBundle)) {
      zipApp(
        appBundle,
        path.join(downloadsDir, 'ecom-app-ios.zip')
      );

      console.log('✔ iOS archive created');
      return;
    }

    throw new Error('App.app not found after archive.');
  } catch (err) {
    console.log('\nArchive failed.');
    console.log(err.message);

    console.log('\nTrying Simulator build...');

    run(
      `xcodebuild \
${buildTarget} \
-scheme App \
-sdk iphonesimulator \
-derivedDataPath build \
CODE_SIGNING_ALLOWED=NO \
build`,
      appDir
    );

    const simulatorApp = path.join(
      appDir,
      'build/Build/Products/Debug-iphonesimulator/App.app'
    );

    if (!fs.existsSync(simulatorApp)) {
      throw new Error('Simulator build succeeded but App.app was not found.');
    }

    zipApp(
      simulatorApp,
      path.join(downloadsDir, 'ecom-app-ios-simulator.zip')
    );

    console.log('✔ Simulator build created');
  }
}

function main() {
  ensureDir(downloadsDir);

  console.log('\n========== Web ==========');
  run('npm run build');

  if (!fs.existsSync(androidPath)) {
    run('npx cap add android');
  }

  if (!fs.existsSync(iosPath)) {
    run('npx cap add ios');
  }

  console.log('\n========== Capacitor Sync ==========');
  run('npx cap sync');

  buildAndroid();
  buildIOS();

  console.log('\n========== Finished ==========');

  const files = [
    'ecom-app.apk',
    'ecom-app-ios.zip',
    'ecom-app-ios-simulator.zip',
  ];

  files.forEach(file => {
    const full = path.join(downloadsDir, file);
    if (fs.existsSync(full)) {
      console.log(`✔ public/downloads/${file}`);
    }
  });
}

main();