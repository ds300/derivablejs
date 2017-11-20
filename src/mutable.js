export const mutablePrototype = {
  update(f, a, b, c, d) {
    switch (arguments.length) {
      case 0:
        throw Error("update method accepts at least 1 argument");
      case 1:
        return this.set(f(this.get()));
      case 2:
        return this.set(f(this.get(), a));
      case 3:
        return this.set(f(this.get(), a, b));
      case 4:
        return this.set(f(this.get(), a, b, c));
      case 5:
        return this.set(f(this.get(), a, b, c, d));
      default:
        throw Error("update method accepts only 5 arguments");
    }
  }
};
