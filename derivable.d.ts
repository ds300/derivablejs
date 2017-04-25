/**
 * This TypeScript file was generated from derivable.api.edn.
 * Please change that file and re-run `grunt docs` to modify this file.
 */
declare module derivable {

  export interface Derivable<T> {

    derive<E>(f: (value: T) => E): Derivable<E>;
    derive(prop: (string | Derivable<string>)): Derivable<any>;
    derive(index: (number | Derivable<number>)): Derivable<any>;
    derive(re: (RegExp | Derivable<RegExp>)): Derivable<string[]>;
    derive<E>(f: Derivable<(value: T) => E>): Derivable<E>;
    derive(args: any[]): Derivable<any>[];
    derive<A, E>(f: (value: T, a: A) => E, a: (A | Derivable<A>)): Derivable<E>;
    derive<A, B, E>(f: (value: T, a: A, b: B) => E, a: (A | Derivable<A>), b: (B | Derivable<B>)): Derivable<E>;
    derive<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Derivable<E>;

    mDerive<E>(f: (value: T) => E): Derivable<E>;
    mDerive<A, E>(f: (value: T, a: A) => E, a: (A | Derivable<A>)): Derivable<E>;
    mDerive<A, B, E>(f: (value: T, a: A, b: B) => E, a: (A | Derivable<A>), b: (B | Derivable<B>)): Derivable<E>;
    mDerive<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Derivable<E>;

    react(f: (value: T) => void, options?: Lifecycle<T>): void;

    mReact(f: (value: T) => void, options?: Lifecycle<T>): void;

    get(): T;

    is(other: any): Derivable<boolean>;

    and(other: any): Derivable<any>;

    mAnd(other: any): Derivable<any>;

    or(other: any): Derivable<any>;

    mOr(other: any): Derivable<any>;

    then(thenD: any, elseD: any): Derivable<any>;

    mThen(thenD: any, elseD: any): Derivable<any>;

    not(): Derivable<boolean>;

    switch(...args: any[]): Derivable<any>;

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

  function derive<T, A>(f: (a: A) => T, a: A | Derivable<A>): Derivable<T>;

  function derive<T, A, B>(f: (a: A, b: B) => T, a: A | Derivable<A>, b: B | Derivable<B>): Derivable<T>;

  function derive<T, A, B, C>(f: (a: A, b: B, c: C) => T, a: A | Derivable<A>,
    b: B | Derivable<B>, c: C | Derivable<C>): Derivable<T>;

  function derive<T, A, B, C, D>(f: (a: A, b: B, c: C, d: D) => T, a: A | Derivable<A>,
    b: B | Derivable<B>, c: C | Derivable<C>, d: D | Derivable<D>): Derivable<T>;
  
  function derive<T>(f: (...args: any[])=> T, ...args: any[]): Derivable<T>

  function derive(sections: string[], ...values: any[]): Derivable<string>


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

  function or(...conditions: any[]): Derivable<any>;

  function mOr(...conditions: any[]): Derivable<any>;

  function and(...conditions: any[]): Derivable<any>;

  function mAnd(...conditions: any[]): Derivable<any>;

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
