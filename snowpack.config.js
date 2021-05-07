// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  exclude: ['**/node_modules/**/*'],
  mount: {
    "src/js": {url: "/bin"},
    "dist": {url: "/", static: true, resolve: false}
  },
  plugins: [
    ['@snowpack/plugin-webpack', {}]
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
