/**
 * This TypeScript file was generated from derivable.api.edn.
 * Please change that file and re-run `grunt docs` to modify this file.
 */
declare module derivable {

  export interface Derivable<T> {

    derive<E>(f: (value: T) => E): Derivable<E>;

    mDerive<E>(f: (value: T) => E): Derivable<E>;

    react(f: (value: T) => void, options?: Lifecycle<T>): void;

    mReact(f: (value: T) => void, options?: Lifecycle<T>): void;

    get(): T;

    map<E>(f: (value: T) => E): Derivable<E>;

    mMap<E>(f: (value: T) => E): Derivable<E>;

    is(other: any): Derivable<boolean>;

    withEquality(equals: (a: any, b: any) => boolean): this;
  }

  export interface Atom<T> extends Derivable<T> {

    set<E>(value: E): Atom<E>;

    update<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Atom<E>;

    proxy<E>(proxy: Proxy<T, E>): Atom<E>;
  }

  export interface Proxy<ParentType, ChildType> {

    get(source: ParentType): ChildType;

    set(source: ParentType, value: ChildType): ParentType;
  }

  export interface CompositeProxy<T> {

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

  function proxy<T>(proxy: CompositeProxy<T>): Atom<T>;

  function transact(f: () => void): void;

  function transaction(f: (...args: any[]) => any): (...args: any[]) => any;

  function atomically(f: () => void): void;

  function atomic(f: (...args: any[]) => any): (...args: any[]) => any;

  function struct(obj: any): Derivable<any>;

  function unpack(obj: any): any;

  function isAtom(obj: any): boolean;

  function isDerivable(obj: any): boolean;

  function isDerivation(obj: any): boolean;

  function isProxy(obj: any): boolean;

  function derive(strings: string[], ...things: any[]): Derivable<string>;

  function wrapPreviousState<A, B>(fn: (currentState: A, previousState: A) => B, init?: A): (currentState: A) => B;

  function captureDereferences(fn: () => void): Derivable<any>[];

  function setDebugMode(debugMode: boolean): void;

  export interface Ticker {

    tick(): void;

    release(): void;
  }

  function ticker(): Ticker;
}

export = derivable
