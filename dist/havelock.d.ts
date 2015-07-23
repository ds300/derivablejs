/**
 * butt
 */
declare module havelock {

  /*
   * bean
   */
  export interface Derivable<T> {

    /**
     * abbs
     */
    derive<E>(f: (value: T) => E): Derivable<E>;

    /**
     * panal
     */
    reaction(r: Reaction<T>): Reaction<T>;

    /**
     * fegi
     */
    reaction(f: (value: T) => void): Reaction<T>;
    react(r: Reaction<T>): Reaction<T>;
    react(f: (value: T) => void): Reaction<T>;

    get(): T;

    is(other: any): Derivable<boolean>;

    and(other: any): Derivable<any>;

    or(other: any): Derivable<any>;

    then(thenValue: any, elseValue: any): Derivable<any>;

    not(): Derivable<boolean>;

    switch(...args: any[]): Derivable<any>;
  }

  export interface Mutable<T> {
    set<E>(value: E): Mutable<E>;
    swap<E>(f: (value: T, ...args: any[]) => E, ...args: any[]): Mutable<E>;
    lens<E>(descriptor: LensDescriptor<T, E>): Lens<E>;
  }

  export interface LensDescriptor<S, D> {
    get(source: S): D;
    set(source: S, value: any): S;
  }

  export interface Atom<T> extends Derivable<T>, Mutable<T> {}
  export interface Lens<T> extends Derivable<T>, Mutable<T> {}

  export interface Reaction<T> {
    start(): Reaction<T>;
    stop(): Reaction<T>;
    force(): Reaction<T>;
  }

}
