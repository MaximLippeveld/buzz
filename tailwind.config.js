module.exports = {
  purge: [
    './src/*.html',
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
