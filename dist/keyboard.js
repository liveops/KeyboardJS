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

KeyboardJS.prototype._getGroupedListeners = function() {
  var self = this;
  var listenerGroups = [];
  var listenerGroupMap = [];
  self._listeners.slice(0).sort(function(a, b) {
    return a.keyCombo.keyNames.length > b.keyCombo.keyNames.length;
  }).forEach(function(l) {
    var mapIndex = -1;
    for (var i = 0; i < listenerGroupMap.length; i += 1) {
      if (listenerGroupMap[i].isEqual(l.keyCombo)) {
        mapIndex = i;
      }
    }
    if (mapIndex === -1) {
      mapIndex = listenerGroupMap.length;
      listenerGroupMap.push(l.keyCombo);
    }
    if (!listenerGroups[mapIndex]) {
      listenerGroups[mapIndex] = [];
    }
    listenerGroups[mapIndex].push(l);
  });
  return listenerGroups;
};

KeyboardJS.prototype._applyBindings = function(event) {
  var self = this;

  event || (event = {});
  var preventRepeat = false;
  event.preventRepeat = function() { preventRepeat = true; };

  var pressedKeys = self.locale.pressedKeys.slice(0);
  var listenerGroups = self._getGroupedListeners();

  for (var i = 0; i < listenerGroups.length; i += 1) {
    var listeners = listenerGroups[i];
    var keyCombo = listeners[0].keyCombo;

    if (keyCombo.check(pressedKeys)) {
      for (var j = 0; j < listeners.length; j += 1) {
        var listener = listeners[j];
        var handler = listener.pressHandler;
        if (handler && !listener.preventRepeat) {
          handler.call(self, event);
          if (preventRepeat) {
            listener.preventRepeat = preventRepeat;
            preventRepeat = false;
          }
        }
        if (listener.releaseHandler) {
          if (self._appliedListeners.indexOf(listener) === -1) {
            self._appliedListeners.push(listener);
          }
        }
      }
      for (var j = 0; j < keyCombo.keyNames.length; j += 1) {
        var index = pressedKeys.indexOf(keyCombo.keyNames[j]);
        if (index !== -1) {
          pressedKeys.splice(index, 1);
          j -= 1;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9rZXktY29tYm8uanMiLCJsaWIva2V5Ym9hcmQuanMiLCJsaWIvbG9jYWxlLmpzIiwibG9jYWxlcy91cy5qcyIsIm5vZGVfbW9kdWxlcy90eXBlLWd1YXJkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLWVycm9yLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLy8gbGlic1xudmFyIEtleWJvYXJkSlMgPSByZXF1aXJlKCcuL2xpYi9rZXlib2FyZCcpO1xudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4vbGliL2xvY2FsZScpO1xudmFyIEtleUNvbWJvID0gcmVxdWlyZSgnLi9saWIva2V5LWNvbWJvJyk7XG52YXIgdXNMb2NhbGUgPSByZXF1aXJlKCcuL2xvY2FsZXMvdXMnKTtcblxudmFyIGtleWJvYXJkSlMgPSBuZXcgS2V5Ym9hcmRKUygpO1xua2V5Ym9hcmRKUy5zZXRMb2NhbGUodXNMb2NhbGUpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBrZXlib2FyZEpTO1xuZXhwb3J0cy5LZXlib2FyZEpTID0gS2V5Ym9hcmRKUztcbmV4cG9ydHMuTG9jYWxlID0gTG9jYWxlO1xuZXhwb3J0cy5LZXlDb21ibyA9IEtleUNvbWJvO1xuIiwiXG4vLyBtb2R1bGVzXG52YXIgZ3VhcmQgPSByZXF1aXJlKCd0eXBlLWd1YXJkJyk7XG5cblxuZnVuY3Rpb24gS2V5Q29tYm8oa2V5Q29tYm9TdHIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb21ib1N0cicsIGtleUNvbWJvU3RyLCAnc3RyaW5nJyk7XG5cbiAgc2VsZi5zb3VyY2VTdHIgPSBrZXlDb21ib1N0cjtcbiAgc2VsZi5zdWJDb21ib3MgPSBLZXlDb21iby5wYXJzZUNvbWJvU3RyKGtleUNvbWJvU3RyKTtcbiAgc2VsZi5rZXlOYW1lcyA9IHNlbGYuc3ViQ29tYm9zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBuZXh0U3ViQ29tYm8pIHtcbiAgICByZXR1cm4gbWVtby5jb25jYXQobmV4dFN1YkNvbWJvKTtcbiAgfSk7XG59XG5cbktleUNvbWJvLnNlcXVlbmNlRGVsaW1pbmF0b3IgPSAnPj4nO1xuS2V5Q29tYm8uY29tYm9EZWxpbWluYXRvciA9ICc+JztcbktleUNvbWJvLmtleURlbGltaW5hdG9yID0gJysnO1xuXG5LZXlDb21iby5wYXJzZUNvbWJvU3RyID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIpIHtcbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsICdzdHJpbmcnKTtcblxuICB2YXIgc3ViQ29tYm9TdHJzID0gS2V5Q29tYm8uX3NwbGl0U3RyKGtleUNvbWJvU3RyLCBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yKTtcbiAgdmFyIGNvbWJvID0gW107XG4gIGZvciAodmFyIGkgPSAwIDsgaSA8IHN1YkNvbWJvU3Rycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbWJvLnB1c2goS2V5Q29tYm8uX3NwbGl0U3RyKHN1YkNvbWJvU3Ryc1tpXSwgS2V5Q29tYm8ua2V5RGVsaW1pbmF0b3IpKTtcbiAgfVxuICByZXR1cm4gY29tYm87XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbihwcmVzc2VkS2V5TmFtZXMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdwcmVzc2VkS2V5TmFtZXMnLCBwcmVzc2VkS2V5TmFtZXMsICdhcnJheScpO1xuXG4gIHZhciBzdGFydGluZ0tleU5hbWVJbmRleCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5zdWJDb21ib3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBzdGFydGluZ0tleU5hbWVJbmRleCA9IHNlbGYuX2NoZWNrU3ViQ29tYm8oXG4gICAgICBzZWxmLnN1YkNvbWJvc1tpXSxcbiAgICAgIHN0YXJ0aW5nS2V5TmFtZUluZGV4LFxuICAgICAgcHJlc3NlZEtleU5hbWVzXG4gICAgKTtcbiAgICBpZiAoc3RhcnRpbmdLZXlOYW1lSW5kZXggPT09IC0xKSB7IHJldHVybiBmYWxzZTsgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuS2V5Q29tYm8ucHJvdG90eXBlLmlzRXF1YWwgPSBmdW5jdGlvbihvdGhlcktleUNvbWJvKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgnb3RoZXJLZXlDb21ibycsIG90aGVyS2V5Q29tYm8sIFsgJ29iamVjdCcsICdzdHJpbmcnIF0pO1xuXG4gIGlmICh0eXBlb2Ygb3RoZXJLZXlDb21ibyA9PT0gJ3N0cmluZycpIHtcbiAgICBvdGhlcktleUNvbWJvID0gbmV3IEtleUNvbWJvKG90aGVyS2V5Q29tYm8pO1xuICB9IGVsc2Uge1xuICAgIGd1YXJkKCdvdGhlcktleUNvbWJvLnN1YkNvbWJvcycsIG90aGVyS2V5Q29tYm8uc3ViQ29tYm9zLCAnYXJyYXknKTtcbiAgfVxuXG4gIGlmIChzZWxmLnN1YkNvbWJvcy5sZW5ndGggIT09IG90aGVyS2V5Q29tYm8uc3ViQ29tYm9zLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuc3ViQ29tYm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKHNlbGYuc3ViQ29tYm9zW2ldLmxlbmd0aCAhPT0gb3RoZXJLZXlDb21iby5zdWJDb21ib3NbaV0ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBzdWJDb21ibyA9IHNlbGYuc3ViQ29tYm9zW2ldO1xuICAgIHZhciBvdGhlclN1YkNvbWJvID0gb3RoZXJLZXlDb21iby5zdWJDb21ib3NbaV0uc2xpY2UoMCk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBzdWJDb21iby5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgdmFyIGtleU5hbWUgPSBzdWJDb21ib1tqXTtcbiAgICAgIHZhciBpbmRleCA9IG90aGVyU3ViQ29tYm8uaW5kZXhPZihrZXlOYW1lKTtcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIG90aGVyU3ViQ29tYm8uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG90aGVyU3ViQ29tYm8ubGVuZ3RoICE9PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5LZXlDb21iby5fc3BsaXRTdHIgPSBmdW5jdGlvbihzdHIsIGRlbGltaW5hdG9yKSB7XG4gIHZhciBzID0gc3RyO1xuICB2YXIgZCA9IGRlbGltaW5hdG9yO1xuICB2YXIgYyA9ICcnO1xuICB2YXIgY2EgPSBbXTtcblxuICBmb3IgKHZhciBjaSA9IDA7IGNpIDwgcy5sZW5ndGg7IGNpICs9IDEpIHtcbiAgICBpZiAoY2kgPiAwICYmIHNbY2ldID09PSBkICYmIHNbY2kgLSAxXSAhPT0gJ1xcXFwnKSB7XG4gICAgICBjYS5wdXNoKGMudHJpbSgpKTtcbiAgICAgIGMgPSAnJztcbiAgICAgIGNpICs9IDE7XG4gICAgfVxuICAgIGMgKz0gc1tjaV07XG4gIH1cbiAgaWYgKGMpIHsgY2EucHVzaChjLnRyaW0oKSk7IH1cblxuICByZXR1cm4gY2E7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuX2NoZWNrU3ViQ29tYm8gPSBmdW5jdGlvbihcbiAgc3ViQ29tYm8sXG4gIHN0YXJ0aW5nS2V5TmFtZUluZGV4LFxuICBwcmVzc2VkS2V5TmFtZXNcbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ3N1YkNvbWJvJywgc3ViQ29tYm8sICdhcnJheScpO1xuICBndWFyZCgnc3RhcnRpbmdLZXlOYW1lSW5kZXgnLCBzdGFydGluZ0tleU5hbWVJbmRleCwgJ251bWJlcicpO1xuICBndWFyZCgncHJlc3NlZEtleU5hbWVzJywgcHJlc3NlZEtleU5hbWVzLCAnYXJyYXknKTtcblxuICBzdWJDb21ibyA9IHN1YkNvbWJvLnNsaWNlKDApO1xuICBwcmVzc2VkS2V5TmFtZXMgPSBwcmVzc2VkS2V5TmFtZXMuc2xpY2Uoc3RhcnRpbmdLZXlOYW1lSW5kZXgpO1xuXG4gIHZhciBlbmRJbmRleCA9IHN0YXJ0aW5nS2V5TmFtZUluZGV4O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YkNvbWJvLmxlbmd0aDsgaSArPSAxKSB7XG5cbiAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2ldO1xuICAgIGlmIChrZXlOYW1lWzBdID09PSAnXFxcXCcpIHtcbiAgICAgIHZhciBlc2NhcGVkS2V5TmFtZSA9IGtleU5hbWUuc2xpY2UoMSk7XG4gICAgICBpZiAoXG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yIHx8XG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5rZXlEZWxpbWluYXRvclxuICAgICAgKSB7XG4gICAgICAgIGtleU5hbWUgPSBlc2NhcGVkS2V5TmFtZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBwcmVzc2VkS2V5TmFtZXMuaW5kZXhPZihrZXlOYW1lKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgc3ViQ29tYm8uc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgICAgaWYgKGluZGV4ID4gZW5kSW5kZXgpIHtcbiAgICAgICAgZW5kSW5kZXggPSBpbmRleDtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJDb21iby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGVuZEluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Q29tYm87XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cbi8vIG1vZHVsZXNcbnZhciBndWFyZCA9IHJlcXVpcmUoJ3R5cGUtZ3VhcmQnKTtcblxuLy8gbGlic1xudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4vbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2tleS1jb21ibycpO1xuXG5cbmZ1bmN0aW9uIEtleWJvYXJkSlModGFyZ2V0V2luZG93KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgndGFyZ2V0V2luZG93JywgdGFyZ2V0V2luZG93LCBbICdvYmplY3QnLCAndW5kZWZpbmVkJyBdKTtcblxuICBzZWxmLmxvY2FsZSA9IG51bGw7XG4gIHNlbGYuX2N1cnJlbnRDb250ZXh0ID0gbnVsbDtcbiAgc2VsZi5fY29udGV4dHMgPSB7fTtcbiAgc2VsZi5fbGlzdGVuZXJzID0gW107XG4gIHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMgPSBbXTtcbiAgc2VsZi5fbG9jYWxlcyA9IHt9O1xuICBzZWxmLl90YXJnZXREb2N1bWVudCA9IG51bGw7XG4gIHNlbGYuX3RhcmdldFdpbmRvdyA9IG51bGw7XG5cbiAgc2VsZi5zZXRDb250ZXh0KCdkZWZhdWx0Jyk7XG4gIHNlbGYud2F0Y2goKTtcbn1cblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc2V0TG9jYWxlID0gZnVuY3Rpb24obG9jYWxlTmFtZSwgbG9jYWxlQnVpbGRlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGxvY2FsZSA9IG51bGw7XG4gIGlmICh0eXBlb2YgbG9jYWxlTmFtZSA9PT0gJ3N0cmluZycpIHtcblxuICAgIGd1YXJkKCdsb2NhbGVOYW1lJywgbG9jYWxlTmFtZSwgWyAnc3RyaW5nJywgJ251bGwnIF0pO1xuICAgIGd1YXJkKCdsb2NhbGVCdWlsZGVyJywgbG9jYWxlQnVpbGRlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJyBdKTtcblxuICAgIGlmIChsb2NhbGVCdWlsZGVyKSB7XG4gICAgICBsb2NhbGUgPSBuZXcgTG9jYWxlKGxvY2FsZU5hbWUpO1xuICAgICAgbG9jYWxlQnVpbGRlcihsb2NhbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2NhbGUgPSBzZWxmLl9sb2NhbGVzW2xvY2FsZU5hbWVdIHx8IG51bGw7XG4gICAgfVxuICB9IGVsc2Uge1xuXG4gICAgZ3VhcmQoJ2xvY2FsZScsIGxvY2FsZU5hbWUsICdvYmplY3QnKTtcbiAgICBndWFyZCgnbG9jYWxlLmxvY2FsZU5hbWUnLCBsb2NhbGVOYW1lLmxvY2FsZU5hbWUsICdzdHJpbmcnKTtcbiAgICBndWFyZCgnbG9jYWxlLnByZXNzS2V5JywgbG9jYWxlTmFtZS5wcmVzc0tleSwgJ2Z1bmN0aW9uJyk7XG4gICAgZ3VhcmQoJ2xvY2FsZS5yZWxlYXNlS2V5JywgbG9jYWxlTmFtZS5yZWxlYXNlS2V5LCAnZnVuY3Rpb24nKTtcbiAgICBndWFyZCgnbG9jYWxlLnByZXNzZWRLZXlzJywgbG9jYWxlTmFtZS5wcmVzc2VkS2V5cywgJ2FycmF5Jyk7XG5cbiAgICBsb2NhbGUgPSBsb2NhbGVOYW1lO1xuICAgIGxvY2FsZU5hbWUgPSBsb2NhbGUubG9jYWxlTmFtZTtcbiAgfVxuXG4gIHNlbGYubG9jYWxlID0gbG9jYWxlO1xuICBzZWxmLl9sb2NhbGVzW2xvY2FsZU5hbWVdID0gbG9jYWxlO1xuICBpZiAobG9jYWxlKSB7XG4gICAgc2VsZi5sb2NhbGUucHJlc3NlZEtleXMgPSBsb2NhbGUucHJlc3NlZEtleXM7XG4gIH1cbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLmdldExvY2FsZSA9IGZ1bmN0aW9uKGxvY2FsTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGxvY2FsTmFtZSB8fCAobG9jYWxOYW1lID0gc2VsZi5sb2NhbGUubG9jYWxlTmFtZSk7XG4gIHJldHVybiBzZWxmLl9sb2NhbGVzW2xvY2FsTmFtZV0gfHwgbnVsbDtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihrZXlDb21ib1N0ciwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsIFsgJ3N0cmluZycsICdhcnJheScgXSk7XG4gIGd1YXJkKCdwcmVzc0hhbmRsZXInLCBwcmVzc0hhbmRsZXIsIFsgJ2Z1bmN0aW9uJywgJ3VuZGVmaW5lZCcsICdudWxsJyBdKTtcbiAgZ3VhcmQoJ3JlbGVhc2VIYW5kbGVyJywgcmVsZWFzZUhhbmRsZXIsIFsgJ2Z1bmN0aW9uJywgJ3VuZGVmaW5lZCcsICdudWxsJyBdKTtcblxuICBpZiAodHlwZW9mIGtleUNvbWJvU3RyID09PSAnc3RyaW5nJykge1xuICAgIHNlbGYuX2xpc3RlbmVycy5wdXNoKHtcbiAgICAgIGtleUNvbWJvOiBuZXcgS2V5Q29tYm8oa2V5Q29tYm9TdHIpLFxuICAgICAgcHJlc3NIYW5kbGVyOiBwcmVzc0hhbmRsZXIgfHwgbnVsbCxcbiAgICAgIHJlbGVhc2VIYW5kbGVyOiByZWxlYXNlSGFuZGxlciB8fCBudWxsLFxuICAgICAgcHJldmVudFJlcGVhdDogZmFsc2VcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvbWJvU3RyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBzZWxmLmJpbmQoa2V5Q29tYm9TdHJbaV0sIHByZXNzSGFuZGxlciwgcmVsZWFzZUhhbmRsZXIpO1xuICAgIH1cbiAgfVxufTtcbktleWJvYXJkSlMucHJvdG90eXBlLmFkZExpc3RlbmVyID0gS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZDtcbktleWJvYXJkSlMucHJvdG90eXBlLm9uID0gS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZDtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIsIHByZXNzSGFuZGxlciwgcmVsZWFzZUhhbmRsZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb21ib1N0cicsIGtleUNvbWJvU3RyLCBbICdzdHJpbmcnLCAnYXJyYXknIF0pO1xuICBndWFyZCgncHJlc3NIYW5kbGVyJywgcHJlc3NIYW5kbGVyLCBbICdmdW5jdGlvbicsICd1bmRlZmluZWQnIF0pO1xuICBndWFyZCgncmVsZWFzZUhhbmRsZXInLCByZWxlYXNlSGFuZGxlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJyBdKTtcblxuICBpZiAodHlwZW9mIGtleUNvbWJvU3RyID09PSAnc3RyaW5nJykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB2YXIgbGlzdGVuZXIgPSBzZWxmLl9saXN0ZW5lcnNbaV07XG5cbiAgICAgIHZhciBjb21ib01hdGNoZXMgPSBsaXN0ZW5lci5rZXlDb21iby5pc0VxdWFsKGtleUNvbWJvU3RyKTtcbiAgICAgIHZhciBwcmVzc0hhbmRsZXJNYXRjaGVzID0gIXByZXNzSGFuZGxlciB8fFxuICAgICAgICBwcmVzc0hhbmRsZXIgPT09IGxpc3RlbmVyLnByZXNzSGFuZGxlcjtcbiAgICAgIHZhciByZWxlYXNlSGFuZGxlck1hdGNoZXMgPSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlciA9PT0gbnVsbCB8fFxuICAgICAgICByZWxlYXNlSGFuZGxlciA9PT0gbGlzdGVuZXIucmVsZWFzZUhhbmRsZXI7XG5cbiAgICAgIGlmIChjb21ib01hdGNoZXMgJiYgcHJlc3NIYW5kbGVyTWF0Y2hlcyAmJiByZWxlYXNlSGFuZGxlck1hdGNoZXMpIHtcbiAgICAgICAgc2VsZi5fbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgaSAtPSAxO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvbWJvU3RyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBzZWxmLmJpbmQoa2V5Q29tYm9TdHJbaV0sIHByZXNzSGFuZGxlciwgcmVsZWFzZUhhbmRsZXIpO1xuICAgIH1cbiAgfVxufTtcbktleWJvYXJkSlMucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gS2V5Ym9hcmRKUy5wcm90b3R5cGUudW5iaW5kO1xuS2V5Ym9hcmRKUy5wcm90b3R5cGUub2ZmID0gS2V5Ym9hcmRKUy5wcm90b3R5cGUudW5iaW5kO1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5zZXRDb250ZXh0ID0gZnVuY3Rpb24oY29udGV4dE5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBndWFyZCgnY29udGV4dE5hbWUnLCBjb250ZXh0TmFtZSwgJ3N0cmluZycpO1xuICBpZiAoc2VsZi5sb2NhbGUpIHtcbiAgICBzZWxmLnJlbGVhc2VBbGxLZXlzKCk7XG4gIH1cbiAgaWYgKCFzZWxmLl9jb250ZXh0c1tjb250ZXh0TmFtZV0pIHtcbiAgICBzZWxmLl9jb250ZXh0c1tjb250ZXh0TmFtZV0gPSBbXTtcbiAgfVxuICBzZWxmLl9saXN0ZW5lcnMgPSBzZWxmLl9jb250ZXh0c1tjb250ZXh0TmFtZV07XG4gIHNlbGYuX2N1cnJlbnRDb250ZXh0ID0gY29udGV4dE5hbWU7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2N1cnJlbnRDb250ZXh0O1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbih0YXJnZXREb2N1bWVudCwgdGFyZ2V0V2luZG93KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgndGFyZ2V0RG9jdW1lbnQnLCB0YXJnZXREb2N1bWVudCwgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG4gIGd1YXJkKCd0YXJnZXRXaW5kb3cnLCB0YXJnZXRXaW5kb3csIFsgJ29iamVjdCcsICd1bmRlZmluZWQnIF0pO1xuXG4gIHNlbGYuc3RvcCgpO1xuXG4gIGlmICh0YXJnZXREb2N1bWVudCAmJiB0YXJnZXREb2N1bWVudC5kb2N1bWVudCAmJiAhdGFyZ2V0V2luZG93KSB7XG4gICAgdGFyZ2V0V2luZG93ID0gdGFyZ2V0RG9jdW1lbnQ7XG4gICAgdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICB9XG4gIGlmICghdGFyZ2V0V2luZG93KSB7XG4gICAgdGFyZ2V0V2luZG93ID0gZ2xvYmFsLndpbmRvdztcbiAgfVxuICBpZiAodGFyZ2V0V2luZG93ICYmICF0YXJnZXREb2N1bWVudCkge1xuICAgIHRhcmdldERvY3VtZW50ID0gdGFyZ2V0V2luZG93LmRvY3VtZW50O1xuICB9XG5cbiAgaWYgKHRhcmdldERvY3VtZW50ICYmIHRhcmdldFdpbmRvdykge1xuICAgIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA9ICEhdGFyZ2V0V2luZG93LmFkZEV2ZW50TGlzdGVuZXI7XG5cbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0RG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoZXZlbnQua2V5Q29kZSwgZXZlbnQpO1xuICAgIH0pO1xuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXREb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fYmluZEV2ZW50KHRhcmdldFdpbmRvdywgJ2ZvY3VzJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAnYmx1cicsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG5cbiAgICBzZWxmLl90YXJnZXREb2N1bWVudCA9IHRhcmdldERvY3VtZW50O1xuICAgIHNlbGYuX3RhcmdldFdpbmRvdyA9IHRhcmdldFdpbmRvdztcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl90YXJnZXREb2N1bWVudCkge1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldERvY3VtZW50LCAna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBzZWxmLnByZXNzS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXREb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICB9XG4gIGlmIChzZWxmLl90YXJnZXRXaW5kb3cpIHtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXRXaW5kb3csICdmb2N1cycsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG4gICAgc2VsZi5fdW5iaW5kRXZlbnQoc2VsZi5fdGFyZ2V0V2luZG93LCAnYmx1cicsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG4gICAgc2VsZi5fdGFyZ2V0V2luZG93ID0gbnVsbDtcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucHJlc3NLZXkgPSBmdW5jdGlvbihrZXlDb2RlLCBldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvZGUnLCBrZXlDb2RlLCBbICdudW1iZXInLCAnc3RyaW5nJyBdKTtcbiAgZ3VhcmQoJ2V2ZW50JywgZXZlbnQsIFsgJ29iamVjdCcsICd1bmRlZmluZWQnIF0pO1xuXG4gIHNlbGYubG9jYWxlLnByZXNzS2V5KGtleUNvZGUpO1xuICBzZWxmLl9hcHBseUJpbmRpbmdzKGV2ZW50KTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnJlbGVhc2VLZXkgPSBmdW5jdGlvbihrZXlDb2RlLCBldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvZGUnLCBrZXlDb2RlLCBbICdudW1iZXInLCAnc3RyaW5nJyBdKTtcbiAgZ3VhcmQoJ2V2ZW50JywgZXZlbnQsIFsgJ29iamVjdCcsICd1bmRlZmluZWQnIF0pO1xuXG4gIHNlbGYubG9jYWxlLnJlbGVhc2VLZXkoa2V5Q29kZSk7XG4gIHNlbGYuX2NsZWFyQmluZGluZ3MoZXZlbnQpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVsZWFzZUFsbEtleXMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLmxvY2FsZS5wcmVzc2VkS2V5cy5sZW5ndGggPSAwO1xuICBzZWxmLl9jbGVhckJpbmRpbmdzKCk7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYucmVsZWFzZUFsbEtleXMoKTtcbiAgc2VsZi5fbGlzdGVuZXJzLmxlbmd0aCA9IDA7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5fYmluZEV2ZW50ID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlciwgZmFsc2UpIDpcbiAgICB0YXJnZXRFbGVtZW50LmF0dGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGhhbmRsZXIpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX3VuYmluZEV2ZW50ID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlciwgZmFsc2UpOlxuICAgIHRhcmdldEVsZW1lbnQuZGV0YWNoRXZlbnQoJ29uJyArIGV2ZW50TmFtZSwgaGFuZGxlcik7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5fZ2V0R3JvdXBlZExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsaXN0ZW5lckdyb3VwcyA9IFtdO1xuICB2YXIgbGlzdGVuZXJHcm91cE1hcCA9IFtdO1xuICBzZWxmLl9saXN0ZW5lcnMuc2xpY2UoMCkuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEua2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoID4gYi5rZXlDb21iby5rZXlOYW1lcy5sZW5ndGg7XG4gIH0pLmZvckVhY2goZnVuY3Rpb24obCkge1xuICAgIHZhciBtYXBJbmRleCA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJHcm91cE1hcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKGxpc3RlbmVyR3JvdXBNYXBbaV0uaXNFcXVhbChsLmtleUNvbWJvKSkge1xuICAgICAgICBtYXBJbmRleCA9IGk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtYXBJbmRleCA9PT0gLTEpIHtcbiAgICAgIG1hcEluZGV4ID0gbGlzdGVuZXJHcm91cE1hcC5sZW5ndGg7XG4gICAgICBsaXN0ZW5lckdyb3VwTWFwLnB1c2gobC5rZXlDb21ibyk7XG4gICAgfVxuICAgIGlmICghbGlzdGVuZXJHcm91cHNbbWFwSW5kZXhdKSB7XG4gICAgICBsaXN0ZW5lckdyb3Vwc1ttYXBJbmRleF0gPSBbXTtcbiAgICB9XG4gICAgbGlzdGVuZXJHcm91cHNbbWFwSW5kZXhdLnB1c2gobCk7XG4gIH0pO1xuICByZXR1cm4gbGlzdGVuZXJHcm91cHM7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5fYXBwbHlCaW5kaW5ncyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBldmVudCB8fCAoZXZlbnQgPSB7fSk7XG4gIHZhciBwcmV2ZW50UmVwZWF0ID0gZmFsc2U7XG4gIGV2ZW50LnByZXZlbnRSZXBlYXQgPSBmdW5jdGlvbigpIHsgcHJldmVudFJlcGVhdCA9IHRydWU7IH07XG5cbiAgdmFyIHByZXNzZWRLZXlzID0gc2VsZi5sb2NhbGUucHJlc3NlZEtleXMuc2xpY2UoMCk7XG4gIHZhciBsaXN0ZW5lckdyb3VwcyA9IHNlbGYuX2dldEdyb3VwZWRMaXN0ZW5lcnMoKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVyR3JvdXBzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IGxpc3RlbmVyR3JvdXBzW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IGxpc3RlbmVyc1swXS5rZXlDb21ibztcblxuICAgIGlmIChrZXlDb21iby5jaGVjayhwcmVzc2VkS2V5cykpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGlzdGVuZXJzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lciA9IGxpc3RlbmVyc1tqXTtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBsaXN0ZW5lci5wcmVzc0hhbmRsZXI7XG4gICAgICAgIGlmIChoYW5kbGVyICYmICFsaXN0ZW5lci5wcmV2ZW50UmVwZWF0KSB7XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHNlbGYsIGV2ZW50KTtcbiAgICAgICAgICBpZiAocHJldmVudFJlcGVhdCkge1xuICAgICAgICAgICAgbGlzdGVuZXIucHJldmVudFJlcGVhdCA9IHByZXZlbnRSZXBlYXQ7XG4gICAgICAgICAgICBwcmV2ZW50UmVwZWF0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcikge1xuICAgICAgICAgIGlmIChzZWxmLl9hcHBsaWVkTGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpID09PSAtMSkge1xuICAgICAgICAgICAgc2VsZi5fYXBwbGllZExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcHJlc3NlZEtleXMuaW5kZXhPZihrZXlDb21iby5rZXlOYW1lc1tqXSk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICBwcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgIGogLT0gMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2NsZWFyQmluZGluZ3MgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZXZlbnQgfHwgKGV2ZW50ID0ge30pO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fYXBwbGllZExpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBsaXN0ZW5lciA9IHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnNbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbGlzdGVuZXIua2V5Q29tYm87XG4gICAgdmFyIGhhbmRsZXIgPSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcjtcbiAgICBpZiAoIWtleUNvbWJvLmNoZWNrKHNlbGYubG9jYWxlLnByZXNzZWRLZXlzKSkge1xuICAgICAgbGlzdGVuZXIucHJldmVudFJlcGVhdCA9IGZhbHNlO1xuICAgICAgaGFuZGxlci5jYWxsKHNlbGYsIGV2ZW50KTtcbiAgICAgIHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlib2FyZEpTO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcbi8vIG1vZHVsZXNcbnZhciBndWFyZCA9IHJlcXVpcmUoJ3R5cGUtZ3VhcmQnKTtcblxuLy8gbGlic1xudmFyIEtleUNvbWJvID0gcmVxdWlyZSgnLi9rZXktY29tYm8nKTtcblxuXG5mdW5jdGlvbiBMb2NhbGUobmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ25hbWUnLCBuYW1lLCAnc3RyaW5nJyk7XG5cbiAgc2VsZi5sb2NhbGVOYW1lID0gbmFtZTtcbiAgc2VsZi5wcmVzc2VkS2V5cyA9IFtdO1xuICBzZWxmLl9hcHBsaWVkTWFjcm9zID0gW107XG4gIHNlbGYuX2tleU1hcCA9IHt9O1xuICBzZWxmLl9tYWNyb3MgPSBbXTtcbn1cblxuTG9jYWxlLnByb3RvdHlwZS5iaW5kS2V5Q29kZSA9IGZ1bmN0aW9uKGtleUNvZGUsIGtleU5hbWVzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsICdudW1iZXInKTtcbiAgZ3VhcmQoJ2tleU5hbWVzJywga2V5TmFtZXMsIFsgJ2FycmF5JywgJ3N0cmluZycgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICBrZXlOYW1lcyA9IFtrZXlOYW1lc107XG4gIH1cblxuICBzZWxmLl9rZXlNYXBba2V5Q29kZV0gPSBrZXlOYW1lcztcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuYmluZE1hY3JvID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIsIGtleU5hbWVzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgJ3N0cmluZycpO1xuICBndWFyZCgna2V5TmFtZXMnLCBrZXlOYW1lcywgWyAnZnVuY3Rpb24nLCAnc3RyaW5nJywgJ2FycmF5JyBdKTtcblxuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnc3RyaW5nJykge1xuICAgIGtleU5hbWVzID0gWyBrZXlOYW1lcyBdO1xuICB9XG5cbiAgdmFyIG1hY3JvID0ge1xuICAgIGtleUNvbWJvOiBuZXcgS2V5Q29tYm8oa2V5Q29tYm9TdHIpLFxuICAgIGtleU5hbWVzOiBudWxsLFxuICAgIGhhbmRsZXI6IG51bGxcbiAgfTtcblxuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgbWFjcm8uaGFuZGxlciA9IGtleU5hbWVzO1xuICB9IGVsc2Uge1xuICAgIG1hY3JvLmtleU5hbWVzID0ga2V5TmFtZXM7XG4gIH1cblxuICBzZWxmLl9tYWNyb3MucHVzaChtYWNybyk7XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLmdldEtleUNvZGVzID0gZnVuY3Rpb24oa2V5TmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleU5hbWUnLCBrZXlOYW1lLCAnc3RyaW5nJyk7XG5cbiAgdmFyIGtleUNvZGVzID0gW107XG4gIGZvciAodmFyIGtleUNvZGUgaW4gc2VsZi5fa2V5TWFwKSB7XG4gICAgdmFyIGluZGV4ID0gc2VsZi5fa2V5TWFwW2tleUNvZGVdLmluZGV4T2Yoa2V5TmFtZSk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHsga2V5Q29kZXMucHVzaChrZXlDb2RlfDApOyB9XG4gIH1cbiAgcmV0dXJuIGtleUNvZGVzO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5nZXRLZXlOYW1lcyA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgJ251bWJlcicpO1xuXG4gIHJldHVybiBzZWxmLl9rZXlNYXBba2V5Q29kZV0gfHwgW107XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLnByZXNzS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvZGUnLCBrZXlDb2RlLCBbICdudW1iZXInLCAnc3RyaW5nJyBdKTtcblxuICBpZiAodHlwZW9mIGtleUNvZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIGtleUNvZGVzID0gc2VsZi5nZXRLZXlDb2RlcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBzZWxmLnByZXNzS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB2YXIga2V5TmFtZXMgPSBzZWxmLmdldEtleU5hbWVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5TmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmIChzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbaV0pID09PSAtMSkge1xuICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnB1c2goa2V5TmFtZXNbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGYuX2FwcGx5TWFjcm9zKCk7XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUucmVsZWFzZUtleSA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgWyAnbnVtYmVyJywgJ3N0cmluZycgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlDb2RlID09PSAnc3RyaW5nJykge1xuICAgIHZhciBrZXlDb2RlcyA9IHNlbGYuZ2V0S2V5Q29kZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB2YXIga2V5TmFtZXMgPSBzZWxmLmdldEtleU5hbWVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5TmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBpbmRleCA9IHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tpXSk7XG4gICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZi5fY2xlYXJNYWNyb3MoKTtcbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5fYXBwbHlNYWNyb3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBtYWNyb3MgPSBzZWxmLl9tYWNyb3Muc2xpY2UoMCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbWFjcm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIG1hY3JvID0gbWFjcm9zW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IG1hY3JvLmtleUNvbWJvO1xuICAgIHZhciBrZXlOYW1lcyA9IG1hY3JvLmtleU5hbWVzO1xuICAgIGlmIChrZXlDb21iby5jaGVjayhzZWxmLnByZXNzZWRLZXlzKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICBpZiAoc2VsZi5wcmVzc2VkS2V5cy5pbmRleE9mKGtleU5hbWVzW2pdKSA9PT0gLTEpIHtcbiAgICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnB1c2goa2V5TmFtZXNbal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWxmLl9hcHBsaWVkTWFjcm9zLnB1c2gobWFjcm8pO1xuICAgIH1cbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5fY2xlYXJNYWNyb3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fYXBwbGllZE1hY3Jvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBtYWNybyA9IHNlbGYuX2FwcGxpZWRNYWNyb3NbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbWFjcm8ua2V5Q29tYm87XG4gICAgdmFyIGtleU5hbWVzID0gbWFjcm8ua2V5TmFtZXM7XG4gICAgaWYgKCFrZXlDb21iby5jaGVjayhzZWxmLnByZXNzZWRLZXlzKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICB2YXIgaW5kZXggPSBzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbal0pO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgIHNlbGYucHJlc3NlZEtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZi5fYXBwbGllZE1hY3Jvcy5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgfVxuICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlO1xuIiwiXG4vLyBtb2R1bGVzXG52YXIgTG9jYWxlID0gcmVxdWlyZSgnLi4vbGliL2xvY2FsZScpO1xuXG5cbi8vIGNyZWF0ZSB0aGUgbG9jYWxlXG52YXIgbG9jYWxlID0gbmV3IExvY2FsZSgndXMnKTtcblxuLy8gZ2VuZXJhbFxubG9jYWxlLmJpbmRLZXlDb2RlKDMsIFsgJ2NhbmNlbCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOCwgWyAnYmFja3NwYWNlJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5LCBbICd0YWInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyLCBbICdjbGVhcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTMsIFsgJ2VudGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNiwgWyAnc2hpZnQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE3LCBbICdjdHJsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOCwgWyAnYWx0JywgJ21lbnUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5LCBbICdwYXVzZScsICdicmVhaycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjAsIFsgJ2NhcHNsb2NrJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyNywgWyAnZXNjYXBlJywgJ2VzYycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzIsIFsgJ3NwYWNlJywgJ3NwYWNlYmFyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzMywgWyAncGFnZXVwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNCwgWyAncGFnZWRvd24nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM1LCBbICdlbmQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM2LCBbICdob21lJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNywgWyAnbGVmdCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzgsIFsgJ3VwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzOSwgWyAncmlnaHQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQwLCBbICdkb3duJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MSwgWyAnc2VsZWN0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MiwgWyAncHJpbnRzY3JlZW4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQzLCBbICdleGVjdXRlJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NCwgWyAnc25hcHNob3QnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ1LCBbICdpbnNlcnQnLCAnaW5zJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NiwgWyAnZGVsZXRlJywgJ2RlbCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDcsIFsgJ2hlbHAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDkxLCBbICdjb21tYW5kJywgJ3dpbmRvd3MnLCAnd2luJywgJ3N1cGVyJywgJ2xlZnRjb21tYW5kJywgJ2xlZnR3aW5kb3dzJywgJ2xlZnR3aW4nLCAnbGVmdHN1cGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5MiwgWyAnY29tbWFuZCcsICd3aW5kb3dzJywgJ3dpbicsICdzdXBlcicsICdyaWdodGNvbW1hbmQnLCAncmlnaHR3aW5kb3dzJywgJ3JpZ2h0d2luJywgJ3JpZ2h0c3VwZXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE0NSwgWyAnc2Nyb2xsbG9jaycsICdzY3JvbGwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4NiwgWyAnc2VtaWNvbG9uJywgJzsnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4NywgWyAnZXF1YWwnLCAnZXF1YWxzaWduJywgJz0nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4OCwgWyAnY29tbWEnLCAnLCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTg5LCBbICdkYXNoJywgJy0nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MCwgWyAncGVyaW9kJywgJy4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MSwgWyAnc2xhc2gnLCAnZm9yd2FyZHNsYXNoJywgJy8nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MiwgWyAnZ3JhdmVhY2NlbnQnLCAnYCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjE5LCBbICdvcGVuYnJhY2tldCcsICdbJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjAsIFsgJ2JhY2tzbGFzaCcsICdcXFxcJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjEsIFsgJ2Nsb3NlYnJhY2tldCcsICddJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjIsIFsgJ2Fwb3N0cm9waGUnLCAnXFwnJyBdKTtcblxuLy8gMC05XG5sb2NhbGUuYmluZEtleUNvZGUoNDgsIFsgJ3plcm8nLCAnMCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDksIFsgJ29uZScsICcxJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MCwgWyAndHdvJywgJzInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDUxLCBbICd0aHJlZScsICczJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MiwgWyAnZm91cicsICc0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MywgWyAnZml2ZScsICc1JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NCwgWyAnc2l4JywgJzYnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDU1LCBbICdzZXZlbicsICc3JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NiwgWyAnZWlnaHQnLCAnOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTcsIFsgJ25pbmUnLCAnOScgXSk7XG5cbi8vIG51bXBhZFxubG9jYWxlLmJpbmRLZXlDb2RlKDk2LCBbICdudW16ZXJvJywgJ251bTAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDk3LCBbICdudW1vbmUnLCAnbnVtMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTgsIFsgJ251bXR3bycsICdudW0yJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5OSwgWyAnbnVtdGhyZWUnLCAnbnVtMycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAwLCBbICdudW1mb3VyJywgJ251bTQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwMSwgWyAnbnVtZml2ZScsICdudW01JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDIsIFsgJ251bXNpeCcsICdudW02JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDMsIFsgJ251bXNldmVuJywgJ251bTcnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNCwgWyAnbnVtZWlnaHQnLCAnbnVtOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA1LCBbICdudW1uaW5lJywgJ251bTknIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNiwgWyAnbnVtbXVsdGlwbHknLCAnbnVtKicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA3LCBbICdudW1hZGQnLCAnbnVtKycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA4LCBbICdudW1lbnRlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA5LCBbICdudW1zdWJ0cmFjdCcsICdudW0tJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTAsIFsgJ251bWRlY2ltYWwnLCAnbnVtLicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTExLCBbICdudW1kaXZpZGUnLCAnbnVtLycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTQ0LCBbICdudW1sb2NrJywgJ251bScgXSk7XG5cbi8vIGZ1bmN0aW9uIGtleXNcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTIsIFsgJ2YxJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTMsIFsgJ2YyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTQsIFsgJ2YzJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTUsIFsgJ2Y0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTYsIFsgJ2Y1JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTcsIFsgJ2Y2JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTgsIFsgJ2Y3JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTksIFsgJ2Y4JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjAsIFsgJ2Y5JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjEsIFsgJ2YxMCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIyLCBbICdmMTEnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyMywgWyAnZjEyJyBdKTtcblxuLy8gc2Vjb25kYXJ5IGtleSBzeW1ib2xzXG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIGAnLCBbICd0aWxkZScsICd+JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMScsIFsgJ2V4Y2xhbWF0aW9uJywgJ2V4Y2xhbWF0aW9ucG9pbnQnLCAnIScgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDInLCBbICdhdCcsICdAJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMycsIFsgJ251bWJlcicsICcjJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNCcsIFsgJ2RvbGxhcicsICdkb2xsYXJzJywgJ2RvbGxhcnNpZ24nLCAnJCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDUnLCBbICdwZXJjZW50JywgJyUnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA2JywgWyAnY2FyZXQnLCAnXicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDcnLCBbICdhbXBlcnNhbmQnLCAnYW5kJywgJyYnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA4JywgWyAnYXN0ZXJpc2snLCAnKicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDknLCBbICdvcGVucGFyZW4nLCAnKCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDAnLCBbICdjbG9zZXBhcmVuJywgJyknIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAtJywgWyAndW5kZXJzY29yZScsICdfJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgPScsIFsgJ3BsdXMnLCAnKycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIFsnLCBbICdvcGVuY3VybHlicmFjZScsICdvcGVuY3VybHlicmFja2V0JywgJ3snIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBdJywgWyAnY2xvc2VjdXJseWJyYWNlJywgJ2Nsb3NlY3VybHlicmFja2V0JywgJ30nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBcXFxcJywgWyAndmVydGljYWxiYXInLCAnfCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDsnLCBbICdjb2xvbicsICc6JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXFwnJywgWyAncXVvdGF0aW9ubWFyaycsICdcXCcnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAhLCcsIFsgJ29wZW5hbmdsZWJyYWNrZXQnLCAnPCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIC4nLCBbICdjbG9zZWFuZ2xlYnJhY2tldCcsICc+JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgLycsIFsgJ3F1ZXN0aW9ubWFyaycsICc/JyBdKTtcblxuLy9hLXogYW5kIEEtWlxuZm9yICh2YXIga2V5Q29kZSA9IDY1OyBrZXlDb2RlIDw9IDkwOyBrZXlDb2RlICs9IDEpIHtcbiAgdmFyIGtleU5hbWUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUgKyAzMik7XG4gIHZhciBjYXBpdGFsS2V5TmFtZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSk7XG5cdGxvY2FsZS5iaW5kS2V5Q29kZShrZXlDb2RlLCBrZXlOYW1lKTtcblx0bG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAnICsga2V5TmFtZSwgY2FwaXRhbEtleU5hbWUpO1xuXHRsb2NhbGUuYmluZE1hY3JvKCdjYXBzbG9jayArICcgKyBrZXlOYW1lLCBjYXBpdGFsS2V5TmFtZSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBsb2NhbGU7XG4iLCJcblxuLy8gbGlic1xudmFyIEd1YXJkRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9ndWFyZC1lcnJvcicpO1xudmFyIGd1YXJkID0gcmVxdWlyZSgnLi9saWIvZ3VhcmQnKTtcblxuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggICAgKSB7XG4gIHJldHVybiBndWFyZC5jaGVjay5hcHBseShndWFyZCwgYXJndW1lbnRzKTtcbn07XG5leHBvcnRzLkd1YXJkRXJyb3IgPSBHdWFyZEVycm9yO1xuZXhwb3J0cy5ndWFyZCA9IGd1YXJkO1xuZXhwb3J0cy50eXBlcyA9IGd1YXJkLnR5cGVzO1xuIiwiXG4vLyBtb2R1bGVzXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5cbmZ1bmN0aW9uIEd1YXJkRXJyb3IobWVzc2FnZSwgZmlsZU5hbWUsIGxpbmVOdW1iZXIpIHtcbiAgRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlLCBmaWxlTmFtZSwgbGluZU51bWJlcik7XG5cbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICBpZiAoZmlsZU5hbWUpIHsgdGhpcy5maWxlTmFtZSA9IGZpbGVOYW1lOyB9XG4gIGlmIChsaW5lTnVtYmVyKSB7IHRoaXMubGluZU51bWJlciA9IGxpbmVOdW1iZXI7IH1cblxuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5fc2V0U3RhY2tPZmZzZXQoMSk7XG59XG5pbmhlcml0cyhHdWFyZEVycm9yLCBFcnJvcik7XG5cbkd1YXJkRXJyb3IucHJvdG90eXBlLl9zZXRTdGFja09mZnNldCA9IGZ1bmN0aW9uKHN0YWNrT2Zmc2V0KSB7XG4gIHRyeSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH0gY2F0Y2goZHVtbXlFcnIpIHtcbiAgICB2YXIgZmlyc3RMaW5lID0gdGhpcy5zdGFjay5zcGxpdCgnXFxuJylbMF07XG4gICAgdmFyIGxpbmVzID0gZHVtbXlFcnIuc3RhY2suc3BsaXQoJ1xcbicpO1xuICAgIHZhciBsaW5lID0gbGluZXNbc3RhY2tPZmZzZXQgKyAyXTtcbiAgICB2YXIgbGluZUNodW5rcyA9IGxpbmUubWF0Y2goL1xcKChbXlxcKV0rKVxcKS8pWzFdLnNwbGl0KCc6Jyk7XG4gICAgdGhpcy5zdGFjayA9IFtmaXJzdExpbmVdLmNvbmNhdChsaW5lcy5zbGljZShzdGFja09mZnNldCArIDIpKS5qb2luKCdcXG4nKTtcbiAgICB0aGlzLmZpbGVOYW1lID0gbGluZUNodW5rc1swXTtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lQ2h1bmtzWzFdO1xuICAgIHRoaXMuY29sdW1uTnVtYmVyID0gbGluZUNodW5rc1syXTtcbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEd1YXJkRXJyb3I7XG4iLCJcbi8vIGxpYnNcbnZhciBHdWFyZEVycm9yID0gcmVxdWlyZSgnLi9ndWFyZC1lcnJvcicpO1xuXG5cbmV4cG9ydHMudHlwZXMgPSBbXG4gICdvYmplY3QnLFxuICAnc3RyaW5nJyxcbiAgJ2Jvb2xlYW4nLFxuICAnbnVtYmVyJyxcbiAgJ2FycmF5JyxcbiAgJ3JlZ2V4cCcsXG4gICdkYXRlJyxcbiAgJ3N0cmVhbScsXG4gICdyZWFkLXN0cmVhbScsXG4gICd3cml0ZS1zdHJlYW0nLFxuICAnZW1pdHRlcicsXG4gICdmdW5jdGlvbicsXG4gICdudWxsJyxcbiAgJ3VuZGVmaW5lZCdcbl07XG5cbmV4cG9ydHMuY2hlY2sgPSBmdW5jdGlvbihrZXksIHZhbCwgdHlwZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigna2V5IG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgfVxuICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnICYmIChcbiAgICB0eXBlID09PSBudWxsIHx8XG4gICAgdHlwZW9mIHR5cGUgIT09ICdvYmplY3QnIHx8XG4gICAgdHlwZW9mIHR5cGUubGVuZ3RoICE9PSAnbnVtYmVyJ1xuICApKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndHlwZSBtdXN0IGJlIGEgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICB2YXIgdHlwZUVyciA9IHNlbGYuX3ZhbGlkYXRlVHlwZSh0eXBlKTtcbiAgaWYgKHR5cGVFcnIpIHtcbiAgICB0eXBlRXJyLl9zZXRTdGFja09mZnNldChzZWxmLl9zdGFja09mZnNldCk7XG4gICAgdGhyb3cgdHlwZUVycjtcbiAgfVxuXG4gIHZhciB2YWxFcnIgPSBzZWxmLl92YWxpZGF0ZVZhbChrZXksIHR5cGUsIHZhbCk7XG4gIGlmICh2YWxFcnIpIHtcbiAgICB2YWxFcnIuX3NldFN0YWNrT2Zmc2V0KHNlbGYuX3N0YWNrT2Zmc2V0KTtcbiAgICB0aHJvdyB2YWxFcnI7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbmV4cG9ydHMuX3ZhbGlkYXRlVHlwZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChcbiAgICB0eXBlICE9PSBudWxsICYmXG4gICAgdHlwZW9mIHR5cGUgPT09ICdvYmplY3QnICYmXG4gICAgdHlwZW9mIHR5cGUubGVuZ3RoID09PSAnbnVtYmVyJ1xuICApIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBlcnIgPSBzZWxmLl92YWxpZGF0ZVR5cGUodHlwZVtpXSk7XG4gICAgICBpZiAoZXJyKSB7IHJldHVybiBlcnI7IH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHNlbGYudHlwZXMuaW5kZXhPZih0eXBlKSA9PT0gLTEpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3IoXG4gICAgICAndHlwZSBtdXN0IGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nIHZhbHVlczogJyArIHNlbGYudHlwZXMuam9pbignLCAnKVxuICAgICk7XG4gIH1cbn07XG5cbi8vIHZhbGlkYXRlcyB0aGUgdmFsdWUgYWdhaW5zdCB0aGUgdHlwZVxuZXhwb3J0cy5fdmFsaWRhdGVWYWwgPSBmdW5jdGlvbihrZXksIHR5cGUsIHZhbCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gcmVjdXJzaXZlXG4gIGlmIChcbiAgICB0eXBlICE9PSBudWxsICYmXG4gICAgdHlwZW9mIHR5cGUgPT09ICdvYmplY3QnICYmXG4gICAgdHlwZW9mIHR5cGUubGVuZ3RoID09PSAnbnVtYmVyJ1xuICApIHtcbiAgICB2YXIgb2sgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmICghc2VsZi5fdmFsaWRhdGVWYWwoa2V5LCB0eXBlW2ldLCB2YWwpKSB7XG4gICAgICAgIG9rID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvaykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihcbiAgICAgICAga2V5ICsgJyBtdXN0IGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nIHR5cGVzOiAnICsgdHlwZS5qb2luKCcsICcpXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIG9iamVjdFxuICBpZiAodHlwZSA9PT0gJ29iamVjdCcgJiYgKFxuICAgIHZhbCA9PT0gbnVsbCB8fFxuICAgIHR5cGVvZiB2YWwgIT09ICdvYmplY3QnXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgLy8gc3RyaW5nXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnICYmIHR5cGVvZiB2YWwgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG5cbiAgLy8gYm9vbGVhblxuICBlbHNlIGlmICh0eXBlID09PSAnYm9vbGVhbicgJiYgdHlwZW9mIHZhbCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIGJvb2xlYW4nKTtcbiAgfVxuXG4gIC8vIG51bWJlclxuICBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgdmFsICE9PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBudW1iZXInKTtcbiAgfVxuXG4gIC8vIGFycmF5XG4gIGVsc2UgaWYgKHR5cGUgPT09ICdhcnJheScgJiYgKFxuICAgIHZhbCA9PT0gbnVsbCB8fFxuICAgIHR5cGVvZiB2YWwgIT09ICdvYmplY3QnIHx8XG4gICAgdHlwZW9mIHZhbC5sZW5ndGggIT09ICdudW1iZXInXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gIH1cblxuICAvLyByZWdleFxuICBlbHNlIGlmICh0eXBlID09PSAncmVnZXhwJyAmJiB2YWwuY29uc3RydWN0b3IgIT09IFJlZ0V4cCkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSByZWdleHAnKTtcbiAgfVxuXG4gIC8vIGRhdGVcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ2RhdGUnICYmIHZhbC5jb25zdHJ1Y3RvciAhPT0gRGF0ZSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBkYXRlJyk7XG4gIH1cblxuICAvLyBlbWl0dGVyXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdlbWl0dGVyJyAmJiAoXG4gICAgdHlwZW9mIHZhbC5hZGRMaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwuZW1pdCAhPT0gJ2Z1bmN0aW9uJ1xuICApKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhbiBlbWl0dGVyJyk7XG4gIH1cblxuICAvLyBzdHJlYW1cbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmVhbScgJiYgKFxuICAgIHR5cGVvZiB2YWwub24gIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLnBpcGUgIT09ICdmdW5jdGlvbidcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBzdHJlYW0nKTtcbiAgfVxuXG4gIC8vIHJlYWQgc3RyZWFtXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdyZWFkLXN0cmVhbScgJiYgKFxuICAgIHR5cGVvZiB2YWwub24gIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLnBpcGUgIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLnJlYWQgIT09ICdmdW5jdGlvbidcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSByZWFkLXN0cmVhbScpO1xuICB9XG5cbiAgLy8gd3JpdGUgc3RyZWFtXG4gIGVsc2UgaWYgKHR5cGUgPT09ICd3cml0ZS1zdHJlYW0nICYmIChcbiAgICB0eXBlb2YgdmFsLm9uICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC5waXBlICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC53cml0ZSAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwuZW5kICE9PSAnZnVuY3Rpb24nXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgd3JpdGUtc3RyZWFtJyk7XG4gIH1cblxuICAvLyBmdW5jdGlvblxuICBlbHNlIGlmICh0eXBlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB2YWwgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuXG4gIC8vIG51bGxcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ251bGwnICYmIHZhbCAhPT0gbnVsbCkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBudWxsJyk7XG4gIH1cblxuICAvLyB1bmRlZmluZWRcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3VuZGVmaW5lZCcgJiYgdmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgdW5kZWZpbmVkJyk7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbmV4cG9ydHMuX3N0YWNrT2Zmc2V0ID0gMjtcblxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iXX0=
