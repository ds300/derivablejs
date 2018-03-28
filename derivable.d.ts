declare module derivable {

  export interface Derivable<T> {

    derive<E>(f: (value: T) => E): Derivable<E>;

    maybeDerive<E>(f: (value: T) => E): Derivable<E>;

    orDefault<E>(value: E): Derivable<T | E>

    react(f: (value: T) => void, options?: Lifecycle<T>): void;

    maybeReact(f: (value: T) => void, options?: Lifecycle<T>): void;

    get(): T;

    is(other: any): Derivable<boolean>;

    withEquality(equals: (a: T, b: T) => boolean): this;
  }

  export interface Atom<T> extends Derivable<T> {

    set(value: T): void;

    update(f: (value: T) => T): void;
    update<A>(f: (value: T, a: A) => T, a: A): void;
    update<A, B>(f: (value: T, a: A, b: B) => T, a: A, b: B): void;
    update<A, B, C>(f: (value: T, a: A, b: B, c: C) => T, a: A, b: B, c: C): void;
    update<A, B, C, D>(f: (value: T, a: A, b: B, c: C, d: D) => T, a: A, b: B, c: C, d: D): void;
  }

  export interface Lens<T> extends Atom<T> {}

  export interface LensDescriptor<T> {

    get(): T;

    set(value: T): void;
  }

  export interface Lifecycle<T> {

    from?: (((d: Derivable<T>) => boolean) | Derivable<boolean>);

    when?: (((d: Derivable<T>) => boolean) | Derivable<boolean>);

    until?: (((d: Derivable<T>) => boolean) | Derivable<boolean>);

    skipFirst?: boolean;

    once?: boolean;
  }

  function atom<T>(value: T): Atom<T>;

  function derive<T>(f: () => T): Derivable<T>;

  function lens<T>(descriptor: LensDescriptor<T>): Lens<T>;

  function transact(f: () => void): void;

  function transaction<F extends Function>(f: F): F;

  function atomically(f: () => void): void;

  function atomic<F extends Function>(f: F): F;

  function struct(obj: any): Derivable<any>;

  function unpack(obj: any): any;

  function isAtom(obj: any): boolean;

  function isDerivable(obj: any): boolean;

  function isDerivation(obj: any): boolean;

  function isLens(obj: any): boolean;

  function setDebugMode(debugMode: boolean): void;

  export interface Ticker {

    tick(): void;

    release(): void;
  }

  function ticker(): Ticker;
}

export = derivable
