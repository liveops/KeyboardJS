!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.keyboardJS=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// libs
var KeyboardJS = require('./lib/keyboard');
var Locale = require('./lib/locale');
var KeyCombo = require('./lib/key-combo');
var locales = {
  us: require('./locales/us')
};

var keyboardJS = new KeyboardJS();
keyboardJS.setLocale(locales.us);

exports = module.exports = keyboardJS;
exports.locales = locales;
exports.KeyboardJS = KeyboardJS;
exports.Locale = Locale;
exports.KeyCombo = KeyCombo;

},{"./lib/key-combo":2,"./lib/keyboard":3,"./lib/locale":4,"./locales/us":5}],2:[function(require,module,exports){

function KeyCombo(keyComboStr) {
  var self = this;

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
  var subComboStrs = KeyCombo._splitStr(keyComboStr, KeyCombo.comboDeliminator);
  var combo = [];
  for (var i = 0 ; i < subComboStrs.length; i += 1) {
    combo.push(KeyCombo._splitStr(subComboStrs[i], KeyCombo.keyDeliminator));
  }
  return combo;
};

KeyCombo.prototype.check = function(pressedKeyNames) {
  var self = this;

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

  if (typeof otherKeyCombo === 'string') {
    otherKeyCombo = new KeyCombo(otherKeyCombo);
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

},{}],3:[function(require,module,exports){
(function (global){

var Locale = require('./locale');
var KeyCombo = require('./key-combo');


function KeyboardJS(targetDocument, targetWindow) {
  var self = this;

  self.locale = null;
  self._currentContext = null;
  self._contexts = {};
  self._listeners = [];
  self._appliedListeners = [];
  self._locales = {};
  self._targetDocument = null;
  self._targetWindow = null;

  self.setContext('default');
  self.watch(targetDocument, targetWindow);
}

KeyboardJS.prototype.setLocale = function(localeName, localeBuilder) {
  var self = this;

  var locale = null;
  if (typeof localeName === 'string') {

    if (localeBuilder) {
      locale = new Locale(localeName);
      localeBuilder(locale);
    } else {
      locale = self._locales[localeName] || null;
    }
  } else {

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

  self.locale.pressKey(keyCode);
  self._applyBindings(event);
};

KeyboardJS.prototype.releaseKey = function(keyCode, event) {
  var self = this;

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
},{"./key-combo":2,"./locale":4}],4:[function(require,module,exports){

var KeyCombo = require('./key-combo');


function Locale(name) {
  var self = this;

  self.localeName = name;
  self.pressedKeys = [];
  self._appliedMacros = [];
  self._keyMap = {};
  self._macros = [];
}

Locale.prototype.bindKeyCode = function(keyCode, keyNames) {
  var self = this;

  if (typeof keyNames === 'string') {
    keyNames = [keyNames];
  }

  self._keyMap[keyCode] = keyNames;
};

Locale.prototype.bindMacro = function(keyComboStr, keyNames) {
  var self = this;

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

  var keyCodes = [];
  for (var keyCode in self._keyMap) {
    var index = self._keyMap[keyCode].indexOf(keyName);
    if (index > -1) { keyCodes.push(keyCode|0); }
  }
  return keyCodes;
};

Locale.prototype.getKeyNames = function(keyCode) {
  var self = this;
  return self._keyMap[keyCode] || [];
};

Locale.prototype.pressKey = function(keyCode) {
  var self = this;

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

},{"./key-combo":2}],5:[function(require,module,exports){

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

},{"../lib/locale":4}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9rZXktY29tYm8uanMiLCJsaWIva2V5Ym9hcmQuanMiLCJsaWIvbG9jYWxlLmpzIiwibG9jYWxlcy91cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4vLyBsaWJzXG52YXIgS2V5Ym9hcmRKUyA9IHJlcXVpcmUoJy4vbGliL2tleWJvYXJkJyk7XG52YXIgTG9jYWxlID0gcmVxdWlyZSgnLi9saWIvbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2xpYi9rZXktY29tYm8nKTtcbnZhciBsb2NhbGVzID0ge1xuICB1czogcmVxdWlyZSgnLi9sb2NhbGVzL3VzJylcbn07XG5cbnZhciBrZXlib2FyZEpTID0gbmV3IEtleWJvYXJkSlMoKTtcbmtleWJvYXJkSlMuc2V0TG9jYWxlKGxvY2FsZXMudXMpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBrZXlib2FyZEpTO1xuZXhwb3J0cy5sb2NhbGVzID0gbG9jYWxlcztcbmV4cG9ydHMuS2V5Ym9hcmRKUyA9IEtleWJvYXJkSlM7XG5leHBvcnRzLkxvY2FsZSA9IExvY2FsZTtcbmV4cG9ydHMuS2V5Q29tYm8gPSBLZXlDb21ibztcbiIsIlxuZnVuY3Rpb24gS2V5Q29tYm8oa2V5Q29tYm9TdHIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuc291cmNlU3RyID0ga2V5Q29tYm9TdHI7XG4gIHNlbGYuc3ViQ29tYm9zID0gS2V5Q29tYm8ucGFyc2VDb21ib1N0cihrZXlDb21ib1N0cik7XG4gIHNlbGYua2V5TmFtZXMgPSBzZWxmLnN1YkNvbWJvcy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgbmV4dFN1YkNvbWJvKSB7XG4gICAgcmV0dXJuIG1lbW8uY29uY2F0KG5leHRTdWJDb21ibyk7XG4gIH0pO1xufVxuXG5LZXlDb21iby5zZXF1ZW5jZURlbGltaW5hdG9yID0gJz4+JztcbktleUNvbWJvLmNvbWJvRGVsaW1pbmF0b3IgPSAnPic7XG5LZXlDb21iby5rZXlEZWxpbWluYXRvciA9ICcrJztcblxuS2V5Q29tYm8ucGFyc2VDb21ib1N0ciA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyKSB7XG4gIHZhciBzdWJDb21ib1N0cnMgPSBLZXlDb21iby5fc3BsaXRTdHIoa2V5Q29tYm9TdHIsIEtleUNvbWJvLmNvbWJvRGVsaW1pbmF0b3IpO1xuICB2YXIgY29tYm8gPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAgOyBpIDwgc3ViQ29tYm9TdHJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29tYm8ucHVzaChLZXlDb21iby5fc3BsaXRTdHIoc3ViQ29tYm9TdHJzW2ldLCBLZXlDb21iby5rZXlEZWxpbWluYXRvcikpO1xuICB9XG4gIHJldHVybiBjb21ibztcbn07XG5cbktleUNvbWJvLnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uKHByZXNzZWRLZXlOYW1lcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gc2VsZi5fY2hlY2tTdWJDb21ibyhcbiAgICAgIHNlbGYuc3ViQ29tYm9zW2ldLFxuICAgICAgc3RhcnRpbmdLZXlOYW1lSW5kZXgsXG4gICAgICBwcmVzc2VkS2V5TmFtZXNcbiAgICApO1xuICAgIGlmIChzdGFydGluZ0tleU5hbWVJbmRleCA9PT0gLTEpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuaXNFcXVhbCA9IGZ1bmN0aW9uKG90aGVyS2V5Q29tYm8pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Ygb3RoZXJLZXlDb21ibyA9PT0gJ3N0cmluZycpIHtcbiAgICBvdGhlcktleUNvbWJvID0gbmV3IEtleUNvbWJvKG90aGVyS2V5Q29tYm8pO1xuICB9XG5cbiAgaWYgKHNlbGYuc3ViQ29tYm9zLmxlbmd0aCAhPT0gb3RoZXJLZXlDb21iby5zdWJDb21ib3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5zdWJDb21ib3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoc2VsZi5zdWJDb21ib3NbaV0ubGVuZ3RoICE9PSBvdGhlcktleUNvbWJvLnN1YkNvbWJvc1tpXS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuc3ViQ29tYm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIHN1YkNvbWJvID0gc2VsZi5zdWJDb21ib3NbaV07XG4gICAgdmFyIG90aGVyU3ViQ29tYm8gPSBvdGhlcktleUNvbWJvLnN1YkNvbWJvc1tpXS5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN1YkNvbWJvLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2pdO1xuICAgICAgdmFyIGluZGV4ID0gb3RoZXJTdWJDb21iby5pbmRleE9mKGtleU5hbWUpO1xuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgb3RoZXJTdWJDb21iby5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3RoZXJTdWJDb21iby5sZW5ndGggIT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbktleUNvbWJvLl9zcGxpdFN0ciA9IGZ1bmN0aW9uKHN0ciwgZGVsaW1pbmF0b3IpIHtcbiAgdmFyIHMgPSBzdHI7XG4gIHZhciBkID0gZGVsaW1pbmF0b3I7XG4gIHZhciBjID0gJyc7XG4gIHZhciBjYSA9IFtdO1xuXG4gIGZvciAodmFyIGNpID0gMDsgY2kgPCBzLmxlbmd0aDsgY2kgKz0gMSkge1xuICAgIGlmIChjaSA+IDAgJiYgc1tjaV0gPT09IGQgJiYgc1tjaSAtIDFdICE9PSAnXFxcXCcpIHtcbiAgICAgIGNhLnB1c2goYy50cmltKCkpO1xuICAgICAgYyA9ICcnO1xuICAgICAgY2kgKz0gMTtcbiAgICB9XG4gICAgYyArPSBzW2NpXTtcbiAgfVxuICBpZiAoYykgeyBjYS5wdXNoKGMudHJpbSgpKTsgfVxuXG4gIHJldHVybiBjYTtcbn07XG5cbktleUNvbWJvLnByb3RvdHlwZS5fY2hlY2tTdWJDb21ibyA9IGZ1bmN0aW9uKFxuICBzdWJDb21ibyxcbiAgc3RhcnRpbmdLZXlOYW1lSW5kZXgsXG4gIHByZXNzZWRLZXlOYW1lc1xuKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzdWJDb21ibyA9IHN1YkNvbWJvLnNsaWNlKDApO1xuICBwcmVzc2VkS2V5TmFtZXMgPSBwcmVzc2VkS2V5TmFtZXMuc2xpY2Uoc3RhcnRpbmdLZXlOYW1lSW5kZXgpO1xuXG4gIHZhciBlbmRJbmRleCA9IHN0YXJ0aW5nS2V5TmFtZUluZGV4O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YkNvbWJvLmxlbmd0aDsgaSArPSAxKSB7XG5cbiAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2ldO1xuICAgIGlmIChrZXlOYW1lWzBdID09PSAnXFxcXCcpIHtcbiAgICAgIHZhciBlc2NhcGVkS2V5TmFtZSA9IGtleU5hbWUuc2xpY2UoMSk7XG4gICAgICBpZiAoXG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yIHx8XG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5rZXlEZWxpbWluYXRvclxuICAgICAgKSB7XG4gICAgICAgIGtleU5hbWUgPSBlc2NhcGVkS2V5TmFtZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBwcmVzc2VkS2V5TmFtZXMuaW5kZXhPZihrZXlOYW1lKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgc3ViQ29tYm8uc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgICAgaWYgKGluZGV4ID4gZW5kSW5kZXgpIHtcbiAgICAgICAgZW5kSW5kZXggPSBpbmRleDtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJDb21iby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGVuZEluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Q29tYm87XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cbnZhciBMb2NhbGUgPSByZXF1aXJlKCcuL2xvY2FsZScpO1xudmFyIEtleUNvbWJvID0gcmVxdWlyZSgnLi9rZXktY29tYm8nKTtcblxuXG5mdW5jdGlvbiBLZXlib2FyZEpTKHRhcmdldERvY3VtZW50LCB0YXJnZXRXaW5kb3cpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYubG9jYWxlID0gbnVsbDtcbiAgc2VsZi5fY3VycmVudENvbnRleHQgPSBudWxsO1xuICBzZWxmLl9jb250ZXh0cyA9IHt9O1xuICBzZWxmLl9saXN0ZW5lcnMgPSBbXTtcbiAgc2VsZi5fYXBwbGllZExpc3RlbmVycyA9IFtdO1xuICBzZWxmLl9sb2NhbGVzID0ge307XG4gIHNlbGYuX3RhcmdldERvY3VtZW50ID0gbnVsbDtcbiAgc2VsZi5fdGFyZ2V0V2luZG93ID0gbnVsbDtcblxuICBzZWxmLnNldENvbnRleHQoJ2RlZmF1bHQnKTtcbiAgc2VsZi53YXRjaCh0YXJnZXREb2N1bWVudCwgdGFyZ2V0V2luZG93KTtcbn1cblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc2V0TG9jYWxlID0gZnVuY3Rpb24obG9jYWxlTmFtZSwgbG9jYWxlQnVpbGRlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGxvY2FsZSA9IG51bGw7XG4gIGlmICh0eXBlb2YgbG9jYWxlTmFtZSA9PT0gJ3N0cmluZycpIHtcblxuICAgIGlmIChsb2NhbGVCdWlsZGVyKSB7XG4gICAgICBsb2NhbGUgPSBuZXcgTG9jYWxlKGxvY2FsZU5hbWUpO1xuICAgICAgbG9jYWxlQnVpbGRlcihsb2NhbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2NhbGUgPSBzZWxmLl9sb2NhbGVzW2xvY2FsZU5hbWVdIHx8IG51bGw7XG4gICAgfVxuICB9IGVsc2Uge1xuXG4gICAgbG9jYWxlID0gbG9jYWxlTmFtZTtcbiAgICBsb2NhbGVOYW1lID0gbG9jYWxlLmxvY2FsZU5hbWU7XG4gIH1cblxuICBzZWxmLmxvY2FsZSA9IGxvY2FsZTtcbiAgc2VsZi5fbG9jYWxlc1tsb2NhbGVOYW1lXSA9IGxvY2FsZTtcbiAgaWYgKGxvY2FsZSkge1xuICAgIHNlbGYubG9jYWxlLnByZXNzZWRLZXlzID0gbG9jYWxlLnByZXNzZWRLZXlzO1xuICB9XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5nZXRMb2NhbGUgPSBmdW5jdGlvbihsb2NhbE5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBsb2NhbE5hbWUgfHwgKGxvY2FsTmFtZSA9IHNlbGYubG9jYWxlLmxvY2FsZU5hbWUpO1xuICByZXR1cm4gc2VsZi5fbG9jYWxlc1tsb2NhbE5hbWVdIHx8IG51bGw7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIsIHByZXNzSGFuZGxlciwgcmVsZWFzZUhhbmRsZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29tYm9TdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgc2VsZi5fbGlzdGVuZXJzLnB1c2goe1xuICAgICAga2V5Q29tYm86IG5ldyBLZXlDb21ibyhrZXlDb21ib1N0ciksXG4gICAgICBwcmVzc0hhbmRsZXI6IHByZXNzSGFuZGxlciB8fCBudWxsLFxuICAgICAgcmVsZWFzZUhhbmRsZXI6IHJlbGVhc2VIYW5kbGVyIHx8IG51bGwsXG4gICAgICBwcmV2ZW50UmVwZWF0OiBmYWxzZVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29tYm9TdHIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYuYmluZChrZXlDb21ib1N0cltpXSwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcik7XG4gICAgfVxuICB9XG59O1xuS2V5Ym9hcmRKUy5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBLZXlib2FyZEpTLnByb3RvdHlwZS5iaW5kO1xuS2V5Ym9hcmRKUy5wcm90b3R5cGUub24gPSBLZXlib2FyZEpTLnByb3RvdHlwZS5iaW5kO1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbihrZXlDb21ib1N0ciwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKHR5cGVvZiBrZXlDb21ib1N0ciA9PT0gJ3N0cmluZycpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2xpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdmFyIGxpc3RlbmVyID0gc2VsZi5fbGlzdGVuZXJzW2ldO1xuXG4gICAgICB2YXIgY29tYm9NYXRjaGVzID0gbGlzdGVuZXIua2V5Q29tYm8uaXNFcXVhbChrZXlDb21ib1N0cik7XG4gICAgICB2YXIgcHJlc3NIYW5kbGVyTWF0Y2hlcyA9ICFwcmVzc0hhbmRsZXIgfHxcbiAgICAgICAgcHJlc3NIYW5kbGVyID09PSBsaXN0ZW5lci5wcmVzc0hhbmRsZXI7XG4gICAgICB2YXIgcmVsZWFzZUhhbmRsZXJNYXRjaGVzID0gbGlzdGVuZXIucmVsZWFzZUhhbmRsZXIgPT09IG51bGwgfHxcbiAgICAgICAgcmVsZWFzZUhhbmRsZXIgPT09IGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyO1xuXG4gICAgICBpZiAoY29tYm9NYXRjaGVzICYmIHByZXNzSGFuZGxlck1hdGNoZXMgJiYgcmVsZWFzZUhhbmRsZXJNYXRjaGVzKSB7XG4gICAgICAgIHNlbGYuX2xpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGkgLT0gMTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb21ib1N0ci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5iaW5kKGtleUNvbWJvU3RyW2ldLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKTtcbiAgICB9XG4gIH1cbn07XG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEtleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZDtcbktleWJvYXJkSlMucHJvdG90eXBlLm9mZiA9IEtleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZDtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc2V0Q29udGV4dCA9IGZ1bmN0aW9uKGNvbnRleHROYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYubG9jYWxlKSB7XG4gICAgc2VsZi5yZWxlYXNlQWxsS2V5cygpO1xuICB9XG4gIGlmICghc2VsZi5fY29udGV4dHNbY29udGV4dE5hbWVdKSB7XG4gICAgc2VsZi5fY29udGV4dHNbY29udGV4dE5hbWVdID0gW107XG4gIH1cbiAgc2VsZi5fbGlzdGVuZXJzID0gc2VsZi5fY29udGV4dHNbY29udGV4dE5hbWVdO1xuICBzZWxmLl9jdXJyZW50Q29udGV4dCA9IGNvbnRleHROYW1lO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBzZWxmLl9jdXJyZW50Q29udGV4dDtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24odGFyZ2V0RG9jdW1lbnQsIHRhcmdldFdpbmRvdykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5zdG9wKCk7XG5cbiAgaWYgKHRhcmdldERvY3VtZW50ICYmIHRhcmdldERvY3VtZW50LmRvY3VtZW50ICYmICF0YXJnZXRXaW5kb3cpIHtcbiAgICB0YXJnZXRXaW5kb3cgPSB0YXJnZXREb2N1bWVudDtcbiAgICB0YXJnZXREb2N1bWVudCA9IG51bGw7XG4gIH1cbiAgaWYgKCF0YXJnZXRXaW5kb3cpIHtcbiAgICB0YXJnZXRXaW5kb3cgPSBnbG9iYWwud2luZG93O1xuICB9XG4gIGlmICh0YXJnZXRXaW5kb3cgJiYgIXRhcmdldERvY3VtZW50KSB7XG4gICAgdGFyZ2V0RG9jdW1lbnQgPSB0YXJnZXRXaW5kb3cuZG9jdW1lbnQ7XG4gIH1cblxuICBpZiAodGFyZ2V0RG9jdW1lbnQgJiYgdGFyZ2V0V2luZG93KSB7XG4gICAgc2VsZi5faXNNb2Rlcm5Ccm93c2VyID0gISF0YXJnZXRXaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcjtcblxuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXREb2N1bWVudCwgJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5wcmVzc0tleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fYmluZEV2ZW50KHRhcmdldERvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAnZm9jdXMnLCBzZWxmLnJlbGVhc2VBbGxLZXlzLmJpbmQoc2VsZikpO1xuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXRXaW5kb3csICdibHVyJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcblxuICAgIHNlbGYuX3RhcmdldERvY3VtZW50ID0gdGFyZ2V0RG9jdW1lbnQ7XG4gICAgc2VsZi5fdGFyZ2V0V2luZG93ID0gdGFyZ2V0V2luZG93O1xuICB9XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuX3RhcmdldERvY3VtZW50KSB7XG4gICAgc2VsZi5fdW5iaW5kRXZlbnQoc2VsZi5fdGFyZ2V0RG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoZXZlbnQua2V5Q29kZSwgZXZlbnQpO1xuICAgIH0pO1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldERvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl90YXJnZXREb2N1bWVudCA9IG51bGw7XG4gIH1cbiAgaWYgKHNlbGYuX3RhcmdldFdpbmRvdykge1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldFdpbmRvdywgJ2ZvY3VzJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXRXaW5kb3csICdibHVyJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl90YXJnZXRXaW5kb3cgPSBudWxsO1xuICB9XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5wcmVzc0tleSA9IGZ1bmN0aW9uKGtleUNvZGUsIGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLmxvY2FsZS5wcmVzc0tleShrZXlDb2RlKTtcbiAgc2VsZi5fYXBwbHlCaW5kaW5ncyhldmVudCk7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZWxlYXNlS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSwgZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYubG9jYWxlLnJlbGVhc2VLZXkoa2V5Q29kZSk7XG4gIHNlbGYuX2NsZWFyQmluZGluZ3MoZXZlbnQpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVsZWFzZUFsbEtleXMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLmxvY2FsZS5wcmVzc2VkS2V5cy5sZW5ndGggPSAwO1xuICBzZWxmLl9jbGVhckJpbmRpbmdzKCk7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYucmVsZWFzZUFsbEtleXMoKTtcbiAgc2VsZi5fbGlzdGVuZXJzLmxlbmd0aCA9IDA7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5fYmluZEV2ZW50ID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlciwgZmFsc2UpIDpcbiAgICB0YXJnZXRFbGVtZW50LmF0dGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGhhbmRsZXIpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX3VuYmluZEV2ZW50ID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlciwgZmFsc2UpOlxuICAgIHRhcmdldEVsZW1lbnQuZGV0YWNoRXZlbnQoJ29uJyArIGV2ZW50TmFtZSwgaGFuZGxlcik7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5fZ2V0R3JvdXBlZExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsaXN0ZW5lckdyb3VwcyA9IFtdO1xuICB2YXIgbGlzdGVuZXJHcm91cE1hcCA9IFtdO1xuICBzZWxmLl9saXN0ZW5lcnMuc2xpY2UoMCkuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEua2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoID4gYi5rZXlDb21iby5rZXlOYW1lcy5sZW5ndGg7XG4gIH0pLmZvckVhY2goZnVuY3Rpb24obCkge1xuICAgIHZhciBtYXBJbmRleCA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJHcm91cE1hcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKGxpc3RlbmVyR3JvdXBNYXBbaV0uaXNFcXVhbChsLmtleUNvbWJvKSkge1xuICAgICAgICBtYXBJbmRleCA9IGk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtYXBJbmRleCA9PT0gLTEpIHtcbiAgICAgIG1hcEluZGV4ID0gbGlzdGVuZXJHcm91cE1hcC5sZW5ndGg7XG4gICAgICBsaXN0ZW5lckdyb3VwTWFwLnB1c2gobC5rZXlDb21ibyk7XG4gICAgfVxuICAgIGlmICghbGlzdGVuZXJHcm91cHNbbWFwSW5kZXhdKSB7XG4gICAgICBsaXN0ZW5lckdyb3Vwc1ttYXBJbmRleF0gPSBbXTtcbiAgICB9XG4gICAgbGlzdGVuZXJHcm91cHNbbWFwSW5kZXhdLnB1c2gobCk7XG4gIH0pO1xuICByZXR1cm4gbGlzdGVuZXJHcm91cHM7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5fYXBwbHlCaW5kaW5ncyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBldmVudCB8fCAoZXZlbnQgPSB7fSk7XG4gIHZhciBwcmV2ZW50UmVwZWF0ID0gZmFsc2U7XG4gIGV2ZW50LnByZXZlbnRSZXBlYXQgPSBmdW5jdGlvbigpIHsgcHJldmVudFJlcGVhdCA9IHRydWU7IH07XG5cbiAgdmFyIHByZXNzZWRLZXlzID0gc2VsZi5sb2NhbGUucHJlc3NlZEtleXMuc2xpY2UoMCk7XG4gIHZhciBsaXN0ZW5lckdyb3VwcyA9IHNlbGYuX2dldEdyb3VwZWRMaXN0ZW5lcnMoKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVyR3JvdXBzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IGxpc3RlbmVyR3JvdXBzW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IGxpc3RlbmVyc1swXS5rZXlDb21ibztcblxuICAgIGlmIChrZXlDb21iby5jaGVjayhwcmVzc2VkS2V5cykpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGlzdGVuZXJzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lciA9IGxpc3RlbmVyc1tqXTtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBsaXN0ZW5lci5wcmVzc0hhbmRsZXI7XG4gICAgICAgIGlmIChoYW5kbGVyICYmICFsaXN0ZW5lci5wcmV2ZW50UmVwZWF0KSB7XG4gICAgICAgICAgaGFuZGxlci5jYWxsKHNlbGYsIGV2ZW50KTtcbiAgICAgICAgICBpZiAocHJldmVudFJlcGVhdCkge1xuICAgICAgICAgICAgbGlzdGVuZXIucHJldmVudFJlcGVhdCA9IHByZXZlbnRSZXBlYXQ7XG4gICAgICAgICAgICBwcmV2ZW50UmVwZWF0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcikge1xuICAgICAgICAgIGlmIChzZWxmLl9hcHBsaWVkTGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpID09PSAtMSkge1xuICAgICAgICAgICAgc2VsZi5fYXBwbGllZExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcHJlc3NlZEtleXMuaW5kZXhPZihrZXlDb21iby5rZXlOYW1lc1tqXSk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICBwcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgIGogLT0gMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2NsZWFyQmluZGluZ3MgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZXZlbnQgfHwgKGV2ZW50ID0ge30pO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fYXBwbGllZExpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBsaXN0ZW5lciA9IHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnNbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbGlzdGVuZXIua2V5Q29tYm87XG4gICAgdmFyIGhhbmRsZXIgPSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcjtcbiAgICBpZiAoIWtleUNvbWJvLmNoZWNrKHNlbGYubG9jYWxlLnByZXNzZWRLZXlzKSkge1xuICAgICAgbGlzdGVuZXIucHJldmVudFJlcGVhdCA9IGZhbHNlO1xuICAgICAgaGFuZGxlci5jYWxsKHNlbGYsIGV2ZW50KTtcbiAgICAgIHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlib2FyZEpTO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcbnZhciBLZXlDb21ibyA9IHJlcXVpcmUoJy4va2V5LWNvbWJvJyk7XG5cblxuZnVuY3Rpb24gTG9jYWxlKG5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYubG9jYWxlTmFtZSA9IG5hbWU7XG4gIHNlbGYucHJlc3NlZEtleXMgPSBbXTtcbiAgc2VsZi5fYXBwbGllZE1hY3JvcyA9IFtdO1xuICBzZWxmLl9rZXlNYXAgPSB7fTtcbiAgc2VsZi5fbWFjcm9zID0gW107XG59XG5cbkxvY2FsZS5wcm90b3R5cGUuYmluZEtleUNvZGUgPSBmdW5jdGlvbihrZXlDb2RlLCBrZXlOYW1lcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICBrZXlOYW1lcyA9IFtrZXlOYW1lc107XG4gIH1cblxuICBzZWxmLl9rZXlNYXBba2V5Q29kZV0gPSBrZXlOYW1lcztcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuYmluZE1hY3JvID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIsIGtleU5hbWVzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnc3RyaW5nJykge1xuICAgIGtleU5hbWVzID0gWyBrZXlOYW1lcyBdO1xuICB9XG5cbiAgdmFyIG1hY3JvID0ge1xuICAgIGtleUNvbWJvOiBuZXcgS2V5Q29tYm8oa2V5Q29tYm9TdHIpLFxuICAgIGtleU5hbWVzOiBudWxsLFxuICAgIGhhbmRsZXI6IG51bGxcbiAgfTtcblxuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgbWFjcm8uaGFuZGxlciA9IGtleU5hbWVzO1xuICB9IGVsc2Uge1xuICAgIG1hY3JvLmtleU5hbWVzID0ga2V5TmFtZXM7XG4gIH1cblxuICBzZWxmLl9tYWNyb3MucHVzaChtYWNybyk7XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLmdldEtleUNvZGVzID0gZnVuY3Rpb24oa2V5TmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGtleUNvZGVzID0gW107XG4gIGZvciAodmFyIGtleUNvZGUgaW4gc2VsZi5fa2V5TWFwKSB7XG4gICAgdmFyIGluZGV4ID0gc2VsZi5fa2V5TWFwW2tleUNvZGVdLmluZGV4T2Yoa2V5TmFtZSk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHsga2V5Q29kZXMucHVzaChrZXlDb2RlfDApOyB9XG4gIH1cbiAgcmV0dXJuIGtleUNvZGVzO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5nZXRLZXlOYW1lcyA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gc2VsZi5fa2V5TWFwW2tleUNvZGVdIHx8IFtdO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5wcmVzc0tleSA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIga2V5Q29kZXMgPSBzZWxmLmdldEtleUNvZGVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29kZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoa2V5Q29kZXNbaV0pO1xuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHZhciBrZXlOYW1lcyA9IHNlbGYuZ2V0S2V5TmFtZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlOYW1lcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tpXSkgPT09IC0xKSB7XG4gICAgICAgIHNlbGYucHJlc3NlZEtleXMucHVzaChrZXlOYW1lc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZi5fYXBwbHlNYWNyb3MoKTtcbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5yZWxlYXNlS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKHR5cGVvZiBrZXlDb2RlID09PSAnc3RyaW5nJykge1xuICAgIHZhciBrZXlDb2RlcyA9IHNlbGYuZ2V0S2V5Q29kZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB2YXIga2V5TmFtZXMgPSBzZWxmLmdldEtleU5hbWVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5TmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBpbmRleCA9IHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tpXSk7XG4gICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZi5fY2xlYXJNYWNyb3MoKTtcbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5fYXBwbHlNYWNyb3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBtYWNyb3MgPSBzZWxmLl9tYWNyb3Muc2xpY2UoMCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbWFjcm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIG1hY3JvID0gbWFjcm9zW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IG1hY3JvLmtleUNvbWJvO1xuICAgIHZhciBrZXlOYW1lcyA9IG1hY3JvLmtleU5hbWVzO1xuICAgIGlmIChrZXlDb21iby5jaGVjayhzZWxmLnByZXNzZWRLZXlzKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICBpZiAoc2VsZi5wcmVzc2VkS2V5cy5pbmRleE9mKGtleU5hbWVzW2pdKSA9PT0gLTEpIHtcbiAgICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnB1c2goa2V5TmFtZXNbal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWxmLl9hcHBsaWVkTWFjcm9zLnB1c2gobWFjcm8pO1xuICAgIH1cbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5fY2xlYXJNYWNyb3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fYXBwbGllZE1hY3Jvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBtYWNybyA9IHNlbGYuX2FwcGxpZWRNYWNyb3NbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbWFjcm8ua2V5Q29tYm87XG4gICAgdmFyIGtleU5hbWVzID0gbWFjcm8ua2V5TmFtZXM7XG4gICAgaWYgKCFrZXlDb21iby5jaGVjayhzZWxmLnByZXNzZWRLZXlzKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICB2YXIgaW5kZXggPSBzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbal0pO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgIHNlbGYucHJlc3NlZEtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZi5fYXBwbGllZE1hY3Jvcy5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgfVxuICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlO1xuIiwiXG4vLyBtb2R1bGVzXG52YXIgTG9jYWxlID0gcmVxdWlyZSgnLi4vbGliL2xvY2FsZScpO1xuXG5cbi8vIGNyZWF0ZSB0aGUgbG9jYWxlXG52YXIgbG9jYWxlID0gbmV3IExvY2FsZSgndXMnKTtcblxuLy8gZ2VuZXJhbFxubG9jYWxlLmJpbmRLZXlDb2RlKDMsIFsgJ2NhbmNlbCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOCwgWyAnYmFja3NwYWNlJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5LCBbICd0YWInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyLCBbICdjbGVhcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTMsIFsgJ2VudGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNiwgWyAnc2hpZnQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE3LCBbICdjdHJsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOCwgWyAnYWx0JywgJ21lbnUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5LCBbICdwYXVzZScsICdicmVhaycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjAsIFsgJ2NhcHNsb2NrJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyNywgWyAnZXNjYXBlJywgJ2VzYycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzIsIFsgJ3NwYWNlJywgJ3NwYWNlYmFyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzMywgWyAncGFnZXVwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNCwgWyAncGFnZWRvd24nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM1LCBbICdlbmQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM2LCBbICdob21lJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNywgWyAnbGVmdCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzgsIFsgJ3VwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzOSwgWyAncmlnaHQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQwLCBbICdkb3duJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MSwgWyAnc2VsZWN0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MiwgWyAncHJpbnRzY3JlZW4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQzLCBbICdleGVjdXRlJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NCwgWyAnc25hcHNob3QnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ1LCBbICdpbnNlcnQnLCAnaW5zJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NiwgWyAnZGVsZXRlJywgJ2RlbCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDcsIFsgJ2hlbHAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDkxLCBbICdjb21tYW5kJywgJ3dpbmRvd3MnLCAnd2luJywgJ3N1cGVyJywgJ2xlZnRjb21tYW5kJywgJ2xlZnR3aW5kb3dzJywgJ2xlZnR3aW4nLCAnbGVmdHN1cGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5MiwgWyAnY29tbWFuZCcsICd3aW5kb3dzJywgJ3dpbicsICdzdXBlcicsICdyaWdodGNvbW1hbmQnLCAncmlnaHR3aW5kb3dzJywgJ3JpZ2h0d2luJywgJ3JpZ2h0c3VwZXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE0NSwgWyAnc2Nyb2xsbG9jaycsICdzY3JvbGwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4NiwgWyAnc2VtaWNvbG9uJywgJzsnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4NywgWyAnZXF1YWwnLCAnZXF1YWxzaWduJywgJz0nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4OCwgWyAnY29tbWEnLCAnLCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTg5LCBbICdkYXNoJywgJy0nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MCwgWyAncGVyaW9kJywgJy4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MSwgWyAnc2xhc2gnLCAnZm9yd2FyZHNsYXNoJywgJy8nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE5MiwgWyAnZ3JhdmVhY2NlbnQnLCAnYCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjE5LCBbICdvcGVuYnJhY2tldCcsICdbJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjAsIFsgJ2JhY2tzbGFzaCcsICdcXFxcJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjEsIFsgJ2Nsb3NlYnJhY2tldCcsICddJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMjIsIFsgJ2Fwb3N0cm9waGUnLCAnXFwnJyBdKTtcblxuLy8gMC05XG5sb2NhbGUuYmluZEtleUNvZGUoNDgsIFsgJ3plcm8nLCAnMCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDksIFsgJ29uZScsICcxJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MCwgWyAndHdvJywgJzInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDUxLCBbICd0aHJlZScsICczJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MiwgWyAnZm91cicsICc0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MywgWyAnZml2ZScsICc1JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NCwgWyAnc2l4JywgJzYnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDU1LCBbICdzZXZlbicsICc3JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NiwgWyAnZWlnaHQnLCAnOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTcsIFsgJ25pbmUnLCAnOScgXSk7XG5cbi8vIG51bXBhZFxubG9jYWxlLmJpbmRLZXlDb2RlKDk2LCBbICdudW16ZXJvJywgJ251bTAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDk3LCBbICdudW1vbmUnLCAnbnVtMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTgsIFsgJ251bXR3bycsICdudW0yJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5OSwgWyAnbnVtdGhyZWUnLCAnbnVtMycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAwLCBbICdudW1mb3VyJywgJ251bTQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwMSwgWyAnbnVtZml2ZScsICdudW01JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDIsIFsgJ251bXNpeCcsICdudW02JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDMsIFsgJ251bXNldmVuJywgJ251bTcnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNCwgWyAnbnVtZWlnaHQnLCAnbnVtOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA1LCBbICdudW1uaW5lJywgJ251bTknIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNiwgWyAnbnVtbXVsdGlwbHknLCAnbnVtKicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA3LCBbICdudW1hZGQnLCAnbnVtKycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA4LCBbICdudW1lbnRlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA5LCBbICdudW1zdWJ0cmFjdCcsICdudW0tJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTAsIFsgJ251bWRlY2ltYWwnLCAnbnVtLicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTExLCBbICdudW1kaXZpZGUnLCAnbnVtLycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTQ0LCBbICdudW1sb2NrJywgJ251bScgXSk7XG5cbi8vIGZ1bmN0aW9uIGtleXNcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTIsIFsgJ2YxJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTMsIFsgJ2YyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTQsIFsgJ2YzJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTUsIFsgJ2Y0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTYsIFsgJ2Y1JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTcsIFsgJ2Y2JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTgsIFsgJ2Y3JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTksIFsgJ2Y4JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjAsIFsgJ2Y5JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjEsIFsgJ2YxMCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIyLCBbICdmMTEnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyMywgWyAnZjEyJyBdKTtcblxuLy8gc2Vjb25kYXJ5IGtleSBzeW1ib2xzXG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIGAnLCBbICd0aWxkZScsICd+JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMScsIFsgJ2V4Y2xhbWF0aW9uJywgJ2V4Y2xhbWF0aW9ucG9pbnQnLCAnIScgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDInLCBbICdhdCcsICdAJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMycsIFsgJ251bWJlcicsICcjJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNCcsIFsgJ2RvbGxhcicsICdkb2xsYXJzJywgJ2RvbGxhcnNpZ24nLCAnJCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDUnLCBbICdwZXJjZW50JywgJyUnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA2JywgWyAnY2FyZXQnLCAnXicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDcnLCBbICdhbXBlcnNhbmQnLCAnYW5kJywgJyYnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA4JywgWyAnYXN0ZXJpc2snLCAnKicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDknLCBbICdvcGVucGFyZW4nLCAnKCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDAnLCBbICdjbG9zZXBhcmVuJywgJyknIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAtJywgWyAndW5kZXJzY29yZScsICdfJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgPScsIFsgJ3BsdXMnLCAnKycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIFsnLCBbICdvcGVuY3VybHlicmFjZScsICdvcGVuY3VybHlicmFja2V0JywgJ3snIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBdJywgWyAnY2xvc2VjdXJseWJyYWNlJywgJ2Nsb3NlY3VybHlicmFja2V0JywgJ30nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBcXFxcJywgWyAndmVydGljYWxiYXInLCAnfCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDsnLCBbICdjb2xvbicsICc6JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXFwnJywgWyAncXVvdGF0aW9ubWFyaycsICdcXCcnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAhLCcsIFsgJ29wZW5hbmdsZWJyYWNrZXQnLCAnPCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIC4nLCBbICdjbG9zZWFuZ2xlYnJhY2tldCcsICc+JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgLycsIFsgJ3F1ZXN0aW9ubWFyaycsICc/JyBdKTtcblxuLy9hLXogYW5kIEEtWlxuZm9yICh2YXIga2V5Q29kZSA9IDY1OyBrZXlDb2RlIDw9IDkwOyBrZXlDb2RlICs9IDEpIHtcbiAgdmFyIGtleU5hbWUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUgKyAzMik7XG4gIHZhciBjYXBpdGFsS2V5TmFtZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSk7XG5cdGxvY2FsZS5iaW5kS2V5Q29kZShrZXlDb2RlLCBrZXlOYW1lKTtcblx0bG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAnICsga2V5TmFtZSwgY2FwaXRhbEtleU5hbWUpO1xuXHRsb2NhbGUuYmluZE1hY3JvKCdjYXBzbG9jayArICcgKyBrZXlOYW1lLCBjYXBpdGFsS2V5TmFtZSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBsb2NhbGU7XG4iXX0=
