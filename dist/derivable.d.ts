/**
 * This TypeScript file was generated from derivable.api.edn.
 * Please change that file and re-run `grunt docs` to modify this file.
 */
declare module derivable {

  export interface Derivable<T> {

    derive<E>(f: (value: T) => E): Derivable<E>;
    derive<A, E>(f: (value: T, a: A) => E, a: A): Derivable<E>;
    derive<A, E>(f: (value: T, a: A) => E, a: Derivable<A>): Derivable<E>;
    derive<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Derivable<E>;

    mDerive<E>(f: (value: T) => E): Derivable<E>;
    mDerive<A, E>(f: (value: T, a: A) => E, a: A): Derivable<E>;
    mDerive<A, E>(f: (value: T, a: A) => E, a: Derivable<A>): Derivable<E>;
    mDerive<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Derivable<E>;

    reactor(r: Reactor<T>): Reactor<T>;
    reactor(f: (value: T) => void): Reactor<T>;

    react(r: Reactor<T>): Reactor<T>;
    react(f: (value: T) => void): Reactor<T>;

    reactWhen(cond: Derivable<any>, f: (value: T) => void): Reactor<T>;
    reactWhen(cond: Derivable<any>, r: Reactor<T>): Reactor<T>;

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

  function swap<A, B>(atom: Atom<A>, f: (a: A, ...args: any[]) => B, ...args: any[]): B;

  function derivation<T>(f: () => T): Derivable<T>;

  function derive<I, O>(d: Derivable<I>, f: (v: I) => O): Derivable<O>;
  function derive<I, O, A>(d: Derivable<I>, f: (v: I, a: A) => O, a: A): Derivable<O>;
  function derive<I, O, A>(d: Derivable<I>, f: (v: I, a: A) => O, a: Derivable<A>): Derivable<O>;
  function derive<I, O>(d: Derivable<I>, f: (v: I, ...args: any[]) => O, ...args: any[]): Derivable<O>;
  function derive(strings: string[], ...things: any[]): Derivable<string>;

  function mDerive<I, O>(d: Derivable<I>, f: (v: I) => O): Derivable<O>;
  function mDerive<I, O, A>(d: Derivable<I>, f: (v: I, a: A) => O, a: A): Derivable<O>;
  function mDerive<I, O, A>(d: Derivable<I>, f: (v: I, a: A) => O, a: Derivable<A>): Derivable<O>;
  function mDerive<I, O>(d: Derivable<I>, f: (v: I, ...args: any[]) => O, ...args: any[]): Derivable<O>;

  function transact(f: () => void): void;

  function transaction(f: (...args: any[]) => any): (...args: any[]) => any;

  function unpack(obj: any): any;

  function struct(obj: any): Derivable<any>;

  function lookup(obj: Derivable<any>, key: any): Derivable<any>;

  function destruct(obj: Derivable<any>, ...keys: any[]): Derivable<any>[];

  function ifThenElse(condition: any, thenD: any, elseD: any): Derivable<any>;

  function mIfThenElse(condition: any, thenD: any, elseD: any): Derivable<any>;

  function or(...conditions: any[]): Derivable<any>;

  function mOr(...conditions: any[]): Derivable<any>;

  function and(...conditions: any[]): Derivable<any>;

  function mAnd(...conditions: any[]): Derivable<any>;

  function not(d: Derivable<any>): Derivable<boolean>;

  function switchCase(d: Derivable<any>, ...args: any[]): Derivable<any>;

  function get<T>(d: Derivable<T>): T;

  function set<A, B>(a: Atom<A>, v: B): Atom<B>;

  function lens<T>(lens: CompositeLens<T>): Atom<T>;
  function lens<A, B>(atom: Atom<A>, lens: Lens<A, B>): Atom<B>;

  function lift(f: (...args: any[]) => any): (...args: Derivable<any>[]) => Derivable<any>;

  function isAtom(obj: any): boolean;

  function isDerivable(obj: any): boolean;

  function isDerivation(obj: any): boolean;

  function isLensed(obj: any): boolean;

  function isReactor(obj: any): boolean;

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
