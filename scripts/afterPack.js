const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  if (process.platform !== 'darwin') {
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log(`Stripping extended attributes from: ${appPath}`);
  execSync(`xattr -cr "${appPath}"`);
};
