function derivation_createPrototype (havelock, opts) {
  return {
    _clone: function () {
      return havelock.derivation(this._deriver);
    },

    _forceGet: function () {
      var that = this;
      var newParents = parents_capturingParents(function () {
        var newState = that._deriver();
        that._state = opts.equals(newState, that._value) ? gc_UNCHANGED : gc_CHANGED;
        that._value = newState;
      });

      // organise parents
      for (var i = this._parents.length; i--;) {
        var possiblyFormerParent = this._parents[i];
        if (!util_arrayContains(newParents, possiblyFormerParent)) {
          util_removeFromArray(possiblyFormerParent._children, this);
        }
      }

      this._parents = newParents;

      // add this as child to new parents
      for (var i = newParents.length; i--;) {
        util_addToArray(newParents[i]._children, this);
      }
    },

    _get: function () {
      outer: switch (this._state) {
      case gc_NEW:
      case gc_ORPHANED:
        this._forceGet();
        break;
      case gc_UNSTABLE:
        for (var i = this._parents.length; i--;) {
          var parent = this._parents[i], parentState = parent._state;
          if (parentState === gc_UNSTABLE ||
              parentState === gc_ORPHANED ||
              parentState === gc_DISOWNED) {
            parent._get();
          }
          parentState = parent._state;
          if (parentState === gc_CHANGED) {
            this._forceGet();
            break outer;
          } else if (!(parentState === gc_STABLE ||
                       parentState === gc_UNCHANGED)) {
            throw new Error("invalid parent mode: " + parentState);
          }
        }
        this._state = gc_UNCHANGED;
        break;
      case gc_DISOWNED:
        var parents = [];
        for (var i = this._parents.length; i--;) {
          var parentStateTuple = this._parents[i],
              parent = parentStateTuple[0],
              state = parentStateTuple[1];
          if (!opts.equals(parent._get(), state)) {
            this._parents = [];
            this._forceGet();
            break outer;
          } else {
            parents.push(parent);
          }
        }
        for (var i = parents.length; i--;) {
          util_addToArray(parents[i]._children, this);
        }
        this._parents = parents;
        this._state = gc_UNCHANGED;
        break;
      default:
        // noop
      }

      return this._value;
    }
  }
}

function derivation_construct(obj, deriver) {
  obj._children = [];
  obj._parents = [];
  obj._deriver = deriver;
  obj._state = gc_NEW;
  obj._type = types_DERIVATION;
  obj._value = {};
  return obj;
}
