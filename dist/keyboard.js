!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.keyboardJS=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// libs
var KeyboardJS = require('./lib/keyboard');
var Locale = require('./lib/locale');
var KeyCombo = require('./lib/key-combo');
var usLocale = require('./locales/us');

var keyboardJS = new KeyboardJS();
keyboardJS.setLocale(usLocale);

exports = module.exports = keyboardJS;
exports.KeyboardJS = KeyboardJS;
exports.Locale = Locale;
exports.KeyCombo = KeyCombo;

},{"./lib/key-combo":2,"./lib/keyboard":3,"./lib/locale":4,"./locales/us":5}],2:[function(require,module,exports){

// modules
var guard = require('type-guard');


function KeyCombo(keyComboStr) {
  var self = this;

  guard('keyComboStr', keyComboStr, 'string');

  self.sourceStr = keyComboStr;
  self.subCombos = KeyCombo.parseComboStr(keyComboStr);
  self.keyNames = self.subCombos.reduce(function(memo, nextSubCombo) {
    return memo.concat(nextSubCombo);
  });
}

KeyCombo.sequenceDeliminator = '>>';
KeyCombo.comboDeliminator = '>';
KeyCombo.keyDeliminator = '+';

KeyCombo.parseComboStr = function(keyComboStr) {
  guard('keyComboStr', keyComboStr, 'string');

  var subComboStrs = KeyCombo._splitStr(keyComboStr, KeyCombo.comboDeliminator);
  var combo = [];
  for (var i = 0 ; i < subComboStrs.length; i += 1) {
    combo.push(KeyCombo._splitStr(subComboStrs[i], KeyCombo.keyDeliminator));
  }
  return combo;
};

KeyCombo._splitStr = function(str, deliminator) {
  var s = str;
  var d = deliminator;
  var c = '';
  var ca = [];

  for (var ci = 0; ci < s.length; ci += 1) {
    if (ci > 0 && s[ci] === d && s[ci - 1] !== '\\') {
      ca.push(c.trim());
      c = '';
      ci += 1;
    }
    c += s[ci];
  }
  if (c) { ca.push(c.trim()); }

  return ca;
};

KeyCombo.prototype.check = function(pressedKeyNames) {
  var self = this;

  guard('pressedKeyNames', pressedKeyNames, 'array');

  var startingKeyNameIndex = 0;
  for (var i = 0; i < self.subCombos.length; i += 1) {
    startingKeyNameIndex = self._checkSubCombo(
      self.subCombos[i],
      startingKeyNameIndex,
      pressedKeyNames
    );
    if (startingKeyNameIndex === -1) { return false; }
  }
  return true;
};

KeyCombo.prototype.isEqual = function(otherKeyCombo) {
  var self = this;

  guard('otherKeyCombo', otherKeyCombo, [ 'object', 'string' ]);

  if (typeof otherKeyCombo === 'string') {
    otherKeyCombo = new KeyCombo(otherKeyCombo);
  } else {
    guard('otherKeyCombo.subCombos', otherKeyCombo.subCombos, 'array');
  }

  if (self.subCombos.length !== otherKeyCombo.subCombos.length) {
    return false;
  }
  for (var i = 0; i < self.subCombos.length; i += 1) {
    if (self.subCombos[i].length !== otherKeyCombo.subCombos[i].length) {
      return false;
    }
  }

  for (var i = 0; i < self.subCombos.length; i += 1) {
    var subCombo = self.subCombos[i];
    var otherSubCombo = otherKeyCombo.subCombos[i].slice(0);
    for (var j = 0; j < subCombo.length; j += 1) {
      var keyName = subCombo[j];
      var index = otherSubCombo.indexOf(keyName);
      if (index > -1) {
        otherSubCombo.splice(index, 1);
      }
    }
    if (otherSubCombo.length !== 0) {
      return false;
    }
  }

  return true;
};

KeyCombo.prototype._checkSubCombo = function(
  subCombo,
  startingKeyNameIndex,
  pressedKeyNames
) {
  var self = this;

  guard('subCombo', subCombo, 'array');
  guard('startingKeyNameIndex', startingKeyNameIndex, 'number');
  guard('pressedKeyNames', pressedKeyNames, 'array');

  subCombo = subCombo.slice(0);
  pressedKeyNames = pressedKeyNames.slice(startingKeyNameIndex);

  var endIndex = startingKeyNameIndex;
  for (var i = 0; i < subCombo.length; i += 1) {

    var keyName = subCombo[i];
    if (keyName[0] === '\\') {
      var escapedKeyName = keyName.slice(1);
      if (
        escapedKeyName === KeyCombo.comboDeliminator ||
        escapedKeyName === KeyCombo.keyDeliminator
      ) {
        keyName = escapedKeyName;
      }
    }

    var index = pressedKeyNames.indexOf(keyName);
    if (index > -1) {
      subCombo.splice(i, 1);
      i -= 1;
      if (index > endIndex) {
        endIndex = index;
      }
      if (subCombo.length === 0) {
        return endIndex;
      }
    }
  }
  return -1;
};


module.exports = KeyCombo;

},{"type-guard":6}],3:[function(require,module,exports){
(function (global){

// modules
var guard = require('type-guard');

// libs
var Locale = require('./locale');
var KeyCombo = require('./key-combo');


function KeyboardJS(targetWindow) {
  var self = this;

  guard('targetWindow', targetWindow, [ 'object', 'undefined' ]);

  self.locale = null;
  self._currentContext = null;
  self._contexts = {};
  self._listeners = [];
  self._appliedListeners = [];
  self._locales = {};
  self._targetDocument = null;
  self._targetWindow = null;

  self.setContext('default');
  self.watch();
}

KeyboardJS.prototype.setLocale = function(localeName, localeBuilder) {
  var self = this;

  var locale = null;
  if (typeof localeName === 'string') {

    guard('localeName', localeName, [ 'string', 'null' ]);
    guard('localeBuilder', localeBuilder, [ 'function', 'undefined' ]);

    if (localeBuilder) {
      locale = new Locale(localeName);
      localeBuilder(locale);
    } else {
      locale = self._locales[localeName] || null;
    }
  } else {

    guard('locale', localeName, 'object');
    guard('locale.localeName', localeName.localeName, 'string');
    guard('locale.pressKey', localeName.pressKey, 'function');
    guard('locale.releaseKey', localeName.releaseKey, 'function');
    guard('locale.pressedKeys', localeName.pressedKeys, 'array');

    locale = localeName;
    localeName = locale.localeName;
  }

  self.locale = locale;
  self._locales[localeName] = locale;
  if (locale) {
    self.locale.pressedKeys = locale.pressedKeys;
  }
};

KeyboardJS.prototype.getLocale = function(localName) {
  var self = this;
  localName || (localName = self.locale.localeName);
  return self._locales[localName] || null;
};

KeyboardJS.prototype.bind = function(keyComboStr, pressHandler, releaseHandler) {
  var self = this;

  guard('keyComboStr', keyComboStr, [ 'string', 'array' ]);
  guard('pressHandler', pressHandler, [ 'function', 'undefined', 'null' ]);
  guard('releaseHandler', releaseHandler, [ 'function', 'undefined', 'null' ]);

  if (typeof keyComboStr === 'string') {
    self._listeners.push({
      keyCombo: new KeyCombo(keyComboStr),
      pressHandler: pressHandler || null,
      releaseHandler: releaseHandler || null,
      preventRepeat: false
    });
  } else {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      self.bind(keyComboStr[i], pressHandler, releaseHandler);
    }
  }
};
KeyboardJS.prototype.addListener = KeyboardJS.prototype.bind;
KeyboardJS.prototype.on = KeyboardJS.prototype.bind;

KeyboardJS.prototype.unbind = function(keyComboStr, pressHandler, releaseHandler) {
  var self = this;

  guard('keyComboStr', keyComboStr, [ 'string', 'array' ]);
  guard('pressHandler', pressHandler, [ 'function', 'undefined' ]);
  guard('releaseHandler', releaseHandler, [ 'function', 'undefined' ]);

  if (typeof keyComboStr === 'string') {
    for (var i = 0; i < self._listeners.length; i += 1) {
      var listener = self._listeners[i];

      var comboMatches = listener.keyCombo.isEqual(keyComboStr);
      var pressHandlerMatches = !pressHandler ||
        pressHandler === listener.pressHandler;
      var releaseHandlerMatches = listener.releaseHandler === null ||
        releaseHandler === listener.releaseHandler;

      if (comboMatches && pressHandlerMatches && releaseHandlerMatches) {
        self._listeners.splice(i, 1);
        i -= 1;
      }
    }
  } else {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      self.bind(keyComboStr[i], pressHandler, releaseHandler);
    }
  }
};
KeyboardJS.prototype.removeListener = KeyboardJS.prototype.unbind;
KeyboardJS.prototype.off = KeyboardJS.prototype.unbind;

KeyboardJS.prototype.setContext = function(contextName) {
  var self = this;
  guard('contextName', contextName, 'string');
  if (self.locale) {
    self.releaseAllKeys();
  }
  if (!self._contexts[contextName]) {
    self._contexts[contextName] = [];
  }
  self._listeners = self._contexts[contextName];
  self._currentContext = contextName;
};

KeyboardJS.prototype.getContext = function() {
  var self = this;
  return self._currentContext;
};

KeyboardJS.prototype.watch = function(targetDocument, targetWindow) {
  var self = this;

  guard('targetDocument', targetDocument, [ 'object', 'undefined' ]);
  guard('targetWindow', targetWindow, [ 'object', 'undefined' ]);

  self.stop();

  if (targetDocument && targetDocument.document && !targetWindow) {
    targetWindow = targetDocument;
    targetDocument = null;
  }
  if (!targetWindow) {
    targetWindow = global.window;
  }
  if (targetWindow && !targetDocument) {
    targetDocument = targetWindow.document;
  }

  if (targetDocument && targetWindow) {
    self._isModernBrowser = !!targetWindow.addEventListener;

    self._bindEvent(targetDocument, 'keydown', function(event) {
      self.pressKey(event.keyCode, event);
    });
    self._bindEvent(targetDocument, 'keyup', function(event) {
      self.releaseKey(event.keyCode, event);
    });
    self._bindEvent(targetWindow, 'focus', self.releaseAllKeys.bind(self));
    self._bindEvent(targetWindow, 'blur', self.releaseAllKeys.bind(self));

    self._targetDocument = targetDocument;
    self._targetWindow = targetWindow;
  }
};

KeyboardJS.prototype.stop = function() {
  var self = this;
  if (self._targetDocument) {
    self._unbindEvent(self._targetDocument, 'keydown', function(event) {
      self.pressKey(event.keyCode, event);
    });
    self._unbindEvent(self._targetDocument, 'keyup', function(event) {
      self.releaseKey(event.keyCode, event);
    });
    self._targetDocument = null;
  }
  if (self._targetWindow) {
    self._unbindEvent(self._targetWindow, 'focus', self.releaseAllKeys.bind(self));
    self._unbindEvent(self._targetWindow, 'blur', self.releaseAllKeys.bind(self));
    self._targetWindow = null;
  }
};

KeyboardJS.prototype.pressKey = function(keyCode, event) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);
  guard('event', event, [ 'object', 'undefined' ]);

  self.locale.pressKey(keyCode);
  self._applyBindings(event);
};

KeyboardJS.prototype.releaseKey = function(keyCode, event) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);
  guard('event', event, [ 'object', 'undefined' ]);

  self.locale.releaseKey(keyCode);
  self._clearBindings(event);
};

KeyboardJS.prototype.releaseAllKeys = function() {
  var self = this;
  self.locale.pressedKeys.length = 0;
  self._clearBindings();
};

KeyboardJS.prototype.reset = function() {
  var self = this;
  self.releaseAllKeys();
  self._listeners.length = 0;
};

KeyboardJS.prototype._bindEvent = function(targetElement, eventName, handler) {
  var self = this;
  return self._isModernBrowser ?
    targetElement.addEventListener(eventName, handler, false) :
    targetElement.attachEvent('on' + eventName, handler);
};

KeyboardJS.prototype._unbindEvent = function(targetElement, eventName, handler) {
  var self = this;
  return self._isModernBrowser ?
    targetElement.removeEventListener(eventName, handler, false):
    targetElement.detachEvent('on' + eventName, handler);
};

KeyboardJS.prototype._applyBindings = function(event) {
  var self = this;

  event || (event = {});
  var preventRepeat = false;
  event.preventRepeat = function() { preventRepeat = true; };

  var pressedKeys = self.locale.pressedKeys.slice(0);
  var listeners = self._listeners.slice(0).sort(function(a, b) {
    return a.keyCombo.keyNames.length > b.keyCombo.keyNames.length;
  });

  for (var i = 0; i < listeners.length; i += 1) {
    var listener = listeners[i];
    var keyCombo = listener.keyCombo;
    var handler = listener.pressHandler;

    if (keyCombo.check(pressedKeys) && !listener.preventRepeat) {

      if (handler) {
        handler.call(self, event);
        if (preventRepeat) {
          listener.preventRepeat = preventRepeat;
          preventRepeat = false;
        }
      }

      for (var j = 0; j < keyCombo.keyNames.length; j += 1) {
        var index = pressedKeys.indexOf(keyCombo.keyNames[j]);
        if (index !== -1) {
          pressedKeys.splice(index, 1);
          j -= 1;
        }
      }

      if (listener.releaseHandler) {
        if (self._appliedListeners.indexOf(listener) === -1) {
          self._appliedListeners.push(listener);
        }
      }
    }
  }
};

KeyboardJS.prototype._clearBindings = function(event) {
  var self = this;

  event || (event = {});

  for (var i = 0; i < self._appliedListeners.length; i += 1) {
    var listener = self._appliedListeners[i];
    var keyCombo = listener.keyCombo;
    var handler = listener.releaseHandler;
    if (!keyCombo.check(self.locale.pressedKeys)) {
      listener.preventRepeat = false;
      handler.call(self, event);
      self._appliedListeners.splice(i, 1);
      i -= 1;
    }
  }
};

module.exports = KeyboardJS;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./key-combo":2,"./locale":4,"type-guard":6}],4:[function(require,module,exports){

// modules
var guard = require('type-guard');

// libs
var KeyCombo = require('./key-combo');


function Locale(name) {
  var self = this;

  guard('name', name, 'string');

  self.localeName = name;
  self.pressedKeys = [];
  self._appliedMacros = [];
  self._keyMap = {};
  self._macros = [];
}

Locale.prototype.bindKeyCode = function(keyCode, keyNames) {
  var self = this;

  guard('keyCode', keyCode, 'number');
  guard('keyNames', keyNames, [ 'array', 'string' ]);

  if (typeof keyNames === 'string') {
    keyNames = [keyNames];
  }

  self._keyMap[keyCode] = keyNames;
};

Locale.prototype.bindMacro = function(keyComboStr, keyNames) {
  var self = this;

  guard('keyComboStr', keyComboStr, 'string');
  guard('keyNames', keyNames, [ 'function', 'string', 'array' ]);

  if (typeof keyNames === 'string') {
    keyNames = [ keyNames ];
  }

  var macro = {
    keyCombo: new KeyCombo(keyComboStr),
    keyNames: null,
    handler: null
  };

  if (typeof keyNames === 'function') {
    macro.handler = keyNames;
  } else {
    macro.keyNames = keyNames;
  }

  self._macros.push(macro);
};

Locale.prototype.getKeyCodes = function(keyName) {
  var self = this;

  guard('keyName', keyName, 'string');

  var keyCodes = [];
  for (var keyCode in self._keyMap) {
    var index = self._keyMap[keyCode].indexOf(keyName);
    if (index > -1) { keyCodes.push(keyCode|0); }
  }
  return keyCodes;
};

Locale.prototype.getKeyNames = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, 'number');

  return self._keyMap[keyCode] || [];
};

Locale.prototype.pressKey = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);

  if (typeof keyCode === 'string') {
    var keyCodes = self.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      self.pressKey(keyCodes[i]);
    }
  }

  else {
    var keyNames = self.getKeyNames(keyCode);
    for (var i = 0; i < keyNames.length; i += 1) {
      if (self.pressedKeys.indexOf(keyNames[i]) === -1) {
        self.pressedKeys.push(keyNames[i]);
      }
    }

    self._applyMacros();
  }
};

Locale.prototype.releaseKey = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);

  if (typeof keyCode === 'string') {
    var keyCodes = self.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      self.releaseKey(keyCodes[i]);
    }
  }

  else {
    var keyNames = self.getKeyNames(keyCode);
    for (var i = 0; i < keyNames.length; i += 1) {
      var index = self.pressedKeys.indexOf(keyNames[i]);
      if (index > -1) {
        self.pressedKeys.splice(index, 1);
      }
    }

    self._clearMacros();
  }
};

Locale.prototype._applyMacros = function() {
  var self = this;

  var macros = self._macros.slice(0);
  for (var i = 0; i < macros.length; i += 1) {
    var macro = macros[i];
    var keyCombo = macro.keyCombo;
    var keyNames = macro.keyNames;
    if (keyCombo.check(self.pressedKeys)) {
      for (var j = 0; j < keyNames.length; j += 1) {
        if (self.pressedKeys.indexOf(keyNames[j]) === -1) {
          self.pressedKeys.push(keyNames[j]);
        }
      }
      self._appliedMacros.push(macro);
    }
  }
};

Locale.prototype._clearMacros = function() {
  var self = this;

  for (var i = 0; i < self._appliedMacros.length; i += 1) {
    var macro = self._appliedMacros[i];
    var keyCombo = macro.keyCombo;
    var keyNames = macro.keyNames;
    if (!keyCombo.check(self.pressedKeys)) {
      for (var j = 0; j < keyNames.length; j += 1) {
        var index = self.pressedKeys.indexOf(keyNames[j]);
        if (index > -1) {
          self.pressedKeys.splice(index, 1);
        }
      }
      self._appliedMacros.splice(i, 1);
      i -= 1;
    }
  }
};


module.exports = Locale;

},{"./key-combo":2,"type-guard":6}],5:[function(require,module,exports){

// modules
var Locale = require('../lib/locale');


// create the locale
var locale = new Locale('us');

// general
locale.bindKeyCode(3, [ 'cancel' ]);
locale.bindKeyCode(8, [ 'backspace' ]);
locale.bindKeyCode(9, [ 'tab' ]);
locale.bindKeyCode(12, [ 'clear' ]);
locale.bindKeyCode(13, [ 'enter' ]);
locale.bindKeyCode(16, [ 'shift' ]);
locale.bindKeyCode(17, [ 'ctrl' ]);
locale.bindKeyCode(18, [ 'alt', 'menu' ]);
locale.bindKeyCode(19, [ 'pause', 'break' ]);
locale.bindKeyCode(20, [ 'capslock' ]);
locale.bindKeyCode(27, [ 'escape', 'esc' ]);
locale.bindKeyCode(32, [ 'space', 'spacebar' ]);
locale.bindKeyCode(33, [ 'pageup' ]);
locale.bindKeyCode(34, [ 'pagedown' ]);
locale.bindKeyCode(35, [ 'end' ]);
locale.bindKeyCode(36, [ 'home' ]);
locale.bindKeyCode(37, [ 'left' ]);
locale.bindKeyCode(38, [ 'up' ]);
locale.bindKeyCode(39, [ 'right' ]);
locale.bindKeyCode(40, [ 'down' ]);
locale.bindKeyCode(41, [ 'select' ]);
locale.bindKeyCode(42, [ 'printscreen' ]);
locale.bindKeyCode(43, [ 'execute' ]);
locale.bindKeyCode(44, [ 'snapshot' ]);
locale.bindKeyCode(45, [ 'insert', 'ins' ]);
locale.bindKeyCode(46, [ 'delete', 'del' ]);
locale.bindKeyCode(47, [ 'help' ]);
locale.bindKeyCode(91, [ 'command', 'windows', 'win', 'super', 'leftcommand', 'leftwindows', 'leftwin', 'leftsuper' ]);
locale.bindKeyCode(92, [ 'command', 'windows', 'win', 'super', 'rightcommand', 'rightwindows', 'rightwin', 'rightsuper' ]);
locale.bindKeyCode(145, [ 'scrolllock', 'scroll' ]);
locale.bindKeyCode(186, [ 'semicolon', ';' ]);
locale.bindKeyCode(187, [ 'equal', 'equalsign', '=' ]);
locale.bindKeyCode(188, [ 'comma', ',' ]);
locale.bindKeyCode(189, [ 'dash', '-' ]);
locale.bindKeyCode(190, [ 'period', '.' ]);
locale.bindKeyCode(191, [ 'slash', 'forwardslash', '/' ]);
locale.bindKeyCode(192, [ 'graveaccent', '`' ]);
locale.bindKeyCode(219, [ 'openbracket', '[' ]);
locale.bindKeyCode(220, [ 'backslash', '\\' ]);
locale.bindKeyCode(221, [ 'closebracket', ']' ]);
locale.bindKeyCode(222, [ 'apostrophe', '\'' ]);

// 0-9
locale.bindKeyCode(48, [ 'zero', '0' ]);
locale.bindKeyCode(49, [ 'one', '1' ]);
locale.bindKeyCode(50, [ 'two', '2' ]);
locale.bindKeyCode(51, [ 'three', '3' ]);
locale.bindKeyCode(52, [ 'four', '4' ]);
locale.bindKeyCode(53, [ 'five', '5' ]);
locale.bindKeyCode(54, [ 'six', '6' ]);
locale.bindKeyCode(55, [ 'seven', '7' ]);
locale.bindKeyCode(56, [ 'eight', '8' ]);
locale.bindKeyCode(57, [ 'nine', '9' ]);

// numpad
locale.bindKeyCode(96, [ 'numzero', 'num0' ]);
locale.bindKeyCode(97, [ 'numone', 'num1' ]);
locale.bindKeyCode(98, [ 'numtwo', 'num2' ]);
locale.bindKeyCode(99, [ 'numthree', 'num3' ]);
locale.bindKeyCode(100, [ 'numfour', 'num4' ]);
locale.bindKeyCode(101, [ 'numfive', 'num5' ]);
locale.bindKeyCode(102, [ 'numsix', 'num6' ]);
locale.bindKeyCode(103, [ 'numseven', 'num7' ]);
locale.bindKeyCode(104, [ 'numeight', 'num8' ]);
locale.bindKeyCode(105, [ 'numnine', 'num9' ]);
locale.bindKeyCode(106, [ 'nummultiply', 'num*' ]);
locale.bindKeyCode(107, [ 'numadd', 'num+' ]);
locale.bindKeyCode(108, [ 'numenter' ]);
locale.bindKeyCode(109, [ 'numsubtract', 'num-' ]);
locale.bindKeyCode(110, [ 'numdecimal', 'num.' ]);
locale.bindKeyCode(111, [ 'numdivide', 'num/' ]);
locale.bindKeyCode(144, [ 'numlock', 'num' ]);

// function keys
locale.bindKeyCode(112, [ 'f1' ]);
locale.bindKeyCode(113, [ 'f2' ]);
locale.bindKeyCode(114, [ 'f3' ]);
locale.bindKeyCode(115, [ 'f4' ]);
locale.bindKeyCode(116, [ 'f5' ]);
locale.bindKeyCode(117, [ 'f6' ]);
locale.bindKeyCode(118, [ 'f7' ]);
locale.bindKeyCode(119, [ 'f8' ]);
locale.bindKeyCode(120, [ 'f9' ]);
locale.bindKeyCode(121, [ 'f10' ]);
locale.bindKeyCode(122, [ 'f11' ]);
locale.bindKeyCode(123, [ 'f12' ]);

// secondary key symbols
locale.bindMacro('shift + `', [ 'tilde', '~' ]);
locale.bindMacro('shift + 1', [ 'exclamation', 'exclamationpoint', '!' ]);
locale.bindMacro('shift + 2', [ 'at', '@' ]);
locale.bindMacro('shift + 3', [ 'number', '#' ]);
locale.bindMacro('shift + 4', [ 'dollar', 'dollars', 'dollarsign', '$' ]);
locale.bindMacro('shift + 5', [ 'percent', '%' ]);
locale.bindMacro('shift + 6', [ 'caret', '^' ]);
locale.bindMacro('shift + 7', [ 'ampersand', 'and', '&' ]);
locale.bindMacro('shift + 8', [ 'asterisk', '*' ]);
locale.bindMacro('shift + 9', [ 'openparen', '(' ]);
locale.bindMacro('shift + 0', [ 'closeparen', ')' ]);
locale.bindMacro('shift + -', [ 'underscore', '_' ]);
locale.bindMacro('shift + =', [ 'plus', '+' ]);
locale.bindMacro('shift + [', [ 'opencurlybrace', 'opencurlybracket', '{' ]);
locale.bindMacro('shift + ]', [ 'closecurlybrace', 'closecurlybracket', '}' ]);
locale.bindMacro('shift + \\', [ 'verticalbar', '|' ]);
locale.bindMacro('shift + ;', [ 'colon', ':' ]);
locale.bindMacro('shift + \'', [ 'quotationmark', '\'' ]);
locale.bindMacro('shift + !,', [ 'openanglebracket', '<' ]);
locale.bindMacro('shift + .', [ 'closeanglebracket', '>' ]);
locale.bindMacro('shift + /', [ 'questionmark', '?' ]);

//a-z and A-Z
for (var keyCode = 65; keyCode <= 90; keyCode += 1) {
  var keyName = String.fromCharCode(keyCode + 32);
  var capitalKeyName = String.fromCharCode(keyCode);
	locale.bindKeyCode(keyCode, keyName);
	locale.bindMacro('shift + ' + keyName, capitalKeyName);
	locale.bindMacro('capslock + ' + keyName, capitalKeyName);
}


module.exports = locale;

},{"../lib/locale":4}],6:[function(require,module,exports){


// libs
var GuardError = require('./lib/guard-error');
var guard = require('./lib/guard');


exports = module.exports = function(    ) {
  return guard.check.apply(guard, arguments);
};
exports.GuardError = GuardError;
exports.guard = guard;
exports.types = guard.types;

},{"./lib/guard":8,"./lib/guard-error":7}],7:[function(require,module,exports){

// modules
var inherits = require('inherits');


function GuardError(message, fileName, lineNumber) {
  Error.call(this, message, fileName, lineNumber);

  this.message = message;
  this.name = this.constructor.name;
  if (fileName) { this.fileName = fileName; }
  if (lineNumber) { this.lineNumber = lineNumber; }

  Error.captureStackTrace(this, this.constructor);
  this._setStackOffset(1);
}
inherits(GuardError, Error);

GuardError.prototype._setStackOffset = function(stackOffset) {
  try {
    throw new Error();
  } catch(dummyErr) {
    var firstLine = this.stack.split('\n')[0];
    var lines = dummyErr.stack.split('\n');
    var line = lines[stackOffset + 2];
    var lineChunks = line.match(/\(([^\)]+)\)/)[1].split(':');
    this.stack = [firstLine].concat(lines.slice(stackOffset + 2)).join('\n');
    this.fileName = lineChunks[0];
    this.lineNumber = lineChunks[1];
    this.columnNumber = lineChunks[2];
  }
};


module.exports = GuardError;

},{"inherits":9}],8:[function(require,module,exports){

// libs
var GuardError = require('./guard-error');


exports.types = [
  'object',
  'string',
  'boolean',
  'number',
  'array',
  'regexp',
  'date',
  'stream',
  'read-stream',
  'write-stream',
  'emitter',
  'function',
  'null',
  'undefined'
];

exports.check = function(key, val, type) {
  var self = this;

  if (typeof key !== 'string') {
    throw new TypeError('key must be a string');
  }
  if (typeof type !== 'string' && (
    type === null ||
    typeof type !== 'object' ||
    typeof type.length !== 'number'
  )) {
    throw new TypeError('type must be a string or array');
  }

  var typeErr = self._validateType(type);
  if (typeErr) {
    typeErr._setStackOffset(self._stackOffset);
    throw typeErr;
  }

  var valErr = self._validateVal(key, type, val);
  if (valErr) {
    valErr._setStackOffset(self._stackOffset);
    throw valErr;
  }

  return null;
};

exports._validateType = function(type) {
  var self = this;

  if (
    type !== null &&
    typeof type === 'object' &&
    typeof type.length === 'number'
  ) {
    for (var i = 0; i < type.length; i += 1) {
      var err = self._validateType(type[i]);
      if (err) { return err; }
    }
    return null;
  }
  if (self.types.indexOf(type) === -1) {
    return new GuardError(
      'type must be one of the following values: ' + self.types.join(', ')
    );
  }
};

// validates the value against the type
exports._validateVal = function(key, type, val) {
  var self = this;

  // recursive
  if (
    type !== null &&
    typeof type === 'object' &&
    typeof type.length === 'number'
  ) {
    var ok = false;
    for (var i = 0; i < type.length; i += 1) {
      if (!self._validateVal(key, type[i], val)) {
        ok = true;
        break;
      }
    }
    if (ok) {
      return null;
    } else {
      return new GuardError(
        key + ' must be one of the following types: ' + type.join(', ')
      );
    }
  }

  // object
  if (type === 'object' && (
    val === null ||
    typeof val !== 'object'
  )) {
    return new GuardError(key + ' must be an object');
  }

  // string
  else if (type === 'string' && typeof val !== 'string') {
    return new GuardError(key + ' must be a string');
  }

  // boolean
  else if (type === 'boolean' && typeof val !== 'boolean') {
    return new GuardError(key + ' must be a boolean');
  }

  // number
  else if (type === 'number' && typeof val !== 'number') {
    return new GuardError(key + ' must be a number');
  }

  // array
  else if (type === 'array' && (
    val === null ||
    typeof val !== 'object' ||
    typeof val.length !== 'number'
  )) {
    return new GuardError(key + ' must be an array');
  }

  // regex
  else if (type === 'regexp' && val.constructor !== RegExp) {
    return new GuardError(key + ' must be a regexp');
  }

  // date
  else if (type === 'date' && val.constructor !== Date) {
    return new GuardError(key + ' must be a date');
  }

  // emitter
  else if (type === 'emitter' && (
    typeof val.addListener !== 'function' ||
    typeof val.emit !== 'function'
  )) {
    return new GuardError(key + ' must be an emitter');
  }

  // stream
  else if (type === 'stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function'
  )) {
    return new GuardError(key + ' must be a stream');
  }

  // read stream
  else if (type === 'read-stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function' ||
    typeof val.read !== 'function'
  )) {
    return new GuardError(key + ' must be a read-stream');
  }

  // write stream
  else if (type === 'write-stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function' ||
    typeof val.write !== 'function' ||
    typeof val.end !== 'function'
  )) {
    return new GuardError(key + ' must be a write-stream');
  }

  // function
  else if (type === 'function' && typeof val !== 'function') {
    return new GuardError(key + ' must be a function');
  }

  // null
  else if (type === 'null' && val !== null) {
    return new GuardError(key + ' must be a null');
  }

  // undefined
  else if (type === 'undefined' && val !== undefined) {
    return new GuardError(key + ' must be a undefined');
  }

  return null;
};

exports._stackOffset = 2;


},{"./guard-error":7}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9rZXktY29tYm8uanMiLCJsaWIva2V5Ym9hcmQuanMiLCJsaWIvbG9jYWxlLmpzIiwibG9jYWxlcy91cy5qcyIsIm5vZGVfbW9kdWxlcy90eXBlLWd1YXJkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLWVycm9yLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4vLyBsaWJzXG52YXIgS2V5Ym9hcmRKUyA9IHJlcXVpcmUoJy4vbGliL2tleWJvYXJkJyk7XG52YXIgTG9jYWxlID0gcmVxdWlyZSgnLi9saWIvbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2xpYi9rZXktY29tYm8nKTtcbnZhciB1c0xvY2FsZSA9IHJlcXVpcmUoJy4vbG9jYWxlcy91cycpO1xuXG52YXIga2V5Ym9hcmRKUyA9IG5ldyBLZXlib2FyZEpTKCk7XG5rZXlib2FyZEpTLnNldExvY2FsZSh1c0xvY2FsZSk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGtleWJvYXJkSlM7XG5leHBvcnRzLktleWJvYXJkSlMgPSBLZXlib2FyZEpTO1xuZXhwb3J0cy5Mb2NhbGUgPSBMb2NhbGU7XG5leHBvcnRzLktleUNvbWJvID0gS2V5Q29tYm87XG4iLCJcbi8vIG1vZHVsZXNcbnZhciBndWFyZCA9IHJlcXVpcmUoJ3R5cGUtZ3VhcmQnKTtcblxuXG5mdW5jdGlvbiBLZXlDb21ibyhrZXlDb21ib1N0cikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsICdzdHJpbmcnKTtcblxuICBzZWxmLnNvdXJjZVN0ciA9IGtleUNvbWJvU3RyO1xuICBzZWxmLnN1YkNvbWJvcyA9IEtleUNvbWJvLnBhcnNlQ29tYm9TdHIoa2V5Q29tYm9TdHIpO1xuICBzZWxmLmtleU5hbWVzID0gc2VsZi5zdWJDb21ib3MucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIG5leHRTdWJDb21ibykge1xuICAgIHJldHVybiBtZW1vLmNvbmNhdChuZXh0U3ViQ29tYm8pO1xuICB9KTtcbn1cblxuS2V5Q29tYm8uc2VxdWVuY2VEZWxpbWluYXRvciA9ICc+Pic7XG5LZXlDb21iby5jb21ib0RlbGltaW5hdG9yID0gJz4nO1xuS2V5Q29tYm8ua2V5RGVsaW1pbmF0b3IgPSAnKyc7XG5cbktleUNvbWJvLnBhcnNlQ29tYm9TdHIgPSBmdW5jdGlvbihrZXlDb21ib1N0cikge1xuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgJ3N0cmluZycpO1xuXG4gIHZhciBzdWJDb21ib1N0cnMgPSBLZXlDb21iby5fc3BsaXRTdHIoa2V5Q29tYm9TdHIsIEtleUNvbWJvLmNvbWJvRGVsaW1pbmF0b3IpO1xuICB2YXIgY29tYm8gPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAgOyBpIDwgc3ViQ29tYm9TdHJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29tYm8ucHVzaChLZXlDb21iby5fc3BsaXRTdHIoc3ViQ29tYm9TdHJzW2ldLCBLZXlDb21iby5rZXlEZWxpbWluYXRvcikpO1xuICB9XG4gIHJldHVybiBjb21ibztcbn07XG5cbktleUNvbWJvLl9zcGxpdFN0ciA9IGZ1bmN0aW9uKHN0ciwgZGVsaW1pbmF0b3IpIHtcbiAgdmFyIHMgPSBzdHI7XG4gIHZhciBkID0gZGVsaW1pbmF0b3I7XG4gIHZhciBjID0gJyc7XG4gIHZhciBjYSA9IFtdO1xuXG4gIGZvciAodmFyIGNpID0gMDsgY2kgPCBzLmxlbmd0aDsgY2kgKz0gMSkge1xuICAgIGlmIChjaSA+IDAgJiYgc1tjaV0gPT09IGQgJiYgc1tjaSAtIDFdICE9PSAnXFxcXCcpIHtcbiAgICAgIGNhLnB1c2goYy50cmltKCkpO1xuICAgICAgYyA9ICcnO1xuICAgICAgY2kgKz0gMTtcbiAgICB9XG4gICAgYyArPSBzW2NpXTtcbiAgfVxuICBpZiAoYykgeyBjYS5wdXNoKGMudHJpbSgpKTsgfVxuXG4gIHJldHVybiBjYTtcbn07XG5cbktleUNvbWJvLnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uKHByZXNzZWRLZXlOYW1lcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ3ByZXNzZWRLZXlOYW1lcycsIHByZXNzZWRLZXlOYW1lcywgJ2FycmF5Jyk7XG5cbiAgdmFyIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gc2VsZi5fY2hlY2tTdWJDb21ibyhcbiAgICAgIHNlbGYuc3ViQ29tYm9zW2ldLFxuICAgICAgc3RhcnRpbmdLZXlOYW1lSW5kZXgsXG4gICAgICBwcmVzc2VkS2V5TmFtZXNcbiAgICApO1xuICAgIGlmIChzdGFydGluZ0tleU5hbWVJbmRleCA9PT0gLTEpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuaXNFcXVhbCA9IGZ1bmN0aW9uKG90aGVyS2V5Q29tYm8pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdvdGhlcktleUNvbWJvJywgb3RoZXJLZXlDb21ibywgWyAnb2JqZWN0JywgJ3N0cmluZycgXSk7XG5cbiAgaWYgKHR5cGVvZiBvdGhlcktleUNvbWJvID09PSAnc3RyaW5nJykge1xuICAgIG90aGVyS2V5Q29tYm8gPSBuZXcgS2V5Q29tYm8ob3RoZXJLZXlDb21ibyk7XG4gIH0gZWxzZSB7XG4gICAgZ3VhcmQoJ290aGVyS2V5Q29tYm8uc3ViQ29tYm9zJywgb3RoZXJLZXlDb21iby5zdWJDb21ib3MsICdhcnJheScpO1xuICB9XG5cbiAgaWYgKHNlbGYuc3ViQ29tYm9zLmxlbmd0aCAhPT0gb3RoZXJLZXlDb21iby5zdWJDb21ib3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5zdWJDb21ib3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoc2VsZi5zdWJDb21ib3NbaV0ubGVuZ3RoICE9PSBvdGhlcktleUNvbWJvLnN1YkNvbWJvc1tpXS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuc3ViQ29tYm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIHN1YkNvbWJvID0gc2VsZi5zdWJDb21ib3NbaV07XG4gICAgdmFyIG90aGVyU3ViQ29tYm8gPSBvdGhlcktleUNvbWJvLnN1YkNvbWJvc1tpXS5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN1YkNvbWJvLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2pdO1xuICAgICAgdmFyIGluZGV4ID0gb3RoZXJTdWJDb21iby5pbmRleE9mKGtleU5hbWUpO1xuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgb3RoZXJTdWJDb21iby5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3RoZXJTdWJDb21iby5sZW5ndGggIT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbktleUNvbWJvLnByb3RvdHlwZS5fY2hlY2tTdWJDb21ibyA9IGZ1bmN0aW9uKFxuICBzdWJDb21ibyxcbiAgc3RhcnRpbmdLZXlOYW1lSW5kZXgsXG4gIHByZXNzZWRLZXlOYW1lc1xuKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgnc3ViQ29tYm8nLCBzdWJDb21ibywgJ2FycmF5Jyk7XG4gIGd1YXJkKCdzdGFydGluZ0tleU5hbWVJbmRleCcsIHN0YXJ0aW5nS2V5TmFtZUluZGV4LCAnbnVtYmVyJyk7XG4gIGd1YXJkKCdwcmVzc2VkS2V5TmFtZXMnLCBwcmVzc2VkS2V5TmFtZXMsICdhcnJheScpO1xuXG4gIHN1YkNvbWJvID0gc3ViQ29tYm8uc2xpY2UoMCk7XG4gIHByZXNzZWRLZXlOYW1lcyA9IHByZXNzZWRLZXlOYW1lcy5zbGljZShzdGFydGluZ0tleU5hbWVJbmRleCk7XG5cbiAgdmFyIGVuZEluZGV4ID0gc3RhcnRpbmdLZXlOYW1lSW5kZXg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3ViQ29tYm8ubGVuZ3RoOyBpICs9IDEpIHtcblxuICAgIHZhciBrZXlOYW1lID0gc3ViQ29tYm9baV07XG4gICAgaWYgKGtleU5hbWVbMF0gPT09ICdcXFxcJykge1xuICAgICAgdmFyIGVzY2FwZWRLZXlOYW1lID0ga2V5TmFtZS5zbGljZSgxKTtcbiAgICAgIGlmIChcbiAgICAgICAgZXNjYXBlZEtleU5hbWUgPT09IEtleUNvbWJvLmNvbWJvRGVsaW1pbmF0b3IgfHxcbiAgICAgICAgZXNjYXBlZEtleU5hbWUgPT09IEtleUNvbWJvLmtleURlbGltaW5hdG9yXG4gICAgICApIHtcbiAgICAgICAga2V5TmFtZSA9IGVzY2FwZWRLZXlOYW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBpbmRleCA9IHByZXNzZWRLZXlOYW1lcy5pbmRleE9mKGtleU5hbWUpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBzdWJDb21iby5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgICBpZiAoaW5kZXggPiBlbmRJbmRleCkge1xuICAgICAgICBlbmRJbmRleCA9IGluZGV4O1xuICAgICAgfVxuICAgICAgaWYgKHN1YkNvbWJvLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZW5kSW5kZXg7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBLZXlDb21ibztcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcblxuLy8gbW9kdWxlc1xudmFyIGd1YXJkID0gcmVxdWlyZSgndHlwZS1ndWFyZCcpO1xuXG4vLyBsaWJzXG52YXIgTG9jYWxlID0gcmVxdWlyZSgnLi9sb2NhbGUnKTtcbnZhciBLZXlDb21ibyA9IHJlcXVpcmUoJy4va2V5LWNvbWJvJyk7XG5cblxuZnVuY3Rpb24gS2V5Ym9hcmRKUyh0YXJnZXRXaW5kb3cpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCd0YXJnZXRXaW5kb3cnLCB0YXJnZXRXaW5kb3csIFsgJ29iamVjdCcsICd1bmRlZmluZWQnIF0pO1xuXG4gIHNlbGYubG9jYWxlID0gbnVsbDtcbiAgc2VsZi5fY3VycmVudENvbnRleHQgPSBudWxsO1xuICBzZWxmLl9jb250ZXh0cyA9IHt9O1xuICBzZWxmLl9saXN0ZW5lcnMgPSBbXTtcbiAgc2VsZi5fYXBwbGllZExpc3RlbmVycyA9IFtdO1xuICBzZWxmLl9sb2NhbGVzID0ge307XG4gIHNlbGYuX3RhcmdldERvY3VtZW50ID0gbnVsbDtcbiAgc2VsZi5fdGFyZ2V0V2luZG93ID0gbnVsbDtcblxuICBzZWxmLnNldENvbnRleHQoJ2RlZmF1bHQnKTtcbiAgc2VsZi53YXRjaCgpO1xufVxuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5zZXRMb2NhbGUgPSBmdW5jdGlvbihsb2NhbGVOYW1lLCBsb2NhbGVCdWlsZGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgbG9jYWxlID0gbnVsbDtcbiAgaWYgKHR5cGVvZiBsb2NhbGVOYW1lID09PSAnc3RyaW5nJykge1xuXG4gICAgZ3VhcmQoJ2xvY2FsZU5hbWUnLCBsb2NhbGVOYW1lLCBbICdzdHJpbmcnLCAnbnVsbCcgXSk7XG4gICAgZ3VhcmQoJ2xvY2FsZUJ1aWxkZXInLCBsb2NhbGVCdWlsZGVyLCBbICdmdW5jdGlvbicsICd1bmRlZmluZWQnIF0pO1xuXG4gICAgaWYgKGxvY2FsZUJ1aWxkZXIpIHtcbiAgICAgIGxvY2FsZSA9IG5ldyBMb2NhbGUobG9jYWxlTmFtZSk7XG4gICAgICBsb2NhbGVCdWlsZGVyKGxvY2FsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvY2FsZSA9IHNlbGYuX2xvY2FsZXNbbG9jYWxlTmFtZV0gfHwgbnVsbDtcbiAgICB9XG4gIH0gZWxzZSB7XG5cbiAgICBndWFyZCgnbG9jYWxlJywgbG9jYWxlTmFtZSwgJ29iamVjdCcpO1xuICAgIGd1YXJkKCdsb2NhbGUubG9jYWxlTmFtZScsIGxvY2FsZU5hbWUubG9jYWxlTmFtZSwgJ3N0cmluZycpO1xuICAgIGd1YXJkKCdsb2NhbGUucHJlc3NLZXknLCBsb2NhbGVOYW1lLnByZXNzS2V5LCAnZnVuY3Rpb24nKTtcbiAgICBndWFyZCgnbG9jYWxlLnJlbGVhc2VLZXknLCBsb2NhbGVOYW1lLnJlbGVhc2VLZXksICdmdW5jdGlvbicpO1xuICAgIGd1YXJkKCdsb2NhbGUucHJlc3NlZEtleXMnLCBsb2NhbGVOYW1lLnByZXNzZWRLZXlzLCAnYXJyYXknKTtcblxuICAgIGxvY2FsZSA9IGxvY2FsZU5hbWU7XG4gICAgbG9jYWxlTmFtZSA9IGxvY2FsZS5sb2NhbGVOYW1lO1xuICB9XG5cbiAgc2VsZi5sb2NhbGUgPSBsb2NhbGU7XG4gIHNlbGYuX2xvY2FsZXNbbG9jYWxlTmFtZV0gPSBsb2NhbGU7XG4gIGlmIChsb2NhbGUpIHtcbiAgICBzZWxmLmxvY2FsZS5wcmVzc2VkS2V5cyA9IGxvY2FsZS5wcmVzc2VkS2V5cztcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuZ2V0TG9jYWxlID0gZnVuY3Rpb24obG9jYWxOYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgbG9jYWxOYW1lIHx8IChsb2NhbE5hbWUgPSBzZWxmLmxvY2FsZS5sb2NhbGVOYW1lKTtcbiAgcmV0dXJuIHNlbGYuX2xvY2FsZXNbbG9jYWxOYW1lXSB8fCBudWxsO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgWyAnc3RyaW5nJywgJ2FycmF5JyBdKTtcbiAgZ3VhcmQoJ3ByZXNzSGFuZGxlcicsIHByZXNzSGFuZGxlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJywgJ251bGwnIF0pO1xuICBndWFyZCgncmVsZWFzZUhhbmRsZXInLCByZWxlYXNlSGFuZGxlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJywgJ251bGwnIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29tYm9TdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgc2VsZi5fbGlzdGVuZXJzLnB1c2goe1xuICAgICAga2V5Q29tYm86IG5ldyBLZXlDb21ibyhrZXlDb21ib1N0ciksXG4gICAgICBwcmVzc0hhbmRsZXI6IHByZXNzSGFuZGxlciB8fCBudWxsLFxuICAgICAgcmVsZWFzZUhhbmRsZXI6IHJlbGVhc2VIYW5kbGVyIHx8IG51bGwsXG4gICAgICBwcmV2ZW50UmVwZWF0OiBmYWxzZVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29tYm9TdHIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYuYmluZChrZXlDb21ib1N0cltpXSwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcik7XG4gICAgfVxuICB9XG59O1xuS2V5Ym9hcmRKUy5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBLZXlib2FyZEpTLnByb3RvdHlwZS5iaW5kO1xuS2V5Ym9hcmRKUy5wcm90b3R5cGUub24gPSBLZXlib2FyZEpTLnByb3RvdHlwZS5iaW5kO1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbihrZXlDb21ib1N0ciwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsIFsgJ3N0cmluZycsICdhcnJheScgXSk7XG4gIGd1YXJkKCdwcmVzc0hhbmRsZXInLCBwcmVzc0hhbmRsZXIsIFsgJ2Z1bmN0aW9uJywgJ3VuZGVmaW5lZCcgXSk7XG4gIGd1YXJkKCdyZWxlYXNlSGFuZGxlcicsIHJlbGVhc2VIYW5kbGVyLCBbICdmdW5jdGlvbicsICd1bmRlZmluZWQnIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29tYm9TdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLl9saXN0ZW5lcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBsaXN0ZW5lciA9IHNlbGYuX2xpc3RlbmVyc1tpXTtcblxuICAgICAgdmFyIGNvbWJvTWF0Y2hlcyA9IGxpc3RlbmVyLmtleUNvbWJvLmlzRXF1YWwoa2V5Q29tYm9TdHIpO1xuICAgICAgdmFyIHByZXNzSGFuZGxlck1hdGNoZXMgPSAhcHJlc3NIYW5kbGVyIHx8XG4gICAgICAgIHByZXNzSGFuZGxlciA9PT0gbGlzdGVuZXIucHJlc3NIYW5kbGVyO1xuICAgICAgdmFyIHJlbGVhc2VIYW5kbGVyTWF0Y2hlcyA9IGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyID09PSBudWxsIHx8XG4gICAgICAgIHJlbGVhc2VIYW5kbGVyID09PSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcjtcblxuICAgICAgaWYgKGNvbWJvTWF0Y2hlcyAmJiBwcmVzc0hhbmRsZXJNYXRjaGVzICYmIHJlbGVhc2VIYW5kbGVyTWF0Y2hlcykge1xuICAgICAgICBzZWxmLl9saXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICBpIC09IDE7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29tYm9TdHIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYuYmluZChrZXlDb21ib1N0cltpXSwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcik7XG4gICAgfVxuICB9XG59O1xuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBLZXlib2FyZEpTLnByb3RvdHlwZS51bmJpbmQ7XG5LZXlib2FyZEpTLnByb3RvdHlwZS5vZmYgPSBLZXlib2FyZEpTLnByb3RvdHlwZS51bmJpbmQ7XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnNldENvbnRleHQgPSBmdW5jdGlvbihjb250ZXh0TmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGd1YXJkKCdjb250ZXh0TmFtZScsIGNvbnRleHROYW1lLCAnc3RyaW5nJyk7XG4gIGlmIChzZWxmLmxvY2FsZSkge1xuICAgIHNlbGYucmVsZWFzZUFsbEtleXMoKTtcbiAgfVxuICBpZiAoIXNlbGYuX2NvbnRleHRzW2NvbnRleHROYW1lXSkge1xuICAgIHNlbGYuX2NvbnRleHRzW2NvbnRleHROYW1lXSA9IFtdO1xuICB9XG4gIHNlbGYuX2xpc3RlbmVycyA9IHNlbGYuX2NvbnRleHRzW2NvbnRleHROYW1lXTtcbiAgc2VsZi5fY3VycmVudENvbnRleHQgPSBjb250ZXh0TmFtZTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gc2VsZi5fY3VycmVudENvbnRleHQ7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKHRhcmdldERvY3VtZW50LCB0YXJnZXRXaW5kb3cpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCd0YXJnZXREb2N1bWVudCcsIHRhcmdldERvY3VtZW50LCBbICdvYmplY3QnLCAndW5kZWZpbmVkJyBdKTtcbiAgZ3VhcmQoJ3RhcmdldFdpbmRvdycsIHRhcmdldFdpbmRvdywgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG5cbiAgc2VsZi5zdG9wKCk7XG5cbiAgaWYgKHRhcmdldERvY3VtZW50ICYmIHRhcmdldERvY3VtZW50LmRvY3VtZW50ICYmICF0YXJnZXRXaW5kb3cpIHtcbiAgICB0YXJnZXRXaW5kb3cgPSB0YXJnZXREb2N1bWVudDtcbiAgICB0YXJnZXREb2N1bWVudCA9IG51bGw7XG4gIH1cbiAgaWYgKCF0YXJnZXRXaW5kb3cpIHtcbiAgICB0YXJnZXRXaW5kb3cgPSBnbG9iYWwud2luZG93O1xuICB9XG4gIGlmICh0YXJnZXRXaW5kb3cgJiYgIXRhcmdldERvY3VtZW50KSB7XG4gICAgdGFyZ2V0RG9jdW1lbnQgPSB0YXJnZXRXaW5kb3cuZG9jdW1lbnQ7XG4gIH1cblxuICBpZiAodGFyZ2V0RG9jdW1lbnQgJiYgdGFyZ2V0V2luZG93KSB7XG4gICAgc2VsZi5faXNNb2Rlcm5Ccm93c2VyID0gISF0YXJnZXRXaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcjtcblxuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXREb2N1bWVudCwgJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5wcmVzc0tleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fYmluZEV2ZW50KHRhcmdldERvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAnZm9jdXMnLCBzZWxmLnJlbGVhc2VBbGxLZXlzLmJpbmQoc2VsZikpO1xuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXRXaW5kb3csICdibHVyJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcblxuICAgIHNlbGYuX3RhcmdldERvY3VtZW50ID0gdGFyZ2V0RG9jdW1lbnQ7XG4gICAgc2VsZi5fdGFyZ2V0V2luZG93ID0gdGFyZ2V0V2luZG93O1xuICB9XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuX3RhcmdldERvY3VtZW50KSB7XG4gICAgc2VsZi5fdW5iaW5kRXZlbnQoc2VsZi5fdGFyZ2V0RG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoZXZlbnQua2V5Q29kZSwgZXZlbnQpO1xuICAgIH0pO1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldERvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl90YXJnZXREb2N1bWVudCA9IG51bGw7XG4gIH1cbiAgaWYgKHNlbGYuX3RhcmdldFdpbmRvdykge1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldFdpbmRvdywgJ2ZvY3VzJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXRXaW5kb3csICdibHVyJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl90YXJnZXRXaW5kb3cgPSBudWxsO1xuICB9XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5wcmVzc0tleSA9IGZ1bmN0aW9uKGtleUNvZGUsIGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsIFsgJ251bWJlcicsICdzdHJpbmcnIF0pO1xuICBndWFyZCgnZXZlbnQnLCBldmVudCwgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG5cbiAgc2VsZi5sb2NhbGUucHJlc3NLZXkoa2V5Q29kZSk7XG4gIHNlbGYuX2FwcGx5QmluZGluZ3MoZXZlbnQpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVsZWFzZUtleSA9IGZ1bmN0aW9uKGtleUNvZGUsIGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsIFsgJ251bWJlcicsICdzdHJpbmcnIF0pO1xuICBndWFyZCgnZXZlbnQnLCBldmVudCwgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG5cbiAgc2VsZi5sb2NhbGUucmVsZWFzZUtleShrZXlDb2RlKTtcbiAgc2VsZi5fY2xlYXJCaW5kaW5ncyhldmVudCk7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZWxlYXNlQWxsS2V5cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYubG9jYWxlLnByZXNzZWRLZXlzLmxlbmd0aCA9IDA7XG4gIHNlbGYuX2NsZWFyQmluZGluZ3MoKTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5yZWxlYXNlQWxsS2V5cygpO1xuICBzZWxmLl9saXN0ZW5lcnMubGVuZ3RoID0gMDtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl9iaW5kRXZlbnQgPSBmdW5jdGlvbih0YXJnZXRFbGVtZW50LCBldmVudE5hbWUsIGhhbmRsZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gc2VsZi5faXNNb2Rlcm5Ccm93c2VyID9cbiAgICB0YXJnZXRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBoYW5kbGVyLCBmYWxzZSkgOlxuICAgIHRhcmdldEVsZW1lbnQuYXR0YWNoRXZlbnQoJ29uJyArIGV2ZW50TmFtZSwgaGFuZGxlcik7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5fdW5iaW5kRXZlbnQgPSBmdW5jdGlvbih0YXJnZXRFbGVtZW50LCBldmVudE5hbWUsIGhhbmRsZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gc2VsZi5faXNNb2Rlcm5Ccm93c2VyID9cbiAgICB0YXJnZXRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBoYW5kbGVyLCBmYWxzZSk6XG4gICAgdGFyZ2V0RWxlbWVudC5kZXRhY2hFdmVudCgnb24nICsgZXZlbnROYW1lLCBoYW5kbGVyKTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl9hcHBseUJpbmRpbmdzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGV2ZW50IHx8IChldmVudCA9IHt9KTtcbiAgdmFyIHByZXZlbnRSZXBlYXQgPSBmYWxzZTtcbiAgZXZlbnQucHJldmVudFJlcGVhdCA9IGZ1bmN0aW9uKCkgeyBwcmV2ZW50UmVwZWF0ID0gdHJ1ZTsgfTtcblxuICB2YXIgcHJlc3NlZEtleXMgPSBzZWxmLmxvY2FsZS5wcmVzc2VkS2V5cy5zbGljZSgwKTtcbiAgdmFyIGxpc3RlbmVycyA9IHNlbGYuX2xpc3RlbmVycy5zbGljZSgwKS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYS5rZXlDb21iby5rZXlOYW1lcy5sZW5ndGggPiBiLmtleUNvbWJvLmtleU5hbWVzLmxlbmd0aDtcbiAgfSk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBsaXN0ZW5lcnNbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbGlzdGVuZXIua2V5Q29tYm87XG4gICAgdmFyIGhhbmRsZXIgPSBsaXN0ZW5lci5wcmVzc0hhbmRsZXI7XG5cbiAgICBpZiAoa2V5Q29tYm8uY2hlY2socHJlc3NlZEtleXMpICYmICFsaXN0ZW5lci5wcmV2ZW50UmVwZWF0KSB7XG5cbiAgICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIuY2FsbChzZWxmLCBldmVudCk7XG4gICAgICAgIGlmIChwcmV2ZW50UmVwZWF0KSB7XG4gICAgICAgICAgbGlzdGVuZXIucHJldmVudFJlcGVhdCA9IHByZXZlbnRSZXBlYXQ7XG4gICAgICAgICAgcHJldmVudFJlcGVhdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcHJlc3NlZEtleXMuaW5kZXhPZihrZXlDb21iby5rZXlOYW1lc1tqXSk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICBwcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgIGogLT0gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobGlzdGVuZXIucmVsZWFzZUhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcikgPT09IC0xKSB7XG4gICAgICAgICAgc2VsZi5fYXBwbGllZExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2NsZWFyQmluZGluZ3MgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZXZlbnQgfHwgKGV2ZW50ID0ge30pO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fYXBwbGllZExpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBsaXN0ZW5lciA9IHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnNbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbGlzdGVuZXIua2V5Q29tYm87XG4gICAgdmFyIGhhbmRsZXIgPSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcjtcbiAgICBpZiAoIWtleUNvbWJvLmNoZWNrKHNlbGYubG9jYWxlLnByZXNzZWRLZXlzKSkge1xuICAgICAgbGlzdGVuZXIucHJldmVudFJlcGVhdCA9IGZhbHNlO1xuICAgICAgaGFuZGxlci5jYWxsKHNlbGYsIGV2ZW50KTtcbiAgICAgIHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlib2FyZEpTO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcbi8vIG1vZHVsZXNcbnZhciBndWFyZCA9IHJlcXVpcmUoJ3R5cGUtZ3VhcmQnKTtcblxuLy8gbGlic1xudmFyIEtleUNvbWJvID0gcmVxdWlyZSgnLi9rZXktY29tYm8nKTtcblxuXG5mdW5jdGlvbiBMb2NhbGUobmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ25hbWUnLCBuYW1lLCAnc3RyaW5nJyk7XG5cbiAgc2VsZi5sb2NhbGVOYW1lID0gbmFtZTtcbiAgc2VsZi5wcmVzc2VkS2V5cyA9IFtdO1xuICBzZWxmLl9hcHBsaWVkTWFjcm9zID0gW107XG4gIHNlbGYuX2tleU1hcCA9IHt9O1xuICBzZWxmLl9tYWNyb3MgPSBbXTtcbn1cblxuTG9jYWxlLnByb3RvdHlwZS5iaW5kS2V5Q29kZSA9IGZ1bmN0aW9uKGtleUNvZGUsIGtleU5hbWVzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsICdudW1iZXInKTtcbiAgZ3VhcmQoJ2tleU5hbWVzJywga2V5TmFtZXMsIFsgJ2FycmF5JywgJ3N0cmluZycgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICBrZXlOYW1lcyA9IFtrZXlOYW1lc107XG4gIH1cblxuICBzZWxmLl9rZXlNYXBba2V5Q29kZV0gPSBrZXlOYW1lcztcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuYmluZE1hY3JvID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIsIGtleU5hbWVzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgJ3N0cmluZycpO1xuICBndWFyZCgna2V5TmFtZXMnLCBrZXlOYW1lcywgWyAnZnVuY3Rpb24nLCAnc3RyaW5nJywgJ2FycmF5JyBdKTtcblxuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnc3RyaW5nJykge1xuICAgIGtleU5hbWVzID0gWyBrZXlOYW1lcyBdO1xuICB9XG5cbiAgdmFyIG1hY3JvID0ge1xuICAgIGtleUNvbWJvOiBuZXcgS2V5Q29tYm8oa2V5Q29tYm9TdHIpLFxuICAgIGtleU5hbWVzOiBudWxsLFxuICAgIGhhbmRsZXI6IG51bGxcbiAgfTtcblxuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgbWFjcm8uaGFuZGxlciA9IGtleU5hbWVzO1xuICB9IGVsc2Uge1xuICAgIG1hY3JvLmtleU5hbWVzID0ga2V5TmFtZXM7XG4gIH1cblxuICBzZWxmLl9tYWNyb3MucHVzaChtYWNybyk7XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLmdldEtleUNvZGVzID0gZnVuY3Rpb24oa2V5TmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleU5hbWUnLCBrZXlOYW1lLCAnc3RyaW5nJyk7XG5cbiAgdmFyIGtleUNvZGVzID0gW107XG4gIGZvciAodmFyIGtleUNvZGUgaW4gc2VsZi5fa2V5TWFwKSB7XG4gICAgdmFyIGluZGV4ID0gc2VsZi5fa2V5TWFwW2tleUNvZGVdLmluZGV4T2Yoa2V5TmFtZSk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHsga2V5Q29kZXMucHVzaChrZXlDb2RlfDApOyB9XG4gIH1cbiAgcmV0dXJuIGtleUNvZGVzO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5nZXRLZXlOYW1lcyA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgJ251bWJlcicpO1xuXG4gIHJldHVybiBzZWxmLl9rZXlNYXBba2V5Q29kZV0gfHwgW107XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLnByZXNzS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvZGUnLCBrZXlDb2RlLCBbICdudW1iZXInLCAnc3RyaW5nJyBdKTtcblxuICBpZiAodHlwZW9mIGtleUNvZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIGtleUNvZGVzID0gc2VsZi5nZXRLZXlDb2RlcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBzZWxmLnByZXNzS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB2YXIga2V5TmFtZXMgPSBzZWxmLmdldEtleU5hbWVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5TmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmIChzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbaV0pID09PSAtMSkge1xuICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnB1c2goa2V5TmFtZXNbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGYuX2FwcGx5TWFjcm9zKCk7XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUucmVsZWFzZUtleSA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgWyAnbnVtYmVyJywgJ3N0cmluZycgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlDb2RlID09PSAnc3RyaW5nJykge1xuICAgIHZhciBrZXlDb2RlcyA9IHNlbGYuZ2V0S2V5Q29kZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB2YXIga2V5TmFtZXMgPSBzZWxmLmdldEtleU5hbWVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5TmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBpbmRleCA9IHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tpXSk7XG4gICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZi5fY2xlYXJNYWNyb3MoKTtcbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5fYXBwbHlNYWNyb3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBtYWNyb3MgPSBzZWxmLl9tYWNyb3Muc2xpY2UoMCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbWFjcm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIG1hY3JvID0gbWFjcm9zW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IG1hY3JvLmtleUNvbWJvO1xuICAgIHZhciBrZXlOYW1lcyA9IG1hY3JvLmtleU5hbWVzO1xuICAgIGlmIChrZXlDb21iby5jaGVjayhzZWxmLnByZXNzZWRLZXlzKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICBpZiAoc2VsZi5wcmVzc2VkS2V5cy5pbmRleE9mKGtleU5hbWVzW2pdKSA9PT0gLTEpIHtcbiAgICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnB1c2goa2V5TmFtZXNbal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWxmLl9hcHBsaWVkTWFjcm9zLnB1c2gobWFjcm8pO1xuICAgIH1cbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5fY2xlYXJNYWNyb3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fYXBwbGllZE1hY3Jvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBtYWNybyA9IHNlbGYuX2FwcGxpZWRNYWNyb3NbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbWFjcm8ua2V5Q29tYm87XG4gICAgdmFyIGtleU5hbWVzID0gbWFjcm8ua2V5TmFtZXM7XG4gICAgaWYgKCFrZXlDb21iby5jaGVjayhzZWxmLnByZXNzZWRLZXlzKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICB2YXIgaW5kZXggPSBzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbal0pO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgIHNlbGYucHJlc3NlZEtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZi5fYXBwbGllZE1hY3Jvcy5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgfVxuICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlO1xuIiwiXG4vLyBtb2R1bGVzXG52YXIgTG9jYWxlID0gcmVxdWlyZSgnLi4vbGliL2xvY2FsZScpO1xuXG5cbi8vIGNyZWF0ZSB0aGUgbG9jYWxlXG52YXIgbG9jYWxlID0gbmV3IExvY2FsZSgndXMnKTtcblxuLy8gZ2VuZXJhbFxubG9jYWxlLmJpbmRLZXlDb2RlKDMsIFsgJ2NhbmNlbCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOCwgWyAnYmFja3NwYWNlJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5LCBbICd0YWInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyLCBbICdjbGVhcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTMsIFsgJ2VudGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNiwgWyAnc2hpZnQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE3LCBbICdjdHJsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOCwgWyAnYWx0JywgJ21lbnUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5LCBbICdwYXVzZScsICdicmVhaycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjAsIFsgJ2NhcHNsb2NrJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyNywgWyAnZXNjYXBlJywgJ2VzYycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzIsIFsgJ3NwYWNlJywgJ3NwYWNlYmFyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzMywgWyAncGFnZXVwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNCwgWyAncGFnZWRvd24nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM1LCBbICdlbmQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM2LCBbICdob21lJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNywgWyAnbGVmdCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzgsIFsgJ3VwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzOSwgWyAncmlnaHQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQwLCBbICdkb3duJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MSwgWyAnc2VsZWN0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MiwgWyAncHJpbnRzY3JlZW4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQzLCBbICdleGVjdXRlJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NCwgWyAnc25hcHNob3QnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ1LCBbICdpbnNlcnQnLCAnaW5zJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NiwgWyAnZGVsZXRlJywgJ2RlbCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDcsIFsgJ2hlbHAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDkxLCBbICdjb21tYW5kJywgJ3dpbmRvd3MnLCAnd2luJywgJ3N1cGVyJywgJ2xlZnRjb21tYW5kJywgJ2xlZnR3aW5kb3dzJywgJ2xlZnR3aW4nLCAnbGVmdHN1cGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5MiwgWyAnY29tbWFuZCcsICd3aW5kb3dzJywgJ3dpbicsICdzdXBlcicsICdyaWdodGNvbW1hbmQnLCAncmlnaHR3aW5kb3dzJywgJ3JpZ2h0d2luJywgJ3JpZ2h0c3VwZXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE0NSwgWyAnc2Nyb2xsbG9jaycsICdzY3JvbGwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4NiwgWyAnc2VtaWNvbG9uJywgJzsnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4NywgWyAnZXF1YWwnLCAnZXF1YWxzaWduJywgJz0nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4OCwgWyAnY29tbWEnLCAnLCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTg5LCBbICdkYXNoJywgJy0nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MCwgWyAncGVyaW9kJywgJy4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MSwgWyAnc2xhc2gnLCAnZm9yd2FyZHNsYXNoJywgJy8nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MiwgWyAnZ3JhdmVhY2NlbnQnLCAnYCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjE5LCBbICdvcGVuYnJhY2tldCcsICdbJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjAsIFsgJ2JhY2tzbGFzaCcsICdcXFxcJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjEsIFsgJ2Nsb3NlYnJhY2tldCcsICddJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjIsIFsgJ2Fwb3N0cm9waGUnLCAnXFwnJyBdKTtcblxuLy8gMC05XG5sb2NhbGUuYmluZEtleUNvZGUoNDgsIFsgJ3plcm8nLCAnMCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDksIFsgJ29uZScsICcxJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MCwgWyAndHdvJywgJzInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDUxLCBbICd0aHJlZScsICczJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MiwgWyAnZm91cicsICc0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MywgWyAnZml2ZScsICc1JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NCwgWyAnc2l4JywgJzYnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDU1LCBbICdzZXZlbicsICc3JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NiwgWyAnZWlnaHQnLCAnOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTcsIFsgJ25pbmUnLCAnOScgXSk7XG5cbi8vIG51bXBhZFxubG9jYWxlLmJpbmRLZXlDb2RlKDk2LCBbICdudW16ZXJvJywgJ251bTAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDk3LCBbICdudW1vbmUnLCAnbnVtMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTgsIFsgJ251bXR3bycsICdudW0yJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5OSwgWyAnbnVtdGhyZWUnLCAnbnVtMycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAwLCBbICdudW1mb3VyJywgJ251bTQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwMSwgWyAnbnVtZml2ZScsICdudW01JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDIsIFsgJ251bXNpeCcsICdudW02JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDMsIFsgJ251bXNldmVuJywgJ251bTcnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNCwgWyAnbnVtZWlnaHQnLCAnbnVtOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA1LCBbICdudW1uaW5lJywgJ251bTknIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNiwgWyAnbnVtbXVsdGlwbHknLCAnbnVtKicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA3LCBbICdudW1hZGQnLCAnbnVtKycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA4LCBbICdudW1lbnRlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA5LCBbICdudW1zdWJ0cmFjdCcsICdudW0tJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTAsIFsgJ251bWRlY2ltYWwnLCAnbnVtLicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTExLCBbICdudW1kaXZpZGUnLCAnbnVtLycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTQ0LCBbICdudW1sb2NrJywgJ251bScgXSk7XG5cbi8vIGZ1bmN0aW9uIGtleXNcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTIsIFsgJ2YxJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTMsIFsgJ2YyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTQsIFsgJ2YzJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTUsIFsgJ2Y0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTYsIFsgJ2Y1JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTcsIFsgJ2Y2JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTgsIFsgJ2Y3JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTksIFsgJ2Y4JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjAsIFsgJ2Y5JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjEsIFsgJ2YxMCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIyLCBbICdmMTEnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyMywgWyAnZjEyJyBdKTtcblxuLy8gc2Vjb25kYXJ5IGtleSBzeW1ib2xzXG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIGAnLCBbICd0aWxkZScsICd+JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMScsIFsgJ2V4Y2xhbWF0aW9uJywgJ2V4Y2xhbWF0aW9ucG9pbnQnLCAnIScgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDInLCBbICdhdCcsICdAJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMycsIFsgJ251bWJlcicsICcjJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNCcsIFsgJ2RvbGxhcicsICdkb2xsYXJzJywgJ2RvbGxhcnNpZ24nLCAnJCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDUnLCBbICdwZXJjZW50JywgJyUnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA2JywgWyAnY2FyZXQnLCAnXicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDcnLCBbICdhbXBlcnNhbmQnLCAnYW5kJywgJyYnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA4JywgWyAnYXN0ZXJpc2snLCAnKicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDknLCBbICdvcGVucGFyZW4nLCAnKCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDAnLCBbICdjbG9zZXBhcmVuJywgJyknIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAtJywgWyAndW5kZXJzY29yZScsICdfJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgPScsIFsgJ3BsdXMnLCAnKycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIFsnLCBbICdvcGVuY3VybHlicmFjZScsICdvcGVuY3VybHlicmFja2V0JywgJ3snIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBdJywgWyAnY2xvc2VjdXJseWJyYWNlJywgJ2Nsb3NlY3VybHlicmFja2V0JywgJ30nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBcXFxcJywgWyAndmVydGljYWxiYXInLCAnfCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDsnLCBbICdjb2xvbicsICc6JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXFwnJywgWyAncXVvdGF0aW9ubWFyaycsICdcXCcnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAhLCcsIFsgJ29wZW5hbmdsZWJyYWNrZXQnLCAnPCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIC4nLCBbICdjbG9zZWFuZ2xlYnJhY2tldCcsICc+JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgLycsIFsgJ3F1ZXN0aW9ubWFyaycsICc/JyBdKTtcblxuLy9hLXogYW5kIEEtWlxuZm9yICh2YXIga2V5Q29kZSA9IDY1OyBrZXlDb2RlIDw9IDkwOyBrZXlDb2RlICs9IDEpIHtcbiAgdmFyIGtleU5hbWUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUgKyAzMik7XG4gIHZhciBjYXBpdGFsS2V5TmFtZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSk7XG5cdGxvY2FsZS5iaW5kS2V5Q29kZShrZXlDb2RlLCBrZXlOYW1lKTtcblx0bG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAnICsga2V5TmFtZSwgY2FwaXRhbEtleU5hbWUpO1xuXHRsb2NhbGUuYmluZE1hY3JvKCdjYXBzbG9jayArICcgKyBrZXlOYW1lLCBjYXBpdGFsS2V5TmFtZSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBsb2NhbGU7XG4iLCJcblxuLy8gbGlic1xudmFyIEd1YXJkRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9ndWFyZC1lcnJvcicpO1xudmFyIGd1YXJkID0gcmVxdWlyZSgnLi9saWIvZ3VhcmQnKTtcblxuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggICAgKSB7XG4gIHJldHVybiBndWFyZC5jaGVjay5hcHBseShndWFyZCwgYXJndW1lbnRzKTtcbn07XG5leHBvcnRzLkd1YXJkRXJyb3IgPSBHdWFyZEVycm9yO1xuZXhwb3J0cy5ndWFyZCA9IGd1YXJkO1xuZXhwb3J0cy50eXBlcyA9IGd1YXJkLnR5cGVzO1xuIiwiXG4vLyBtb2R1bGVzXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5cbmZ1bmN0aW9uIEd1YXJkRXJyb3IobWVzc2FnZSwgZmlsZU5hbWUsIGxpbmVOdW1iZXIpIHtcbiAgRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlLCBmaWxlTmFtZSwgbGluZU51bWJlcik7XG5cbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICBpZiAoZmlsZU5hbWUpIHsgdGhpcy5maWxlTmFtZSA9IGZpbGVOYW1lOyB9XG4gIGlmIChsaW5lTnVtYmVyKSB7IHRoaXMubGluZU51bWJlciA9IGxpbmVOdW1iZXI7IH1cblxuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5fc2V0U3RhY2tPZmZzZXQoMSk7XG59XG5pbmhlcml0cyhHdWFyZEVycm9yLCBFcnJvcik7XG5cbkd1YXJkRXJyb3IucHJvdG90eXBlLl9zZXRTdGFja09mZnNldCA9IGZ1bmN0aW9uKHN0YWNrT2Zmc2V0KSB7XG4gIHRyeSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH0gY2F0Y2goZHVtbXlFcnIpIHtcbiAgICB2YXIgZmlyc3RMaW5lID0gdGhpcy5zdGFjay5zcGxpdCgnXFxuJylbMF07XG4gICAgdmFyIGxpbmVzID0gZHVtbXlFcnIuc3RhY2suc3BsaXQoJ1xcbicpO1xuICAgIHZhciBsaW5lID0gbGluZXNbc3RhY2tPZmZzZXQgKyAyXTtcbiAgICB2YXIgbGluZUNodW5rcyA9IGxpbmUubWF0Y2goL1xcKChbXlxcKV0rKVxcKS8pWzFdLnNwbGl0KCc6Jyk7XG4gICAgdGhpcy5zdGFjayA9IFtmaXJzdExpbmVdLmNvbmNhdChsaW5lcy5zbGljZShzdGFja09mZnNldCArIDIpKS5qb2luKCdcXG4nKTtcbiAgICB0aGlzLmZpbGVOYW1lID0gbGluZUNodW5rc1swXTtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lQ2h1bmtzWzFdO1xuICAgIHRoaXMuY29sdW1uTnVtYmVyID0gbGluZUNodW5rc1syXTtcbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEd1YXJkRXJyb3I7XG4iLCJcbi8vIGxpYnNcbnZhciBHdWFyZEVycm9yID0gcmVxdWlyZSgnLi9ndWFyZC1lcnJvcicpO1xuXG5cbmV4cG9ydHMudHlwZXMgPSBbXG4gICdvYmplY3QnLFxuICAnc3RyaW5nJyxcbiAgJ2Jvb2xlYW4nLFxuICAnbnVtYmVyJyxcbiAgJ2FycmF5JyxcbiAgJ3JlZ2V4cCcsXG4gICdkYXRlJyxcbiAgJ3N0cmVhbScsXG4gICdyZWFkLXN0cmVhbScsXG4gICd3cml0ZS1zdHJlYW0nLFxuICAnZW1pdHRlcicsXG4gICdmdW5jdGlvbicsXG4gICdudWxsJyxcbiAgJ3VuZGVmaW5lZCdcbl07XG5cbmV4cG9ydHMuY2hlY2sgPSBmdW5jdGlvbihrZXksIHZhbCwgdHlwZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigna2V5IG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgfVxuICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnICYmIChcbiAgICB0eXBlID09PSBudWxsIHx8XG4gICAgdHlwZW9mIHR5cGUgIT09ICdvYmplY3QnIHx8XG4gICAgdHlwZW9mIHR5cGUubGVuZ3RoICE9PSAnbnVtYmVyJ1xuICApKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndHlwZSBtdXN0IGJlIGEgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICB2YXIgdHlwZUVyciA9IHNlbGYuX3ZhbGlkYXRlVHlwZSh0eXBlKTtcbiAgaWYgKHR5cGVFcnIpIHtcbiAgICB0eXBlRXJyLl9zZXRTdGFja09mZnNldChzZWxmLl9zdGFja09mZnNldCk7XG4gICAgdGhyb3cgdHlwZUVycjtcbiAgfVxuXG4gIHZhciB2YWxFcnIgPSBzZWxmLl92YWxpZGF0ZVZhbChrZXksIHR5cGUsIHZhbCk7XG4gIGlmICh2YWxFcnIpIHtcbiAgICB2YWxFcnIuX3NldFN0YWNrT2Zmc2V0KHNlbGYuX3N0YWNrT2Zmc2V0KTtcbiAgICB0aHJvdyB2YWxFcnI7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbmV4cG9ydHMuX3ZhbGlkYXRlVHlwZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChcbiAgICB0eXBlICE9PSBudWxsICYmXG4gICAgdHlwZW9mIHR5cGUgPT09ICdvYmplY3QnICYmXG4gICAgdHlwZW9mIHR5cGUubGVuZ3RoID09PSAnbnVtYmVyJ1xuICApIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBlcnIgPSBzZWxmLl92YWxpZGF0ZVR5cGUodHlwZVtpXSk7XG4gICAgICBpZiAoZXJyKSB7IHJldHVybiBlcnI7IH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHNlbGYudHlwZXMuaW5kZXhPZih0eXBlKSA9PT0gLTEpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3IoXG4gICAgICAndHlwZSBtdXN0IGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nIHZhbHVlczogJyArIHNlbGYudHlwZXMuam9pbignLCAnKVxuICAgICk7XG4gIH1cbn07XG5cbi8vIHZhbGlkYXRlcyB0aGUgdmFsdWUgYWdhaW5zdCB0aGUgdHlwZVxuZXhwb3J0cy5fdmFsaWRhdGVWYWwgPSBmdW5jdGlvbihrZXksIHR5cGUsIHZhbCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gcmVjdXJzaXZlXG4gIGlmIChcbiAgICB0eXBlICE9PSBudWxsICYmXG4gICAgdHlwZW9mIHR5cGUgPT09ICdvYmplY3QnICYmXG4gICAgdHlwZW9mIHR5cGUubGVuZ3RoID09PSAnbnVtYmVyJ1xuICApIHtcbiAgICB2YXIgb2sgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmICghc2VsZi5fdmFsaWRhdGVWYWwoa2V5LCB0eXBlW2ldLCB2YWwpKSB7XG4gICAgICAgIG9rID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvaykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihcbiAgICAgICAga2V5ICsgJyBtdXN0IGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nIHR5cGVzOiAnICsgdHlwZS5qb2luKCcsICcpXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIG9iamVjdFxuICBpZiAodHlwZSA9PT0gJ29iamVjdCcgJiYgKFxuICAgIHZhbCA9PT0gbnVsbCB8fFxuICAgIHR5cGVvZiB2YWwgIT09ICdvYmplY3QnXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgLy8gc3RyaW5nXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnICYmIHR5cGVvZiB2YWwgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG5cbiAgLy8gYm9vbGVhblxuICBlbHNlIGlmICh0eXBlID09PSAnYm9vbGVhbicgJiYgdHlwZW9mIHZhbCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIGJvb2xlYW4nKTtcbiAgfVxuXG4gIC8vIG51bWJlclxuICBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgdmFsICE9PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBudW1iZXInKTtcbiAgfVxuXG4gIC8vIGFycmF5XG4gIGVsc2UgaWYgKHR5cGUgPT09ICdhcnJheScgJiYgKFxuICAgIHZhbCA9PT0gbnVsbCB8fFxuICAgIHR5cGVvZiB2YWwgIT09ICdvYmplY3QnIHx8XG4gICAgdHlwZW9mIHZhbC5sZW5ndGggIT09ICdudW1iZXInXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gIH1cblxuICAvLyByZWdleFxuICBlbHNlIGlmICh0eXBlID09PSAncmVnZXhwJyAmJiB2YWwuY29uc3RydWN0b3IgIT09IFJlZ0V4cCkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSByZWdleHAnKTtcbiAgfVxuXG4gIC8vIGRhdGVcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ2RhdGUnICYmIHZhbC5jb25zdHJ1Y3RvciAhPT0gRGF0ZSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBkYXRlJyk7XG4gIH1cblxuICAvLyBlbWl0dGVyXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdlbWl0dGVyJyAmJiAoXG4gICAgdHlwZW9mIHZhbC5hZGRMaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwuZW1pdCAhPT0gJ2Z1bmN0aW9uJ1xuICApKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhbiBlbWl0dGVyJyk7XG4gIH1cblxuICAvLyBzdHJlYW1cbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmVhbScgJiYgKFxuICAgIHR5cGVvZiB2YWwub24gIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLnBpcGUgIT09ICdmdW5jdGlvbidcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBzdHJlYW0nKTtcbiAgfVxuXG4gIC8vIHJlYWQgc3RyZWFtXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdyZWFkLXN0cmVhbScgJiYgKFxuICAgIHR5cGVvZiB2YWwub24gIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLnBpcGUgIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLnJlYWQgIT09ICdmdW5jdGlvbidcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSByZWFkLXN0cmVhbScpO1xuICB9XG5cbiAgLy8gd3JpdGUgc3RyZWFtXG4gIGVsc2UgaWYgKHR5cGUgPT09ICd3cml0ZS1zdHJlYW0nICYmIChcbiAgICB0eXBlb2YgdmFsLm9uICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC5waXBlICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC53cml0ZSAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwuZW5kICE9PSAnZnVuY3Rpb24nXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgd3JpdGUtc3RyZWFtJyk7XG4gIH1cblxuICAvLyBmdW5jdGlvblxuICBlbHNlIGlmICh0eXBlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB2YWwgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuXG4gIC8vIG51bGxcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ251bGwnICYmIHZhbCAhPT0gbnVsbCkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBudWxsJyk7XG4gIH1cblxuICAvLyB1bmRlZmluZWRcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3VuZGVmaW5lZCcgJiYgdmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgdW5kZWZpbmVkJyk7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbmV4cG9ydHMuX3N0YWNrT2Zmc2V0ID0gMjtcblxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iXX0=
