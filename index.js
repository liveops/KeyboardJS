
// libs
var KeyboardJS = require('./lib/keyboard');
var Locale = require('./lib/locale');
var KeyCombo = require('./lib/key-combo');
var locales = {
  us: require('./locales/us');
};

var keyboardJS = new KeyboardJS();
keyboardJS.setLocale(locales.us);

exports = module.exports = keyboardJS;
exports.locales = locales;
exports.KeyboardJS = KeyboardJS;
exports.Locale = Locale;
exports.KeyCombo = KeyCombo;
