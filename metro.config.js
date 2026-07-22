const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix react-native-svg web compatibility.
// ReactNativeSVG.web.js imports relative paths (./utils/fetchData,
// ./lib/extract/types) that don't exist in the published module build.
// We redirect any such missing file to a stub — we only use inline SVG.
const EMPTY_STUB = path.join(__dirname, 'src', 'lib', '_svg_stub.js');

// Ensure the stub file exists
if (!fs.existsSync(EMPTY_STUB)) {
  fs.writeFileSync(EMPTY_STUB, '// empty stub\nexport {};\n');
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const { resolveRequest, ...restContext } = context;
  if (platform === 'web' && moduleName.startsWith('.') && context.originModulePath) {
    const origin = context.originModulePath.replace(/\\/g, '/');
    if (origin.includes('/react-native-svg/lib/module/')) {
      const dir = path.dirname(context.originModulePath);
      const base = path.resolve(dir, moduleName);
      // Check if the file exists with any Metro-tried extension
      const exists = ['.js', '.jsx', '.ts', '.tsx', '.json', ''].some((ext) => {
        try {
          return fs.statSync(base + ext).isFile();
        } catch {
          return false;
        }
      });
      if (!exists) {
        return { type: 'sourceFile', filePath: EMPTY_STUB };
      }
    }
  }
  return resolveRequest(restContext, moduleName, platform);
};

module.exports = config;
