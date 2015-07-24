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

  export interface Mutable<T> {

    set<E>(value: E): Mutable<E>;

    swap<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Mutable<E>;

    lens<E>(descriptor: LensDescriptor<T, E>): Lens<E>;
  }

  export interface LensDescriptor<ParentType, ChildType> {

    get(source: ParentType): ChildType;

    set(source: ParentType, value: ChildType): ParentType;
  }

  export interface Atom<T> extends Derivable<T>, Mutable<T> {}

  export interface Lens<T> extends Derivable<T>, Mutable<T> {}

  export interface Reaction<T> {

    start(): Reaction<T>;

    stop(): Reaction<T>;

    force(): Reaction<T>;
  }
}
