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


function KeyboardJS(targetWindow) {
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
  self.watch();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9rZXktY29tYm8uanMiLCJsaWIva2V5Ym9hcmQuanMiLCJsaWIvbG9jYWxlLmpzIiwibG9jYWxlcy91cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vIGxpYnNcbnZhciBLZXlib2FyZEpTID0gcmVxdWlyZSgnLi9saWIva2V5Ym9hcmQnKTtcbnZhciBMb2NhbGUgPSByZXF1aXJlKCcuL2xpYi9sb2NhbGUnKTtcbnZhciBLZXlDb21ibyA9IHJlcXVpcmUoJy4vbGliL2tleS1jb21ibycpO1xudmFyIHVzTG9jYWxlID0gcmVxdWlyZSgnLi9sb2NhbGVzL3VzJyk7XG5cbnZhciBrZXlib2FyZEpTID0gbmV3IEtleWJvYXJkSlMoKTtcbmtleWJvYXJkSlMuc2V0TG9jYWxlKHVzTG9jYWxlKTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0ga2V5Ym9hcmRKUztcbmV4cG9ydHMuS2V5Ym9hcmRKUyA9IEtleWJvYXJkSlM7XG5leHBvcnRzLkxvY2FsZSA9IExvY2FsZTtcbmV4cG9ydHMuS2V5Q29tYm8gPSBLZXlDb21ibztcbiIsIlxuZnVuY3Rpb24gS2V5Q29tYm8oa2V5Q29tYm9TdHIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuc291cmNlU3RyID0ga2V5Q29tYm9TdHI7XG4gIHNlbGYuc3ViQ29tYm9zID0gS2V5Q29tYm8ucGFyc2VDb21ib1N0cihrZXlDb21ib1N0cik7XG4gIHNlbGYua2V5TmFtZXMgPSBzZWxmLnN1YkNvbWJvcy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgbmV4dFN1YkNvbWJvKSB7XG4gICAgcmV0dXJuIG1lbW8uY29uY2F0KG5leHRTdWJDb21ibyk7XG4gIH0pO1xufVxuXG5LZXlDb21iby5zZXF1ZW5jZURlbGltaW5hdG9yID0gJz4+JztcbktleUNvbWJvLmNvbWJvRGVsaW1pbmF0b3IgPSAnPic7XG5LZXlDb21iby5rZXlEZWxpbWluYXRvciA9ICcrJztcblxuS2V5Q29tYm8ucGFyc2VDb21ib1N0ciA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyKSB7XG4gIHZhciBzdWJDb21ib1N0cnMgPSBLZXlDb21iby5fc3BsaXRTdHIoa2V5Q29tYm9TdHIsIEtleUNvbWJvLmNvbWJvRGVsaW1pbmF0b3IpO1xuICB2YXIgY29tYm8gPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAgOyBpIDwgc3ViQ29tYm9TdHJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29tYm8ucHVzaChLZXlDb21iby5fc3BsaXRTdHIoc3ViQ29tYm9TdHJzW2ldLCBLZXlDb21iby5rZXlEZWxpbWluYXRvcikpO1xuICB9XG4gIHJldHVybiBjb21ibztcbn07XG5cbktleUNvbWJvLnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uKHByZXNzZWRLZXlOYW1lcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gc2VsZi5fY2hlY2tTdWJDb21ibyhcbiAgICAgIHNlbGYuc3ViQ29tYm9zW2ldLFxuICAgICAgc3RhcnRpbmdLZXlOYW1lSW5kZXgsXG4gICAgICBwcmVzc2VkS2V5TmFtZXNcbiAgICApO1xuICAgIGlmIChzdGFydGluZ0tleU5hbWVJbmRleCA9PT0gLTEpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuaXNFcXVhbCA9IGZ1bmN0aW9uKG90aGVyS2V5Q29tYm8pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Ygb3RoZXJLZXlDb21ibyA9PT0gJ3N0cmluZycpIHtcbiAgICBvdGhlcktleUNvbWJvID0gbmV3IEtleUNvbWJvKG90aGVyS2V5Q29tYm8pO1xuICB9XG5cbiAgaWYgKHNlbGYuc3ViQ29tYm9zLmxlbmd0aCAhPT0gb3RoZXJLZXlDb21iby5zdWJDb21ib3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5zdWJDb21ib3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoc2VsZi5zdWJDb21ib3NbaV0ubGVuZ3RoICE9PSBvdGhlcktleUNvbWJvLnN1YkNvbWJvc1tpXS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuc3ViQ29tYm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIHN1YkNvbWJvID0gc2VsZi5zdWJDb21ib3NbaV07XG4gICAgdmFyIG90aGVyU3ViQ29tYm8gPSBvdGhlcktleUNvbWJvLnN1YkNvbWJvc1tpXS5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN1YkNvbWJvLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2pdO1xuICAgICAgdmFyIGluZGV4ID0gb3RoZXJTdWJDb21iby5pbmRleE9mKGtleU5hbWUpO1xuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgb3RoZXJTdWJDb21iby5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3RoZXJTdWJDb21iby5sZW5ndGggIT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbktleUNvbWJvLl9zcGxpdFN0ciA9IGZ1bmN0aW9uKHN0ciwgZGVsaW1pbmF0b3IpIHtcbiAgdmFyIHMgPSBzdHI7XG4gIHZhciBkID0gZGVsaW1pbmF0b3I7XG4gIHZhciBjID0gJyc7XG4gIHZhciBjYSA9IFtdO1xuXG4gIGZvciAodmFyIGNpID0gMDsgY2kgPCBzLmxlbmd0aDsgY2kgKz0gMSkge1xuICAgIGlmIChjaSA+IDAgJiYgc1tjaV0gPT09IGQgJiYgc1tjaSAtIDFdICE9PSAnXFxcXCcpIHtcbiAgICAgIGNhLnB1c2goYy50cmltKCkpO1xuICAgICAgYyA9ICcnO1xuICAgICAgY2kgKz0gMTtcbiAgICB9XG4gICAgYyArPSBzW2NpXTtcbiAgfVxuICBpZiAoYykgeyBjYS5wdXNoKGMudHJpbSgpKTsgfVxuXG4gIHJldHVybiBjYTtcbn07XG5cbktleUNvbWJvLnByb3RvdHlwZS5fY2hlY2tTdWJDb21ibyA9IGZ1bmN0aW9uKFxuICBzdWJDb21ibyxcbiAgc3RhcnRpbmdLZXlOYW1lSW5kZXgsXG4gIHByZXNzZWRLZXlOYW1lc1xuKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzdWJDb21ibyA9IHN1YkNvbWJvLnNsaWNlKDApO1xuICBwcmVzc2VkS2V5TmFtZXMgPSBwcmVzc2VkS2V5TmFtZXMuc2xpY2Uoc3RhcnRpbmdLZXlOYW1lSW5kZXgpO1xuXG4gIHZhciBlbmRJbmRleCA9IHN0YXJ0aW5nS2V5TmFtZUluZGV4O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YkNvbWJvLmxlbmd0aDsgaSArPSAxKSB7XG5cbiAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2ldO1xuICAgIGlmIChrZXlOYW1lWzBdID09PSAnXFxcXCcpIHtcbiAgICAgIHZhciBlc2NhcGVkS2V5TmFtZSA9IGtleU5hbWUuc2xpY2UoMSk7XG4gICAgICBpZiAoXG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yIHx8XG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5rZXlEZWxpbWluYXRvclxuICAgICAgKSB7XG4gICAgICAgIGtleU5hbWUgPSBlc2NhcGVkS2V5TmFtZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBwcmVzc2VkS2V5TmFtZXMuaW5kZXhPZihrZXlOYW1lKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgc3ViQ29tYm8uc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgICAgaWYgKGluZGV4ID4gZW5kSW5kZXgpIHtcbiAgICAgICAgZW5kSW5kZXggPSBpbmRleDtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJDb21iby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGVuZEluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Q29tYm87XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cbnZhciBMb2NhbGUgPSByZXF1aXJlKCcuL2xvY2FsZScpO1xudmFyIEtleUNvbWJvID0gcmVxdWlyZSgnLi9rZXktY29tYm8nKTtcblxuXG5mdW5jdGlvbiBLZXlib2FyZEpTKHRhcmdldFdpbmRvdykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5sb2NhbGUgPSBudWxsO1xuICBzZWxmLl9jdXJyZW50Q29udGV4dCA9IG51bGw7XG4gIHNlbGYuX2NvbnRleHRzID0ge307XG4gIHNlbGYuX2xpc3RlbmVycyA9IFtdO1xuICBzZWxmLl9hcHBsaWVkTGlzdGVuZXJzID0gW107XG4gIHNlbGYuX2xvY2FsZXMgPSB7fTtcbiAgc2VsZi5fdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICBzZWxmLl90YXJnZXRXaW5kb3cgPSBudWxsO1xuXG4gIHNlbGYuc2V0Q29udGV4dCgnZGVmYXVsdCcpO1xuICBzZWxmLndhdGNoKCk7XG59XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnNldExvY2FsZSA9IGZ1bmN0aW9uKGxvY2FsZU5hbWUsIGxvY2FsZUJ1aWxkZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBsb2NhbGUgPSBudWxsO1xuICBpZiAodHlwZW9mIGxvY2FsZU5hbWUgPT09ICdzdHJpbmcnKSB7XG5cbiAgICBpZiAobG9jYWxlQnVpbGRlcikge1xuICAgICAgbG9jYWxlID0gbmV3IExvY2FsZShsb2NhbGVOYW1lKTtcbiAgICAgIGxvY2FsZUJ1aWxkZXIobG9jYWxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxlID0gc2VsZi5fbG9jYWxlc1tsb2NhbGVOYW1lXSB8fCBudWxsO1xuICAgIH1cbiAgfSBlbHNlIHtcblxuICAgIGxvY2FsZSA9IGxvY2FsZU5hbWU7XG4gICAgbG9jYWxlTmFtZSA9IGxvY2FsZS5sb2NhbGVOYW1lO1xuICB9XG5cbiAgc2VsZi5sb2NhbGUgPSBsb2NhbGU7XG4gIHNlbGYuX2xvY2FsZXNbbG9jYWxlTmFtZV0gPSBsb2NhbGU7XG4gIGlmIChsb2NhbGUpIHtcbiAgICBzZWxmLmxvY2FsZS5wcmVzc2VkS2V5cyA9IGxvY2FsZS5wcmVzc2VkS2V5cztcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuZ2V0TG9jYWxlID0gZnVuY3Rpb24obG9jYWxOYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgbG9jYWxOYW1lIHx8IChsb2NhbE5hbWUgPSBzZWxmLmxvY2FsZS5sb2NhbGVOYW1lKTtcbiAgcmV0dXJuIHNlbGYuX2xvY2FsZXNbbG9jYWxOYW1lXSB8fCBudWxsO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAodHlwZW9mIGtleUNvbWJvU3RyID09PSAnc3RyaW5nJykge1xuICAgIHNlbGYuX2xpc3RlbmVycy5wdXNoKHtcbiAgICAgIGtleUNvbWJvOiBuZXcgS2V5Q29tYm8oa2V5Q29tYm9TdHIpLFxuICAgICAgcHJlc3NIYW5kbGVyOiBwcmVzc0hhbmRsZXIgfHwgbnVsbCxcbiAgICAgIHJlbGVhc2VIYW5kbGVyOiByZWxlYXNlSGFuZGxlciB8fCBudWxsLFxuICAgICAgcHJldmVudFJlcGVhdDogZmFsc2VcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvbWJvU3RyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBzZWxmLmJpbmQoa2V5Q29tYm9TdHJbaV0sIHByZXNzSGFuZGxlciwgcmVsZWFzZUhhbmRsZXIpO1xuICAgIH1cbiAgfVxufTtcbktleWJvYXJkSlMucHJvdG90eXBlLmFkZExpc3RlbmVyID0gS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZDtcbktleWJvYXJkSlMucHJvdG90eXBlLm9uID0gS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZDtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIsIHByZXNzSGFuZGxlciwgcmVsZWFzZUhhbmRsZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29tYm9TdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLl9saXN0ZW5lcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBsaXN0ZW5lciA9IHNlbGYuX2xpc3RlbmVyc1tpXTtcblxuICAgICAgdmFyIGNvbWJvTWF0Y2hlcyA9IGxpc3RlbmVyLmtleUNvbWJvLmlzRXF1YWwoa2V5Q29tYm9TdHIpO1xuICAgICAgdmFyIHByZXNzSGFuZGxlck1hdGNoZXMgPSAhcHJlc3NIYW5kbGVyIHx8XG4gICAgICAgIHByZXNzSGFuZGxlciA9PT0gbGlzdGVuZXIucHJlc3NIYW5kbGVyO1xuICAgICAgdmFyIHJlbGVhc2VIYW5kbGVyTWF0Y2hlcyA9IGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyID09PSBudWxsIHx8XG4gICAgICAgIHJlbGVhc2VIYW5kbGVyID09PSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcjtcblxuICAgICAgaWYgKGNvbWJvTWF0Y2hlcyAmJiBwcmVzc0hhbmRsZXJNYXRjaGVzICYmIHJlbGVhc2VIYW5kbGVyTWF0Y2hlcykge1xuICAgICAgICBzZWxmLl9saXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICBpIC09IDE7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29tYm9TdHIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYuYmluZChrZXlDb21ib1N0cltpXSwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcik7XG4gICAgfVxuICB9XG59O1xuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBLZXlib2FyZEpTLnByb3RvdHlwZS51bmJpbmQ7XG5LZXlib2FyZEpTLnByb3RvdHlwZS5vZmYgPSBLZXlib2FyZEpTLnByb3RvdHlwZS51bmJpbmQ7XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnNldENvbnRleHQgPSBmdW5jdGlvbihjb250ZXh0TmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLmxvY2FsZSkge1xuICAgIHNlbGYucmVsZWFzZUFsbEtleXMoKTtcbiAgfVxuICBpZiAoIXNlbGYuX2NvbnRleHRzW2NvbnRleHROYW1lXSkge1xuICAgIHNlbGYuX2NvbnRleHRzW2NvbnRleHROYW1lXSA9IFtdO1xuICB9XG4gIHNlbGYuX2xpc3RlbmVycyA9IHNlbGYuX2NvbnRleHRzW2NvbnRleHROYW1lXTtcbiAgc2VsZi5fY3VycmVudENvbnRleHQgPSBjb250ZXh0TmFtZTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gc2VsZi5fY3VycmVudENvbnRleHQ7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKHRhcmdldERvY3VtZW50LCB0YXJnZXRXaW5kb3cpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuc3RvcCgpO1xuXG4gIGlmICh0YXJnZXREb2N1bWVudCAmJiB0YXJnZXREb2N1bWVudC5kb2N1bWVudCAmJiAhdGFyZ2V0V2luZG93KSB7XG4gICAgdGFyZ2V0V2luZG93ID0gdGFyZ2V0RG9jdW1lbnQ7XG4gICAgdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICB9XG4gIGlmICghdGFyZ2V0V2luZG93KSB7XG4gICAgdGFyZ2V0V2luZG93ID0gZ2xvYmFsLndpbmRvdztcbiAgfVxuICBpZiAodGFyZ2V0V2luZG93ICYmICF0YXJnZXREb2N1bWVudCkge1xuICAgIHRhcmdldERvY3VtZW50ID0gdGFyZ2V0V2luZG93LmRvY3VtZW50O1xuICB9XG5cbiAgaWYgKHRhcmdldERvY3VtZW50ICYmIHRhcmdldFdpbmRvdykge1xuICAgIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA9ICEhdGFyZ2V0V2luZG93LmFkZEV2ZW50TGlzdGVuZXI7XG5cbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0RG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoZXZlbnQua2V5Q29kZSwgZXZlbnQpO1xuICAgIH0pO1xuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXREb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fYmluZEV2ZW50KHRhcmdldFdpbmRvdywgJ2ZvY3VzJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAnYmx1cicsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG5cbiAgICBzZWxmLl90YXJnZXREb2N1bWVudCA9IHRhcmdldERvY3VtZW50O1xuICAgIHNlbGYuX3RhcmdldFdpbmRvdyA9IHRhcmdldFdpbmRvdztcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl90YXJnZXREb2N1bWVudCkge1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldERvY3VtZW50LCAna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBzZWxmLnByZXNzS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXREb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICB9XG4gIGlmIChzZWxmLl90YXJnZXRXaW5kb3cpIHtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXRXaW5kb3csICdmb2N1cycsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG4gICAgc2VsZi5fdW5iaW5kRXZlbnQoc2VsZi5fdGFyZ2V0V2luZG93LCAnYmx1cicsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG4gICAgc2VsZi5fdGFyZ2V0V2luZG93ID0gbnVsbDtcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucHJlc3NLZXkgPSBmdW5jdGlvbihrZXlDb2RlLCBldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5sb2NhbGUucHJlc3NLZXkoa2V5Q29kZSk7XG4gIHNlbGYuX2FwcGx5QmluZGluZ3MoZXZlbnQpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVsZWFzZUtleSA9IGZ1bmN0aW9uKGtleUNvZGUsIGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLmxvY2FsZS5yZWxlYXNlS2V5KGtleUNvZGUpO1xuICBzZWxmLl9jbGVhckJpbmRpbmdzKGV2ZW50KTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnJlbGVhc2VBbGxLZXlzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5sb2NhbGUucHJlc3NlZEtleXMubGVuZ3RoID0gMDtcbiAgc2VsZi5fY2xlYXJCaW5kaW5ncygpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnJlbGVhc2VBbGxLZXlzKCk7XG4gIHNlbGYuX2xpc3RlbmVycy5sZW5ndGggPSAwO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2JpbmRFdmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQsIGV2ZW50TmFtZSwgaGFuZGxlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBzZWxmLl9pc01vZGVybkJyb3dzZXIgP1xuICAgIHRhcmdldEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGhhbmRsZXIsIGZhbHNlKSA6XG4gICAgdGFyZ2V0RWxlbWVudC5hdHRhY2hFdmVudCgnb24nICsgZXZlbnROYW1lLCBoYW5kbGVyKTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl91bmJpbmRFdmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQsIGV2ZW50TmFtZSwgaGFuZGxlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBzZWxmLl9pc01vZGVybkJyb3dzZXIgP1xuICAgIHRhcmdldEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGhhbmRsZXIsIGZhbHNlKTpcbiAgICB0YXJnZXRFbGVtZW50LmRldGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGhhbmRsZXIpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2dldEdyb3VwZWRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbGlzdGVuZXJHcm91cHMgPSBbXTtcbiAgdmFyIGxpc3RlbmVyR3JvdXBNYXAgPSBbXTtcbiAgc2VsZi5fbGlzdGVuZXJzLnNsaWNlKDApLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLmtleUNvbWJvLmtleU5hbWVzLmxlbmd0aCA+IGIua2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoO1xuICB9KS5mb3JFYWNoKGZ1bmN0aW9uKGwpIHtcbiAgICB2YXIgbWFwSW5kZXggPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVyR3JvdXBNYXAubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmIChsaXN0ZW5lckdyb3VwTWFwW2ldLmlzRXF1YWwobC5rZXlDb21ibykpIHtcbiAgICAgICAgbWFwSW5kZXggPSBpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobWFwSW5kZXggPT09IC0xKSB7XG4gICAgICBtYXBJbmRleCA9IGxpc3RlbmVyR3JvdXBNYXAubGVuZ3RoO1xuICAgICAgbGlzdGVuZXJHcm91cE1hcC5wdXNoKGwua2V5Q29tYm8pO1xuICAgIH1cbiAgICBpZiAoIWxpc3RlbmVyR3JvdXBzW21hcEluZGV4XSkge1xuICAgICAgbGlzdGVuZXJHcm91cHNbbWFwSW5kZXhdID0gW107XG4gICAgfVxuICAgIGxpc3RlbmVyR3JvdXBzW21hcEluZGV4XS5wdXNoKGwpO1xuICB9KTtcbiAgcmV0dXJuIGxpc3RlbmVyR3JvdXBzO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2FwcGx5QmluZGluZ3MgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZXZlbnQgfHwgKGV2ZW50ID0ge30pO1xuICB2YXIgcHJldmVudFJlcGVhdCA9IGZhbHNlO1xuICBldmVudC5wcmV2ZW50UmVwZWF0ID0gZnVuY3Rpb24oKSB7IHByZXZlbnRSZXBlYXQgPSB0cnVlOyB9O1xuXG4gIHZhciBwcmVzc2VkS2V5cyA9IHNlbGYubG9jYWxlLnByZXNzZWRLZXlzLnNsaWNlKDApO1xuICB2YXIgbGlzdGVuZXJHcm91cHMgPSBzZWxmLl9nZXRHcm91cGVkTGlzdGVuZXJzKCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lckdyb3Vwcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBsaXN0ZW5lcnMgPSBsaXN0ZW5lckdyb3Vwc1tpXTtcbiAgICB2YXIga2V5Q29tYm8gPSBsaXN0ZW5lcnNbMF0ua2V5Q29tYm87XG5cbiAgICBpZiAoa2V5Q29tYm8uY2hlY2socHJlc3NlZEtleXMpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxpc3RlbmVycy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICB2YXIgbGlzdGVuZXIgPSBsaXN0ZW5lcnNbal07XG4gICAgICAgIHZhciBoYW5kbGVyID0gbGlzdGVuZXIucHJlc3NIYW5kbGVyO1xuICAgICAgICBpZiAoaGFuZGxlciAmJiAhbGlzdGVuZXIucHJldmVudFJlcGVhdCkge1xuICAgICAgICAgIGhhbmRsZXIuY2FsbChzZWxmLCBldmVudCk7XG4gICAgICAgICAgaWYgKHByZXZlbnRSZXBlYXQpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLnByZXZlbnRSZXBlYXQgPSBwcmV2ZW50UmVwZWF0O1xuICAgICAgICAgICAgcHJldmVudFJlcGVhdCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobGlzdGVuZXIucmVsZWFzZUhhbmRsZXIpIHtcbiAgICAgICAgICBpZiAoc2VsZi5fYXBwbGllZExpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleUNvbWJvLmtleU5hbWVzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHByZXNzZWRLZXlzLmluZGV4T2Yoa2V5Q29tYm8ua2V5TmFtZXNbal0pO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgcHJlc3NlZEtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICBqIC09IDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl9jbGVhckJpbmRpbmdzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGV2ZW50IHx8IChldmVudCA9IHt9KTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBzZWxmLl9hcHBsaWVkTGlzdGVuZXJzW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IGxpc3RlbmVyLmtleUNvbWJvO1xuICAgIHZhciBoYW5kbGVyID0gbGlzdGVuZXIucmVsZWFzZUhhbmRsZXI7XG4gICAgaWYgKCFrZXlDb21iby5jaGVjayhzZWxmLmxvY2FsZS5wcmVzc2VkS2V5cykpIHtcbiAgICAgIGxpc3RlbmVyLnByZXZlbnRSZXBlYXQgPSBmYWxzZTtcbiAgICAgIGhhbmRsZXIuY2FsbChzZWxmLCBldmVudCk7XG4gICAgICBzZWxmLl9hcHBsaWVkTGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgIGkgLT0gMTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmRKUztcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2tleS1jb21ibycpO1xuXG5cbmZ1bmN0aW9uIExvY2FsZShuYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLmxvY2FsZU5hbWUgPSBuYW1lO1xuICBzZWxmLnByZXNzZWRLZXlzID0gW107XG4gIHNlbGYuX2FwcGxpZWRNYWNyb3MgPSBbXTtcbiAgc2VsZi5fa2V5TWFwID0ge307XG4gIHNlbGYuX21hY3JvcyA9IFtdO1xufVxuXG5Mb2NhbGUucHJvdG90eXBlLmJpbmRLZXlDb2RlID0gZnVuY3Rpb24oa2V5Q29kZSwga2V5TmFtZXMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Yga2V5TmFtZXMgPT09ICdzdHJpbmcnKSB7XG4gICAga2V5TmFtZXMgPSBba2V5TmFtZXNdO1xuICB9XG5cbiAgc2VsZi5fa2V5TWFwW2tleUNvZGVdID0ga2V5TmFtZXM7XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLmJpbmRNYWNybyA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBrZXlOYW1lcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICBrZXlOYW1lcyA9IFsga2V5TmFtZXMgXTtcbiAgfVxuXG4gIHZhciBtYWNybyA9IHtcbiAgICBrZXlDb21ibzogbmV3IEtleUNvbWJvKGtleUNvbWJvU3RyKSxcbiAgICBrZXlOYW1lczogbnVsbCxcbiAgICBoYW5kbGVyOiBudWxsXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG1hY3JvLmhhbmRsZXIgPSBrZXlOYW1lcztcbiAgfSBlbHNlIHtcbiAgICBtYWNyby5rZXlOYW1lcyA9IGtleU5hbWVzO1xuICB9XG5cbiAgc2VsZi5fbWFjcm9zLnB1c2gobWFjcm8pO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5nZXRLZXlDb2RlcyA9IGZ1bmN0aW9uKGtleU5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBrZXlDb2RlcyA9IFtdO1xuICBmb3IgKHZhciBrZXlDb2RlIGluIHNlbGYuX2tleU1hcCkge1xuICAgIHZhciBpbmRleCA9IHNlbGYuX2tleU1hcFtrZXlDb2RlXS5pbmRleE9mKGtleU5hbWUpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7IGtleUNvZGVzLnB1c2goa2V5Q29kZXwwKTsgfVxuICB9XG4gIHJldHVybiBrZXlDb2Rlcztcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuZ2V0S2V5TmFtZXMgPSBmdW5jdGlvbihrZXlDb2RlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2tleU1hcFtrZXlDb2RlXSB8fCBbXTtcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUucHJlc3NLZXkgPSBmdW5jdGlvbihrZXlDb2RlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAodHlwZW9mIGtleUNvZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIGtleUNvZGVzID0gc2VsZi5nZXRLZXlDb2RlcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBzZWxmLnByZXNzS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB2YXIga2V5TmFtZXMgPSBzZWxmLmdldEtleU5hbWVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5TmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmIChzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbaV0pID09PSAtMSkge1xuICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnB1c2goa2V5TmFtZXNbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGYuX2FwcGx5TWFjcm9zKCk7XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUucmVsZWFzZUtleSA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIga2V5Q29kZXMgPSBzZWxmLmdldEtleUNvZGVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29kZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShrZXlDb2Rlc1tpXSk7XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgdmFyIGtleU5hbWVzID0gc2VsZi5nZXRLZXlOYW1lcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleU5hbWVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB2YXIgaW5kZXggPSBzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbaV0pO1xuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgc2VsZi5wcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGYuX2NsZWFyTWFjcm9zKCk7XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuX2FwcGx5TWFjcm9zID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgbWFjcm9zID0gc2VsZi5fbWFjcm9zLnNsaWNlKDApO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG1hY3Jvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBtYWNybyA9IG1hY3Jvc1tpXTtcbiAgICB2YXIga2V5Q29tYm8gPSBtYWNyby5rZXlDb21ibztcbiAgICB2YXIga2V5TmFtZXMgPSBtYWNyby5rZXlOYW1lcztcbiAgICBpZiAoa2V5Q29tYm8uY2hlY2soc2VsZi5wcmVzc2VkS2V5cykpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgaWYgKHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tqXSkgPT09IC0xKSB7XG4gICAgICAgICAgc2VsZi5wcmVzc2VkS2V5cy5wdXNoKGtleU5hbWVzW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZi5fYXBwbGllZE1hY3Jvcy5wdXNoKG1hY3JvKTtcbiAgICB9XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuX2NsZWFyTWFjcm9zID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2FwcGxpZWRNYWNyb3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgbWFjcm8gPSBzZWxmLl9hcHBsaWVkTWFjcm9zW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IG1hY3JvLmtleUNvbWJvO1xuICAgIHZhciBrZXlOYW1lcyA9IG1hY3JvLmtleU5hbWVzO1xuICAgIGlmICgha2V5Q29tYm8uY2hlY2soc2VsZi5wcmVzc2VkS2V5cykpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gc2VsZi5wcmVzc2VkS2V5cy5pbmRleE9mKGtleU5hbWVzW2pdKTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlbGYuX2FwcGxpZWRNYWNyb3Muc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgIH1cbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZTtcbiIsIlxuLy8gbW9kdWxlc1xudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4uL2xpYi9sb2NhbGUnKTtcblxuXG4vLyBjcmVhdGUgdGhlIGxvY2FsZVxudmFyIGxvY2FsZSA9IG5ldyBMb2NhbGUoJ3VzJyk7XG5cbi8vIGdlbmVyYWxcbmxvY2FsZS5iaW5kS2V5Q29kZSgzLCBbICdjYW5jZWwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDgsIFsgJ2JhY2tzcGFjZScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOSwgWyAndGFiJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMiwgWyAnY2xlYXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEzLCBbICdlbnRlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTYsIFsgJ3NoaWZ0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNywgWyAnY3RybCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTgsIFsgJ2FsdCcsICdtZW51JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOSwgWyAncGF1c2UnLCAnYnJlYWsnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDIwLCBbICdjYXBzbG9jaycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjcsIFsgJ2VzY2FwZScsICdlc2MnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDMyLCBbICdzcGFjZScsICdzcGFjZWJhcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzMsIFsgJ3BhZ2V1cCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzQsIFsgJ3BhZ2Vkb3duJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNSwgWyAnZW5kJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNiwgWyAnaG9tZScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzcsIFsgJ2xlZnQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM4LCBbICd1cCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzksIFsgJ3JpZ2h0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MCwgWyAnZG93bicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDEsIFsgJ3NlbGVjdCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDIsIFsgJ3ByaW50c2NyZWVuJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MywgWyAnZXhlY3V0ZScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDQsIFsgJ3NuYXBzaG90JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NSwgWyAnaW5zZXJ0JywgJ2lucycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDYsIFsgJ2RlbGV0ZScsICdkZWwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ3LCBbICdoZWxwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5MSwgWyAnY29tbWFuZCcsICd3aW5kb3dzJywgJ3dpbicsICdzdXBlcicsICdsZWZ0Y29tbWFuZCcsICdsZWZ0d2luZG93cycsICdsZWZ0d2luJywgJ2xlZnRzdXBlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTIsIFsgJ2NvbW1hbmQnLCAnd2luZG93cycsICd3aW4nLCAnc3VwZXInLCAncmlnaHRjb21tYW5kJywgJ3JpZ2h0d2luZG93cycsICdyaWdodHdpbicsICdyaWdodHN1cGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNDUsIFsgJ3Njcm9sbGxvY2snLCAnc2Nyb2xsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxODYsIFsgJ3NlbWljb2xvbicsICc7JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxODcsIFsgJ2VxdWFsJywgJ2VxdWFsc2lnbicsICc9JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxODgsIFsgJ2NvbW1hJywgJywnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4OSwgWyAnZGFzaCcsICctJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOTAsIFsgJ3BlcmlvZCcsICcuJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOTEsIFsgJ3NsYXNoJywgJ2ZvcndhcmRzbGFzaCcsICcvJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOTIsIFsgJ2dyYXZlYWNjZW50JywgJ2AnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDIxOSwgWyAnb3BlbmJyYWNrZXQnLCAnWycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjIwLCBbICdiYWNrc2xhc2gnLCAnXFxcXCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjIxLCBbICdjbG9zZWJyYWNrZXQnLCAnXScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjIyLCBbICdhcG9zdHJvcGhlJywgJ1xcJycgXSk7XG5cbi8vIDAtOVxubG9jYWxlLmJpbmRLZXlDb2RlKDQ4LCBbICd6ZXJvJywgJzAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ5LCBbICdvbmUnLCAnMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTAsIFsgJ3R3bycsICcyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MSwgWyAndGhyZWUnLCAnMycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTIsIFsgJ2ZvdXInLCAnNCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTMsIFsgJ2ZpdmUnLCAnNScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTQsIFsgJ3NpeCcsICc2JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NSwgWyAnc2V2ZW4nLCAnNycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTYsIFsgJ2VpZ2h0JywgJzgnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDU3LCBbICduaW5lJywgJzknIF0pO1xuXG4vLyBudW1wYWRcbmxvY2FsZS5iaW5kS2V5Q29kZSg5NiwgWyAnbnVtemVybycsICdudW0wJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5NywgWyAnbnVtb25lJywgJ251bTEnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDk4LCBbICdudW10d28nLCAnbnVtMicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTksIFsgJ251bXRocmVlJywgJ251bTMnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwMCwgWyAnbnVtZm91cicsICdudW00JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDEsIFsgJ251bWZpdmUnLCAnbnVtNScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAyLCBbICdudW1zaXgnLCAnbnVtNicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAzLCBbICdudW1zZXZlbicsICdudW03JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDQsIFsgJ251bWVpZ2h0JywgJ251bTgnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNSwgWyAnbnVtbmluZScsICdudW05JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDYsIFsgJ251bW11bHRpcGx5JywgJ251bSonIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNywgWyAnbnVtYWRkJywgJ251bSsnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwOCwgWyAnbnVtZW50ZXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwOSwgWyAnbnVtc3VidHJhY3QnLCAnbnVtLScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTEwLCBbICdudW1kZWNpbWFsJywgJ251bS4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExMSwgWyAnbnVtZGl2aWRlJywgJ251bS8nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE0NCwgWyAnbnVtbG9jaycsICdudW0nIF0pO1xuXG4vLyBmdW5jdGlvbiBrZXlzXG5sb2NhbGUuYmluZEtleUNvZGUoMTEyLCBbICdmMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTEzLCBbICdmMicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE0LCBbICdmMycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE1LCBbICdmNCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE2LCBbICdmNScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE3LCBbICdmNicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE4LCBbICdmNycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE5LCBbICdmOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIwLCBbICdmOScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIxLCBbICdmMTAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyMiwgWyAnZjExJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjMsIFsgJ2YxMicgXSk7XG5cbi8vIHNlY29uZGFyeSBrZXkgc3ltYm9sc1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBgJywgWyAndGlsZGUnLCAnficgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDEnLCBbICdleGNsYW1hdGlvbicsICdleGNsYW1hdGlvbnBvaW50JywgJyEnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAyJywgWyAnYXQnLCAnQCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDMnLCBbICdudW1iZXInLCAnIycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDQnLCBbICdkb2xsYXInLCAnZG9sbGFycycsICdkb2xsYXJzaWduJywgJyQnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA1JywgWyAncGVyY2VudCcsICclJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNicsIFsgJ2NhcmV0JywgJ14nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA3JywgWyAnYW1wZXJzYW5kJywgJ2FuZCcsICcmJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgOCcsIFsgJ2FzdGVyaXNrJywgJyonIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA5JywgWyAnb3BlbnBhcmVuJywgJygnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAwJywgWyAnY2xvc2VwYXJlbicsICcpJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgLScsIFsgJ3VuZGVyc2NvcmUnLCAnXycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArID0nLCBbICdwbHVzJywgJysnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBbJywgWyAnb3BlbmN1cmx5YnJhY2UnLCAnb3BlbmN1cmx5YnJhY2tldCcsICd7JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXScsIFsgJ2Nsb3NlY3VybHlicmFjZScsICdjbG9zZWN1cmx5YnJhY2tldCcsICd9JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXFxcXCcsIFsgJ3ZlcnRpY2FsYmFyJywgJ3wnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA7JywgWyAnY29sb24nLCAnOicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIFxcJycsIFsgJ3F1b3RhdGlvbm1hcmsnLCAnXFwnJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgISwnLCBbICdvcGVuYW5nbGVicmFja2V0JywgJzwnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAuJywgWyAnY2xvc2VhbmdsZWJyYWNrZXQnLCAnPicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIC8nLCBbICdxdWVzdGlvbm1hcmsnLCAnPycgXSk7XG5cbi8vYS16IGFuZCBBLVpcbmZvciAodmFyIGtleUNvZGUgPSA2NTsga2V5Q29kZSA8PSA5MDsga2V5Q29kZSArPSAxKSB7XG4gIHZhciBrZXlOYW1lID0gU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlICsgMzIpO1xuICB2YXIgY2FwaXRhbEtleU5hbWUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUpO1xuXHRsb2NhbGUuYmluZEtleUNvZGUoa2V5Q29kZSwga2V5TmFtZSk7XG5cdGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgJyArIGtleU5hbWUsIGNhcGl0YWxLZXlOYW1lKTtcblx0bG9jYWxlLmJpbmRNYWNybygnY2Fwc2xvY2sgKyAnICsga2V5TmFtZSwgY2FwaXRhbEtleU5hbWUpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gbG9jYWxlO1xuIl19
