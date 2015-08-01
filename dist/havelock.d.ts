/**
 * This TypeScript file was generated from havelock.api.edn.
 * Please change that file and re-run `grunt docs` to modify this file.
 */
declare module havelock {

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

  atom<T>(value: T): Atom<T>;

  swap<A, B>(atom: Atom<A>, f: (a: A, ...args: any[]) => B, ...args: any[]): B;

  derive<T>(f: () => T): Derivable<T>;
  derive(strings: string[], ...things: any[]): Derivable<string>;
  derive<A, B>(d: Derivable<A>, f: (a: A) => B): Derivable<B>;
  derive<A, B, C>(d1: Derivable<A>, d2: Derivable<B>, f: (a: A, b: B) => C): Derivable<C>;
  derive<A, B, C, D>(d1: Derivable<A>, d2: Derivable<B>, d3: Derivable<C>, f: (a: A, b: B, c: C) => D): Derivable<D>;
  derive<A, B, C, D, E>(d1: Derivable<A>, d2: Derivable<B>, d3: Derivable<C>, d4: Derivable<D>, f: (a: A, b: B, c: C, d: D) => E): Derivable<E>;
  derive(...ds: Derivable<any>[], f: (...args: any[]) => any): Derivable<any>;

  transact(f: () => void): void;

  unpack(obj: any): any;

  struct(obj: any): Derivable<any>;

  ifThenElse(condition: Derivable<any>, thenD: any, elseD: any): Derivable<any>;

  or(...conditions: any[]): Derivable<any>;

  and(...conditions: any[]): Derivable<any>;

  not(d: Derivable<any>): Derivable<boolean>;

  switchCase(d: Derivable<any>, ...args: any[]): Derivable<any>;

  get<T>(d: Derivable<T>): T;

  set<A, B>(a: Atom<A>, v: B): Atom<B>;

  lens<A, B>(atom: Atom<A>, lens: Lens<A, B>): Atom<B>;

  lift(f: (...args: any[]) => any): (...args: Derivable<any>[]) => Derivable<any>;

  isAtom(obj: any): boolean;

  isDerivable(obj: any): boolean;

  isDerivation(obj: any): boolean;

  isLensed(obj: any): boolean;

  isReaction(obj: any): boolean;
}
