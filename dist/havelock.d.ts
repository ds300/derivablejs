/**
 * This TypeScript file was generated from havelock.api.edn.
 * Please change that file and re-run `grunt docs` to modify this file.
 */
declare module 'havelock' {

  export interface Derivable<T> {

    derive<E>(f: (value: T) => E): Derivable<E>;

    reaction(r: Reaction<T>): Reaction<T>;
    reaction(f: (value: T) => void): Reaction<T>;

    react(r: Reaction<T>): Reaction<T>;
    react(f: (value: T) => void): Reaction<T>;

    get(): T;

    is(other: any): Derivable<boolean>;

    and(other: any): Derivable<any>;

    or(other: any): Derivable<any>;

    then(thenD: any, elseD: any): Derivable<any>;

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

  export class Reaction<T> {

    constructor ();

    start(): Reaction<T>;

    stop(): Reaction<T>;

    force(): Reaction<T>;

    react(value: T): void;

    onStart(): void;

    onStop(): void;
  }

  function atom<T>(value: T): Atom<T>;

  function swap<A, B>(atom: Atom<A>, f: (a: A, ...args: any[]) => B, ...args: any[]): B;

  function derive<T>(f: () => T): Derivable<T>;
  function derive(strings: string[], ...things: any[]): Derivable<string>;
  function derive<A, B>(d: Derivable<A>, f: (a: A) => B): Derivable<B>;
  function derive<A, B, C>(d1: Derivable<A>, d2: Derivable<B>, f: (a: A, b: B) => C): Derivable<C>;
  function derive<A, B, C, D>(d1: Derivable<A>, d2: Derivable<B>, d3: Derivable<C>, f: (a: A, b: B, c: C) => D): Derivable<D>;
  function derive<A, B, C, D, E>(d1: Derivable<A>, d2: Derivable<B>, d3: Derivable<C>, d4: Derivable<D>, f: (a: A, b: B, c: C, d: D) => E): Derivable<E>;
  function derive(...args: any[]): Derivable<any>;

  function transact(f: () => void): void;

  function unpack(obj: any): any;

  function struct(obj: any): Derivable<any>;

  function ifThenElse(condition: Derivable<any>, thenD: any, elseD: any): Derivable<any>;

  function or(...conditions: any[]): Derivable<any>;

  function and(...conditions: any[]): Derivable<any>;

  function not(d: Derivable<any>): Derivable<boolean>;

  function switchCase(d: Derivable<any>, ...args: any[]): Derivable<any>;

  function get<T>(d: Derivable<T>): T;

  function set<A, B>(a: Atom<A>, v: B): Atom<B>;

  function lens<A, B>(atom: Atom<A>, lens: Lens<A, B>): Atom<B>;

  function lift(f: (...args: any[]) => any): (...args: Derivable<any>[]) => Derivable<any>;

  function isAtom(obj: any): boolean;

  function isDerivable(obj: any): boolean;

  function isDerivation(obj: any): boolean;

  function isLensed(obj: any): boolean;

  function isReaction(obj: any): boolean;
}
