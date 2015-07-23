/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _get2 = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : factory(global.Havelock = {});
})(undefined, function (exports) {
  'use strict';

  // node modes
  var NEW = 0;
  var CHANGED = 1;
  var UNCHANGED = 2;
  var ORPHANED = 3;
  var UNSTABLE = 4;
  var STABLE = 5;
  var DISOWNED = 6;

  // core types
  var ATOM = Symbol('ATOM');
  var DERIVATION = Symbol('DERIVATION');
  var LENS = Symbol('LENS');
  var REACTION = Symbol('REACTION');

  function mark(node, reactions) {
    if (node._type === REACTION) {
      reactions.push(node);
    } else {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = node._children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var child = _step.value;

          if (child._state !== UNSTABLE) {
            child._state = UNSTABLE;
            mark(child, reactions);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }

  function sweep(node) {
    switch (node._state) {
      case CHANGED:
      case UNCHANGED:
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = node._children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var child = _step2.value;

            sweep(child);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2['return']) {
              _iterator2['return']();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        node._state = STABLE;
        break;
      case UNSTABLE:
        var stashedParentStates = [];
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = node._parents[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _parent = _step3.value;

            if (_parent._state === CHANGED) {
              node._state = ORPHANED;
            }
            _parent._children.remove(node);
            stashedParentStates.push([_parent, _parent._value]);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3['return']) {
              _iterator3['return']();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        if (node._state !== ORPHANED) {
          node._state = DISOWNED;
          node._parents = stashedParentStates;
        }
        break;
      case STABLE:
        break;
      default:
        throw new Error('It should be impossible tosweep nodes with mode: ' + node._state);
    }
  }

  var RUNNING = Symbol('running'),
      COMPLETED = Symbol('completed'),
      ABORTED = Symbol('aborted');

  var $parent = Symbol('parent_txn');
  var $state = Symbol('txn_value');

  var TransactionAbortion = Symbol('abort that junk yo');

  function abortTransaction() {
    throw TransactionAbortion;
  }

  var TransactionContext = (function () {
    function TransactionContext() {
      _classCallCheck(this, TransactionContext);

      this.currentTxn = null;
    }

    _createClass(TransactionContext, [{
      key: 'inTransaction',
      value: function inTransaction() {
        return this.currentTxn !== null;
      }
    }, {
      key: 'currentTransaction',
      value: function currentTransaction() {
        return this.currentTxn;
      }
    }, {
      key: '_begin',
      value: function _begin(txn) {
        txn[$parent] = this.currentTxn;
        txn[$state] = RUNNING;
        this.currentTxn = txn;
      }
    }, {
      key: '_popTransaction',
      value: function _popTransaction(name, cb) {
        var txn = this.currentTxn;
        this.currentTxn = txn[$parent];
        if (txn[$state] !== RUNNING) {
          throw new Error('Must be in state \'RUNNING\' to ' + name + ' transaction.' + (' Was in state ' + txn[$state] + '.'));
        }
        cb(txn);
      }
    }, {
      key: '_commit',
      value: function _commit() {
        this._popTransaction('commit', function (txn) {
          txn[$state] = COMPLETED;
          txn.onCommit && txn.onCommit();
        });
      }
    }, {
      key: '_abort',
      value: function _abort() {
        this._popTransaction('abort', function (txn) {
          txn[$state] = ABORTED;
          txn.onAbort && txn.onAbort();
        });
      }
    }, {
      key: 'transact',
      value: function transact(txn, f) {
        this._begin(txn);
        try {
          f(abortTransaction);
          this._commit();
        } catch (e) {
          this._abort();
          if (e !== TransactionAbortion) {
            throw e;
          }
        }
      }
    }]);

    return TransactionContext;
  })();

  function extend(obj) {
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _len = arguments.length, others = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        others[_key - 1] = arguments[_key];
      }

      for (var _iterator4 = others[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var other = _step4.value;
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = Object.keys(other)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var prop = _step5.value;

            obj[prop] = other[prop];
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5['return']) {
              _iterator5['return']();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4['return']) {
          _iterator4['return']();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    return obj;
  }

  function symbolValues(obj) {
    return Object.getOwnPropertySymbols(obj).map(function (s) {
      return obj[s];
    });
  }

  function _type(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
  }

  function _is(a, b) {
    // SameValue algorithm
    if (a === b) {
      // Steps 1-5, 7-10
      // Steps 6.b-6.e: +0 != -0
      return a !== 0 || 1 / a === 1 / b;
    } else {
      // Step 6.a: NaN == NaN
      return a !== a && b !== b;
    }
  }

  function _equals(a, b, stackA, stackB) {
    var typeA = _type(a);
    if (typeA !== _type(b)) {
      return false;
    }

    if (typeA === 'Boolean' || typeA === 'Number' || typeA === 'String') {
      return typeof a === 'object' ? typeof b === 'object' && util__equals(a.valueOf(), b.valueOf()) : false;
    }

    if (typeA === 'RegExp') {
      // RegExp equality algorithm: http://stackoverflow.com/a/10776635
      return a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode;
    }

    if (Object(a) === a) {
      if (typeA === 'Date' && a.getTime() !== b.getTime()) {
        return false;
      }

      var keysA = Object.keys(a);
      if (keysA.length !== Object.keys(b).length) {
        return false;
      }

      if (!stackA) {
        stackA = [];
        stackB = [];
      }

      var idx = stackA.length - 1;
      while (idx >= 0) {
        if (stackA[idx] === a) {
          return stackB[idx] === b;
        }
        idx -= 1;
      }

      stackA[stackA.length] = a;
      stackB[stackB.length] = b;
      idx = keysA.length - 1;
      while (idx >= 0) {
        var key = keysA[idx];
        if (!Object.hasOwnProperty(key, b) || !util__equals(b[key], a[key], stackA, stackB)) {
          return false;
        }
        idx -= 1;
      }
      stackA.pop();
      stackB.pop();
      return true;
    }
    return false;
  }

  function util__equals(a, b, stackA, stackB) {
    if (Object.is && Object.is(a, b) || _is(a, b)) {
      return true;
    }
    if (!(a && b)) return false;

    return typeof a.equals === 'function' && a.equals(b) || typeof b.equals === 'function' && b.equals(a) || _equals(a, b, stackA, stackB) || false;
  }

  var useMapAtSize = 16;
  var goBackToArrayAtSize = 8;

  var MapSet = (function () {
    function MapSet(items) {
      _classCallCheck(this, MapSet);

      this._map = {};
      this._size = 0;
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = items[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var item = _step6.value;

          this.add(item);
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6['return']) {
            _iterator6['return']();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }
    }

    _createClass(MapSet, [{
      key: 'add',
      value: function add(elem) {
        this._map[elem._id] = elem;
        this._size++;
        return this;
      }
    }, {
      key: 'remove',
      value: function remove(elem) {
        delete this._map[elem._id];
        if (--this._size <= goBackToArrayAtSize) {
          return new ArraySet(symbolValues(this._map));
        }
        return this;
      }
    }, {
      key: Symbol.iterator,
      value: regeneratorRuntime.mark(function value() {
        var _iteratorNormalCompletion7, _didIteratorError7, _iteratorError7, _iterator7, _step7, k;

        return regeneratorRuntime.wrap(function value$(context$3$0) {
          while (1) switch (context$3$0.prev = context$3$0.next) {
            case 0:
              _iteratorNormalCompletion7 = true;
              _didIteratorError7 = false;
              _iteratorError7 = undefined;
              context$3$0.prev = 3;
              _iterator7 = this._map[Symbol.iterator]();

            case 5:
              if (_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done) {
                context$3$0.next = 12;
                break;
              }

              k = _step7.value;
              context$3$0.next = 9;
              return this._map[k];

            case 9:
              _iteratorNormalCompletion7 = true;
              context$3$0.next = 5;
              break;

            case 12:
              context$3$0.next = 18;
              break;

            case 14:
              context$3$0.prev = 14;
              context$3$0.t0 = context$3$0['catch'](3);
              _didIteratorError7 = true;
              _iteratorError7 = context$3$0.t0;

            case 18:
              context$3$0.prev = 18;
              context$3$0.prev = 19;

              if (!_iteratorNormalCompletion7 && _iterator7['return']) {
                _iterator7['return']();
              }

            case 21:
              context$3$0.prev = 21;

              if (!_didIteratorError7) {
                context$3$0.next = 24;
                break;
              }

              throw _iteratorError7;

            case 24:
              return context$3$0.finish(21);

            case 25:
              return context$3$0.finish(18);

            case 26:
            case 'end':
              return context$3$0.stop();
          }
        }, value, this, [[3, 14, 18, 26], [19,, 21, 25]]);
      })
    }]);

    return MapSet;
  })();

  var ArraySet = (function () {
    function ArraySet(items) {
      _classCallCheck(this, ArraySet);

      this._array = items || [];
    }

    _createClass(ArraySet, [{
      key: 'add',
      value: function add(elem) {
        if (this._array.indexOf(elem) < 0) {
          this._array.push(elem);
          if (this.length === useMapAtSize) {
            return new MapSet(this._array);
          } else {
            return this;
          }
        }
        return this;
      }
    }, {
      key: 'remove',
      value: function remove(elem) {
        var idx = this._array.indexOf(elem);
        if (idx >= 0) {
          if (idx === this._array.length - 1) {
            this._array.pop();
          } else {
            this._array[idx] = this._array.pop();
          }
        }
        return this;
      }
    }, {
      key: Symbol.iterator,
      value: function value() {
        return this._array.slice(0)[Symbol.iterator]();
      }
    }]);

    return ArraySet;
  })();

  var set__Set = (function () {
    function set__Set() {
      _classCallCheck(this, set__Set);

      this._set = new ArraySet();
    }

    _createClass(set__Set, [{
      key: 'add',
      value: function add(elem) {
        this._set = this._set.add(elem);
      }
    }, {
      key: 'remove',
      value: function remove(elem) {
        this._set = this._set.remove(elem);
      }
    }, {
      key: Symbol.iterator,
      value: function value() {
        return this._set[Symbol.iterator]();
      }
    }]);

    return set__Set;
  })();

  var src_atom__inReactCycle = false;

  function processReactionQueue(rq) {
    src_atom__inReactCycle = true;
    rq.forEach(function (r) {
      return r.maybeReact();
    });
    src_atom__inReactCycle = false;
  }

  var TXN_CTX = new TransactionContext();

  var NOOP_ARRAY = { push: function push() {} };

  var AtomicTransactionState = (function () {
    function AtomicTransactionState() {
      _classCallCheck(this, AtomicTransactionState);

      this.inTxnValues = {};
      this.reactionQueue = [];
    }

    _createClass(AtomicTransactionState, [{
      key: 'getState',
      value: function getState(atom) {
        var inTxnValue = this.inTxnValues[atom._uid];
        if (inTxnValue) {
          return inTxnValue[1];
        } else {
          return atom._value;
        }
      }
    }, {
      key: 'setState',
      value: function setState(atom, state) {
        this.inTxnValues[atom._uid] = [atom, state];
        mark(atom, this.reactionQueue);
      }
    }, {
      key: 'onCommit',
      value: function onCommit() {
        if (TXN_CTX.inTransaction()) {
          // push in-txn vals up to current txn
          var _iteratorNormalCompletion8 = true;
          var _didIteratorError8 = false;
          var _iteratorError8 = undefined;

          try {
            for (var _iterator8 = symbolValues(this.inTxnValues)[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
              var _step8$value = _slicedToArray(_step8.value, 2);

              var _atom = _step8$value[0];
              var value = _step8$value[1];

              _atom.set(value);
            }
          } catch (err) {
            _didIteratorError8 = true;
            _iteratorError8 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion8 && _iterator8['return']) {
                _iterator8['return']();
              }
            } finally {
              if (_didIteratorError8) {
                throw _iteratorError8;
              }
            }
          }
        } else {
          // change root state and run reactions.
          var _iteratorNormalCompletion9 = true;
          var _didIteratorError9 = false;
          var _iteratorError9 = undefined;

          try {
            for (var _iterator9 = symbolValues(this.inTxnValues)[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
              var _step9$value = _slicedToArray(_step9.value, 2);

              var _atom2 = _step9$value[0];
              var value = _step9$value[1];

              _atom2._value = value;
              mark(_atom2, NOOP_ARRAY);
            }
          } catch (err) {
            _didIteratorError9 = true;
            _iteratorError9 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion9 && _iterator9['return']) {
                _iterator9['return']();
              }
            } finally {
              if (_didIteratorError9) {
                throw _iteratorError9;
              }
            }
          }

          processReactionQueue(this.reactionQueue);

          // then sweep for a clean finish
          var _iteratorNormalCompletion10 = true;
          var _didIteratorError10 = false;
          var _iteratorError10 = undefined;

          try {
            for (var _iterator10 = symbolValues(this.inTxnValues)[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
              var _step10$value = _slicedToArray(_step10.value, 1);

              var _atom3 = _step10$value[0];

              sweep(_atom3);
            }
          } catch (err) {
            _didIteratorError10 = true;
            _iteratorError10 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion10 && _iterator10['return']) {
                _iterator10['return']();
              }
            } finally {
              if (_didIteratorError10) {
                throw _iteratorError10;
              }
            }
          }
        }
      }
    }, {
      key: 'onAbort',
      value: function onAbort() {
        if (!TXN_CTX.inTransaction()) {
          var _iteratorNormalCompletion11 = true;
          var _didIteratorError11 = false;
          var _iteratorError11 = undefined;

          try {
            for (var _iterator11 = symbolValues(this.inTxnValues)[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
              var _step11$value = _slicedToArray(_step11.value, 1);

              var _atom4 = _step11$value[0];

              sweep(_atom4);
            }
          } catch (err) {
            _didIteratorError11 = true;
            _iteratorError11 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion11 && _iterator11['return']) {
                _iterator11['return']();
              }
            } finally {
              if (_didIteratorError11) {
                throw _iteratorError11;
              }
            }
          }
        }
      }
    }]);

    return AtomicTransactionState;
  })();

  function createAtomPrototype(havelock, _ref2) {
    var equals = _ref2.equals;

    return {
      _clone: function _clone() {
        return havelock.atom(this._value);
      },

      withValidator: function withValidator(f) {
        var _this = this;

        if (f === null) {
          return this._clone();
        }if (typeof f === 'function') {
          var _ret = (function () {
            var result = _this._clone();
            var existing = _this._validator;
            if (existing) {
              result._validator = function (x) {
                return f(x) && existing(x);
              };
            } else {
              result._validator = f;
            }
            return {
              v: result
            };
          })();

          if (typeof _ret === 'object') return _ret.v;
        } else {
          throw new Error('.withValidator expects function or null');
        }
      },

      validate: function validate() {
        this._validate(this.get());
      },

      _validate: function _validate(value) {
        var validationResult = this._validator && this._validator(value);
        if (this._validator && validationResult !== true) {
          throw new Error('Failed validation with value: \'' + value + '\'.' + (' Validator returned \'' + validationResult + '\' '));
        }
      },

      set: function set(value) {
        if (src_atom__inReactCycle) {
          throw new Error('Trying to set atom state during reaction phase. This' + ' is an error. Use middleware for cascading changes.');
        }
        this._validate(value);
        if (!equals(value, this._value)) {
          this._state = CHANGED;

          if (TXN_CTX.inTransaction()) {
            TXN_CTX.currentTransaction().setState(this, value);
          } else {
            this._value = value;

            var reactionQueue = [];
            mark(this, reactionQueue);
            processReactionQueue(reactionQueue);
            sweep(this);
          }
        }
        return value;
      },

      _get: function _get() {
        if (TXN_CTX.inTransaction()) {
          return TXN_CTX.currentTransaction().getState(this);
        }
        return this._value;
      }
    };
  }

  function constructAtom(atom, value) {
    atom._uid = Symbol('my_uid');
    atom._children = new set__Set();
    atom._state = STABLE;
    atom._value = value;
    atom._type = ATOM;
    return atom;
  }

  function src_atom__transact(f) {
    TXN_CTX.transact(new AtomicTransactionState(), f);
  }

  var parentsStack = [];

  function capturingParents(f) {
    parentsStack.push(new set__Set());
    f();
    return parentsStack.pop();
  }

  function maybeCaptureParent(p) {
    if (parentsStack.length > 0) {
      parentsStack[parentsStack.length - 1].add(p);
    }
  }

  function createDerivationPrototype(havelock, _ref3) {
    var equals = _ref3.equals;

    return {
      _clone: function _clone() {
        return havelock.derive(this._deriver);
      },

      _forceGet: function _forceGet() {
        var _this2 = this;

        var newParents = capturingParents(function () {
          var newState = _this2._deriver();
          _this2._state = equals(newState, _this2._value) ? UNCHANGED : CHANGED;
          _this2._value = newState;
        });

        // organise parents
        var _iteratorNormalCompletion12 = true;
        var _didIteratorError12 = false;
        var _iteratorError12 = undefined;

        try {
          for (var _iterator12 = this._parents[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
            var possiblyFormerParent = _step12.value;

            if (!newParents[possiblyFormerParent._uid]) {
              // definitely former parent
              possiblyFormerParent._children.remove(this);
            }
          }
        } catch (err) {
          _didIteratorError12 = true;
          _iteratorError12 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion12 && _iterator12['return']) {
              _iterator12['return']();
            }
          } finally {
            if (_didIteratorError12) {
              throw _iteratorError12;
            }
          }
        }

        this._parents = newParents;

        var _iteratorNormalCompletion13 = true;
        var _didIteratorError13 = false;
        var _iteratorError13 = undefined;

        try {
          for (var _iterator13 = newParents[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
            var p = _step13.value;

            p._children.add(this);
          }
        } catch (err) {
          _didIteratorError13 = true;
          _iteratorError13 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion13 && _iterator13['return']) {
              _iterator13['return']();
            }
          } finally {
            if (_didIteratorError13) {
              throw _iteratorError13;
            }
          }
        }
      },

      _get: function _get() {
        outer: switch (this._state) {
          case NEW:
          case ORPHANED:
            this._forceGet();
            break;
          case UNSTABLE:
            var _iteratorNormalCompletion14 = true;
            var _didIteratorError14 = false;
            var _iteratorError14 = undefined;

            try {
              for (var _iterator14 = this._parents[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
                var _parent2 = _step14.value;

                if (_parent2._state === UNSTABLE || _parent2._state === ORPHANED || _parent2._state === DISOWNED) {
                  _parent2._get();
                }
                switch (_parent2._state) {
                  case STABLE:
                  case UNCHANGED:
                    // noop
                    break;
                  case CHANGED:
                    this._forceGet();
                    break outer;
                  default:
                    throw new Error('invalid parent mode: ' + _parent2._state);
                }
              }
            } catch (err) {
              _didIteratorError14 = true;
              _iteratorError14 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion14 && _iterator14['return']) {
                  _iterator14['return']();
                }
              } finally {
                if (_didIteratorError14) {
                  throw _iteratorError14;
                }
              }
            }

            this._state = UNCHANGED;
            break;
          case DISOWNED:
            var parents = new set__Set();
            var _iteratorNormalCompletion15 = true;
            var _didIteratorError15 = false;
            var _iteratorError15 = undefined;

            try {
              for (var _iterator15 = this._parents[Symbol.iterator](), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
                var _step15$value = _slicedToArray(_step15.value, 2);

                var _parent3 = _step15$value[0];
                var state = _step15$value[1];

                if (!equals(_parent3._get(), state)) {
                  this._forceGet();
                  break outer;
                } else {
                  parents.add(_parent3);
                }
              }
            } catch (err) {
              _didIteratorError15 = true;
              _iteratorError15 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion15 && _iterator15['return']) {
                  _iterator15['return']();
                }
              } finally {
                if (_didIteratorError15) {
                  throw _iteratorError15;
                }
              }
            }

            this._parents = parents;
            this._state = UNCHANGED;
            break;
          default:
          // noop
        }

        return this._value;
      }
    };
  }

  function createDerivation(obj, deriver) {
    obj._uid = Symbol('my_uid');
    obj._children = new set__Set();
    obj._parents = new set__Set();
    obj._deriver = deriver;
    obj._state = NEW;
    obj._type = DERIVATION;
    obj._value = Symbol('null');
    return obj;
  }

  function createLensPrototype(havelock, _) {
    return {
      _clone: function _clone() {
        return havelock.lens(this._parent, { get: this._getter, set: this._setter });
      },

      set: function set(value) {
        this._parent.set(this._setter(this._parent._get(), value));
        return this.get();
      }
    };
  }

  function createLens(derivation, parent, descriptor) {
    derivation._getter = descriptor.get;
    derivation._setter = descriptor.set;
    derivation._parent = parent;
    derivation._type = LENS;

    return derivation;
  }

  var ReactionBase = (function () {
    function ReactionBase(parent, control) {
      _classCallCheck(this, ReactionBase);

      this.control = control;
      this.parent = parent;
      this._state = STABLE;
      this._uid = Symbol('my_uid');
      this.active = false;
      this._type = REACTION;
    }

    _createClass(ReactionBase, [{
      key: 'stop',
      value: function stop() {
        this.parent._children.remove(this);
        this.active = false;
        this.control.onStop && this.control.onStop();
      }
    }, {
      key: 'start',
      value: function start() {
        this.parent._children.add(this);
        this.active = true;
        this.control.onStart && this.control.onStart();
        this.parent._get(); // set up bi-directional link
      }
    }, {
      key: 'maybeReact',
      value: function maybeReact() {
        if (this._state === UNSTABLE) {
          if (this.parent._state === UNSTABLE || this.parent._state === ORPHANED || this.parent._state === DISOWNED || this.parent._state === NEW) {
            this.parent._get();
          }

          switch (this.parent._state) {
            case UNCHANGED:
              this._state = STABLE;
              break;
            case CHANGED:
              this.force();
              break;
            // should never be STABLE, as this only gets called during react phase
            default:
              throw new Error('invalid mode for parent: ' + this.parent._state);
          }
        }
      }
    }, {
      key: 'force',
      value: function force() {
        if (this.control.react) {
          this._state = STABLE;
          this.control.react(this.parent._get());
        } else {
          throw new Error('No reaction function available.');
        }
      }
    }]);

    return ReactionBase;
  })();

  var Reaction = (function () {
    function Reaction() {
      _classCallCheck(this, Reaction);

      this._type = REACTION;
    }

    _createClass(Reaction, [{
      key: '_createBase',
      value: function _createBase(parent) {
        if (this._base) {
          throw new Error('This reaction has already been initialized');
        }
        this._base = new ReactionBase(parent, this);
        return this;
      }
    }, {
      key: 'start',
      value: function start() {
        this._base.start();
        return this;
      }
    }, {
      key: 'stop',
      value: function stop() {
        this._base.stop();
        return this;
      }
    }, {
      key: 'force',
      value: function force() {
        this._base.force();
        return this;
      }
    }, {
      key: 'isRunning',
      value: function isRunning() {
        return this._base.active;
      }
      // lifecycle methods go here
      // onStart, onStop

    }]);

    return Reaction;
  })();

  var StandardReaction = (function (_Reaction) {
    function StandardReaction(f) {
      _classCallCheck(this, StandardReaction);

      _get2(Object.getPrototypeOf(StandardReaction.prototype), 'constructor', this).call(this);
      this.react = f;
    }

    _inherits(StandardReaction, _Reaction);

    return StandardReaction;
  })(Reaction);

  function anonymousReaction(descriptor) {
    return extend(new Reaction(), descriptor);
  }

  function createDerivablePrototype(havelock, _ref4) {
    var equals = _ref4.equals;

    return _defineProperty({
      /**
       * Creates a derived value whose state will always be f applied to this
       * value
       */
      derive: function derive(f) {
        return havelock.derive(this, f);
      },

      reaction: function reaction(f) {
        if (typeof f === 'function') {
          return new StandardReaction(f)._createBase(this);
        } else if (f instanceof Reaction) {
          return f._createBase(this);
        } else if (f && f.react) {
          return anonymousReaction(f)._createBase(this);
        } else {
          throw new Error('Unrecognized type for reaction ' + f);
        }
      },

      react: function react(f) {
        return this.reaction(f).start().force();
      },

      get: function get() {
        maybeCaptureParent(this);
        return this._get(); // abstract protected method, in Java parlance
      },

      is: function is(other) {
        return havelock.lift(equals)(this, other);
      },

      and: function and(other) {
        return this.derive(function (x) {
          return x && havelock.unpack(other);
        });
      },

      or: function or(other) {
        return this.derive(function (x) {
          return x || havelock.unpack(other);
        });
      },

      then: function then(thenClause, elseClause) {
        return this.derive(function (x) {
          return havelock.unpack(x ? thenClause : elseClause);
        });
      },

      not: function not() {
        return this.derive(function (x) {
          return !x;
        });
      }

    }, 'switch', function _switch() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return this.derive(function (x) {
        var i = undefined;
        for (i = 0; i < args.length - 1; i += 2) {
          if (equals(x, havelock.unpack(args[i]))) {
            return havelock.unpack(args[i + 1]);
          }
        }
        if (i === args.length - 1) {
          return havelock.unpack(args[i]);
        }
      });
    });
  }

  function createMutablePrototype(havelock, _) {
    return {
      swap: function swap(f) {
        for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          args[_key3 - 1] = arguments[_key3];
        }

        return this.set(f.apply(null, [this.get()].concat(args)));
      },
      lens: function lens(lensDescriptor) {
        return havelock.lens(this, lensDescriptor);
      }
    };
  }

  var defaultConfig = { equals: equals };

  function havelock_module__havelock() {
    var config = arguments[0] === undefined ? {} : arguments[0];

    config = extend({}, defaultConfig, config);

    var Havelock = {
      transact: transact,
      Reaction: Reaction,
      isAtom: function isAtom(x) {
        return x && x._type === ATOM;
      },
      isDerivation: function isDerivation(x) {
        return x && (x._type === DERIVATION || x._type === LENS);
      },
      isLens: function isLens(x) {
        return x && x._type === LENS;
      },
      isReaction: function isReaction(x) {
        return x && x._type === REACTION;
      }
    };

    Havelock.isDerivable = function (x) {
      return Havelock.isDerivation(x) || Havelock.isAtom(x);
    };

    var Derivable = createDerivablePrototype(Havelock, config);
    var Mutable = createMutablePrototype(Havelock, config);

    var Atom = extend({}, Mutable, Derivable, createAtomPrototype(Havelock, config));

    var Derivation = extend({}, Derivable, createDerivationPrototype(Havelock, config));

    var Lens = extend({}, Mutable, Derivation, createLensPrototype(Havelock, config));

    /**
     * Constructs a new atom whose state is the given value
     */
    Havelock.atom = function (val) {
      return constructAtom(Object.create(Atom), val);
    };

    /**
     * Sets the e's state to be f applied to e's current state and args
     */
    Havelock.swap = function (e, f, args) {
      return e.set(f.apply(null, [e.get()].concat(args)));
    };

    /**
     * Creates a new derivation. Can also be used as a template string tag.
     */
    Havelock.derive = function (a, b, c, d, e) {
      if (a instanceof Array) {
        return deriveString.apply(null, arguments);
      }
      var n = arguments.length;
      switch (n) {
        case 0:
          throw new Error('Wrong arity for derive. Expecting 1+ args');
        case 1:
          return createDerivation(Object.create(Derivation), a);
        case 2:
          return Havelock.derive(function () {
            return b(a.get());
          });
        case 3:
          return Havelock.derive(function () {
            return c(a.get(), b.get());
          });
        case 4:
          return Havelock.derive(function () {
            return d(a.get(), b.get(), c.get());
          });
        case 5:
          return Havelock.derive(function () {
            return e(a.get(), b.get(), c.get(), d.get());
          });
        default:
          var args = Array.prototype.slice.call(arguments, 0, n - 1);
          var f = arguments[n - 1];
          return Havelock.derive(function () {
            return f.apply(null, args.map(function (a) {
              return a.get();
            }));
          });
      }
    };

    function deriveString(parts) {
      for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }

      return Havelock.derive(function () {
        var s = '';
        for (var i = 0; i < parts.length; i++) {
          s += parts[i];
          if (i < args.length) {
            s += Havelock.unpack(args[i]);
          }
        }
        return s;
      });
    }

    /**
     * creates a new lens
     */
    Havelock.lens = function (parent, descriptor) {
      var lens = Object.create(Lens);
      return createLens(createDerivation(lens, function () {
        return descriptor.get(parent.get());
      }), parent, descriptor);
    };

    /**
     * dereferences a thing if it is dereferencable, otherwise just returns it.
     */
    Havelock.unpack = function (thing) {
      if (Havelock.isDerivable(thing)) {
        return thing.get();
      } else {
        return thing;
      }
    };

    /**
     * lifts a non-monadic function to work on derivables
     */
    Havelock.lift = function (f) {
      return function () {
        var args = arguments;
        return Havelock.derive(function () {
          return f.apply(this, Array.prototype.map.call(args, Havelock.unpack));
        });
      };
    };

    /**
     * sets a to v, returning v
     */
    Havelock.set = function (a, v) {
      return a.set(v);
    };

    Havelock.get = function (d) {
      return d.get();
    };

    function deepUnpack(thing) {
      if (Havelock.isDerivable(thing)) {
        return thing.get();
      } else if (thing instanceof Array) {
        return thing.map(deepUnpack);
      } else if (thing.constructor === Object) {
        var result = {};
        var _iteratorNormalCompletion16 = true;
        var _didIteratorError16 = false;
        var _iteratorError16 = undefined;

        try {
          for (var _iterator16 = Object.keys(thing)[Symbol.iterator](), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
            var prop = _step16.value;

            result[prop] = deepUnpack(thing[prop]);
          }
        } catch (err) {
          _didIteratorError16 = true;
          _iteratorError16 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion16 && _iterator16['return']) {
              _iterator16['return']();
            }
          } finally {
            if (_didIteratorError16) {
              throw _iteratorError16;
            }
          }
        }

        return result;
      } else {
        return thing;
      }
    }

    Havelock.struct = function (arg) {
      return Havelock.derive(function () {
        return deepUnpack(arg);
      });
    };

    Havelock.ifThenElse = function (a, b, c) {
      return a.then(b, c);
    };

    Havelock.or = function () {
      for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
        args[_key5] = arguments[_key5];
      }

      return Havelock.derive(function () {
        var val = undefined;
        var _iteratorNormalCompletion17 = true;
        var _didIteratorError17 = false;
        var _iteratorError17 = undefined;

        try {
          for (var _iterator17 = args[Symbol.iterator](), _step17; !(_iteratorNormalCompletion17 = (_step17 = _iterator17.next()).done); _iteratorNormalCompletion17 = true) {
            var arg = _step17.value;

            val = Havelock.unpack(arg);
            if (val) {
              break;
            }
          }
        } catch (err) {
          _didIteratorError17 = true;
          _iteratorError17 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion17 && _iterator17['return']) {
              _iterator17['return']();
            }
          } finally {
            if (_didIteratorError17) {
              throw _iteratorError17;
            }
          }
        }

        return val;
      });
    };

    Havelock.and = function () {
      for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
        args[_key6] = arguments[_key6];
      }

      return Havelock.derive(function () {
        var val = undefined;
        var _iteratorNormalCompletion18 = true;
        var _didIteratorError18 = false;
        var _iteratorError18 = undefined;

        try {
          for (var _iterator18 = args[Symbol.iterator](), _step18; !(_iteratorNormalCompletion18 = (_step18 = _iterator18.next()).done); _iteratorNormalCompletion18 = true) {
            var arg = _step18.value;

            val = Havelock.unpack(arg);
            if (!val) {
              break;
            }
          }
        } catch (err) {
          _didIteratorError18 = true;
          _iteratorError18 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion18 && _iterator18['return']) {
              _iterator18['return']();
            }
          } finally {
            if (_didIteratorError18) {
              throw _iteratorError18;
            }
          }
        }

        return val;
      });
    };

    Havelock.not = function (x) {
      return x.not();
    };

    Havelock.switchCase = function (x) {
      for (var _len7 = arguments.length, args = Array(_len7 > 1 ? _len7 - 1 : 0), _key7 = 1; _key7 < _len7; _key7++) {
        args[_key7 - 1] = arguments[_key7];
      }

      return Derivable['switch'].apply(x, args);
    };

    return Havelock;
  }

  var src_havelock__havelock = havelock_module__havelock();

  function withEquality(equals) {
    return havelock_module__havelock({ equals: equals });
  }

  var r = src_havelock__havelock.Reaction;

  var isAtom = src_havelock__havelock.isAtom;
  var isDerivation = src_havelock__havelock.isDerivation;
  var isLens = src_havelock__havelock.isLens;
  var isReaction = src_havelock__havelock.isReaction;
  var isDerivable = src_havelock__havelock.isDerivable;
  var transact = src_havelock__havelock.transact;
  var atom = src_havelock__havelock.atom;
  var swap = src_havelock__havelock.swap;
  var derive = src_havelock__havelock.derive;
  var lens = src_havelock__havelock.lens;
  var unpack = src_havelock__havelock.unpack;
  var lift = src_havelock__havelock.lift;
  var set = src_havelock__havelock.set;
  var get = src_havelock__havelock.get;
  var struct = src_havelock__havelock.struct;
  var ifThenElse = src_havelock__havelock.ifThenElse;
  var or = src_havelock__havelock.or;
  var and = src_havelock__havelock.and;
  var not = src_havelock__havelock.not;
  var switchCase = src_havelock__havelock.switchCase;

  var src_havelock = src_havelock__havelock;

  exports.withEquality = withEquality;
  exports.Reaction = r;
  exports.isAtom = undefined;
  exports.isDerivation = undefined;
  exports.isLens = undefined;
  exports.isReaction = undefined;
  exports.isDerivable = undefined;
  exports.transact = undefined;
  exports.atom = undefined;
  exports.swap = undefined;
  exports.derive = undefined;
  exports.lens = undefined;
  exports.unpack = undefined;
  exports.lift = undefined;
  exports.set = undefined;
  exports.get = undefined;
  exports.struct = undefined;
  exports.ifThenElse = undefined;
  exports.or = undefined;
  exports.and = undefined;
  exports.not = undefined;
  exports.switchCase = undefined;

  exports['default'] = src_havelock;
});
//# sourceMappingURL=./havelock.js.map