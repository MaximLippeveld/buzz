module.exports = {
  purge: [
    './dist/*.html',
    './src/js/*.js'
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      backgroundColor: ["active"]
    },
  },
  plugins: [],
}
