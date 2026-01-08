/**
 * Electron Builder - After Pack Hook
 *
 * Runs after the application is packed but before creating the final installer.
 */

const fs = require('fs');
const path = require('path');

module.exports = async function (context) {
  console.log('Running after-pack hook...');

  const { appOutDir, packager, electronPlatformName, arch } = context;

  console.log(`Platform: ${electronPlatformName}`);
  console.log(`Architecture: ${arch}`);
  console.log(`Output directory: ${appOutDir}`);

  // Platform-specific post-processing
  if (electronPlatformName === 'linux') {
    await processLinux(context);
  } else if (electronPlatformName === 'win32') {
    await processWindows(context);
  }

  console.log('After-pack hook completed successfully.');
};

async function processLinux(context) {
  const { appOutDir } = context;

  // Set executable permissions on the main binary
  const appName = context.packager.appInfo.productFilename;
  const binaryPath = path.join(appOutDir, appName);

  if (fs.existsSync(binaryPath)) {
    fs.chmodSync(binaryPath, '755');
    console.log(`Set executable permissions on ${appName}`);
  }

  // Set SUID on chrome-sandbox if it exists
  const chromeSandbox = path.join(appOutDir, 'chrome-sandbox');
  if (fs.existsSync(chromeSandbox)) {
    try {
      fs.chmodSync(chromeSandbox, '4755');
      console.log('Set SUID on chrome-sandbox');
    } catch (error) {
      console.warn(
        'Warning: Could not set SUID on chrome-sandbox (requires root)'
      );
    }
  }
}

async function processWindows(context) {
  const { appOutDir } = context;

  // Windows-specific processing
  console.log('Windows post-processing complete');

  // You can add Windows-specific tasks here, such as:
  // - Code signing verification
  // - Resource patching
  // - DLL verification
}
