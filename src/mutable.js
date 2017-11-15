import { Proxy } from "./proxy";

export const mutablePrototype = {
  update(f, ...args) {
    return this.set(f(this.get(), ...args));
  },

  proxy(monoProxyMapping) {
    return new Proxy({
      get: () => {
        return monoProxyMapping.get(this.get());
      },
      set: val => {
        this.set(monoProxyMapping.set(this.get(), val));
      }
    });
  }
};
