// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  exclude: ['**/node_modules/**/*'],
  mount: {
    "src/js": {url: "/bin"},
    "public": {url: "/public"},
    "config": {url: "/"},
  },
  plugins: [
  ],
  packageOptions: {
    polyfillNode: true
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    out: "buzz",
    htmlFragments: true
  },
};
