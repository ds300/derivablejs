import $$observable from 'symbol-observable'
import {Reactor} from './reactors';

export var observablePrototype = {};

observablePrototype[$$observable] = function() {
  var value = this;

  return {
    subscribe: function(observer) {
      function pushNext(value) {
        if (observer.next) {
          observer.next(value);
        }
      }

      pushNext(value.get());

      var reactor = new Reactor(value, pushNext);
      reactor.start();

      return {
        unsubscribe: function() {
          reactor.stop();
        }
      };
    }
  };
};
