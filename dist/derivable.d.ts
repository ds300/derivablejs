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

    react(f: (value: T) => void, options?: Lifecycle): void;

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

    reactor(r: Reactor<T>): Reactor<T>;
    reactor(f: (value: T) => void): Reactor<T>;
  }

  export interface Atom<T> extends Derivable<T> {

    set<E>(value: E): Atom<E>;

    swap<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Atom<E>;

    lens<E>(lens: Lens<T, E>): Atom<E>;
  }

  export interface Lens<ParentType, ChildType> {

    get(source: ParentType): ChildType;

    set(source: ParentType, value: ChildType): ParentType;
  }

  export interface CompositeLens<T> {

    get(): T;

    set(value: T): void;
  }

  export interface Lifecycle {

    from?: ((() => boolean) | Derivable<boolean>);

    when?: ((() => boolean) | Derivable<boolean>);

    until?: ((() => boolean) | Derivable<boolean>);

    skipFirst?: boolean;

    once?: boolean;

    onStart?: () => void;

    onStop?: () => void;
  }

  export class Reactor<T> {

    constructor ();

    start(): Reactor<T>;

    stop(): Reactor<T>;

    force(): Reactor<T>;

    isActive(): boolean;

    orphan(): Reactor<T>;

    adopt(child: Reactor<any>): Reactor<T>;

    react(value: T): void;

    onStart(): void;

    onStop(): void;
  }

  function atom<T>(value: T): Atom<T>;

  function derivation<T>(f: () => T): Derivable<T>;

  function lens<T>(lens: CompositeLens<T>): Atom<T>;

  function transact(f: () => void): void;

  function transaction(f: (...args: any[]) => any): (...args: any[]) => any;

  function atomically(f: () => void): void;

  function atomic(f: (...args: any[]) => any): (...args: any[]) => any;

  function struct(obj: any): Derivable<any>;

  function unpack(obj: any): any;

  function lift(f: (...args: any[]) => any): (...args: Derivable<any>[]) => Derivable<any>;
  function lift<A, B, E>(f: (a: A, b: B) => E): (a: (A | Derivable<A>), b: (B | Derivable<B>)) => Derivable<E>;
  function lift<A, B, C, E>(f: (a: A, b: B, c: C) => E): (a: (A | Derivable<A>), b: (B | Derivable<B>), c: (C | Derivable<C>)) => Derivable<E>;

  function isAtom(obj: any): boolean;

  function isDerivable(obj: any): boolean;

  function isDerivation(obj: any): boolean;

  function isLensed(obj: any): boolean;

  function isReactor(obj: any): boolean;

  function derive(strings: string[], ...things: any[]): Derivable<string>;

  function or(...conditions: any[]): Derivable<any>;

  function mOr(...conditions: any[]): Derivable<any>;

  function and(...conditions: any[]): Derivable<any>;

  function mAnd(...conditions: any[]): Derivable<any>;

  function withEquality(equals: (a: any, b: any) => boolean): any;

  function defaultEquals(a: any, b: any): boolean;

  function setDebugMode(debugMode: boolean): void;

  export interface Ticker {

    tick(): void;

    release(): void;
  }

  function ticker(): Ticker;
}

export = derivable
