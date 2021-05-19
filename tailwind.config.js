module.exports = {
  purge: [
    './public/*.html',
    './src/js/*.js'
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      backgroundColor: ["active"],
      outline: ["focus"]
    },
  },
  plugins: [],
}
