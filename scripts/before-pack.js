/**
 * Electron Builder - Before Pack Hook
 *
 * Runs before the application is packed into the distributable format.
 */

const fs = require('fs');
const path = require('path');

module.exports = async function (context) {
  console.log('Running before-pack hook...');

  const { appOutDir, packager, electronPlatformName } = context;

  // Log build info
  console.log(`Platform: ${electronPlatformName}`);
  console.log(`App output directory: ${appOutDir}`);

  // Verify Next.js standalone build exists
  const standalonePath = path.join(process.cwd(), '.next', 'standalone');
  if (!fs.existsSync(standalonePath)) {
    throw new Error(
      'Next.js standalone build not found. Run `npm run electron:build:next` first.'
    );
  }

  // Verify static files exist
  const staticPath = path.join(process.cwd(), '.next', 'static');
  if (!fs.existsSync(staticPath)) {
    throw new Error('Next.js static files not found.');
  }

  // Verify public directory exists
  const publicPath = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicPath)) {
    console.warn('Warning: public directory not found.');
  }

  // Verify Electron main process files are compiled
  const mainPath = path.join(process.cwd(), 'electron', 'main', 'index.js');
  if (!fs.existsSync(mainPath)) {
    throw new Error(
      'Electron main process not compiled. Run `npm run electron:compile` first.'
    );
  }

  // Verify preload script is compiled
  const preloadPath = path.join(process.cwd(), 'electron', 'preload', 'index.js');
  if (!fs.existsSync(preloadPath)) {
    throw new Error(
      'Electron preload script not compiled. Run `npm run electron:compile` first.'
    );
  }

  console.log('All required files verified.');

  // Create a production package.json for the bundled app
  const packageJson = require(path.join(process.cwd(), 'package.json'));
  const productionPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    main: 'electron/main/index.js',
    author: packageJson.author,
    description: packageJson.description,
    license: packageJson.license,
  };

  // Note: The actual package.json replacement is handled by electron-builder
  console.log('Before-pack hook completed successfully.');
};
