const { author, build, version } = require("./package.json");

module.exports = {
  ...build,
  extraMetadata: {
    ...build.extraMetadata,
    description: `${build.productName} v${version} | Developer: ${author}`,
  },
};
