declare module havelock {
export interface Derivable<T> {
derive<E>(f: (value: T) => E): Derivable<E>;
reaction(r: Reaction<T>): Reaction<T>;
reaction(f: (value: T) => void): Reaction<T>;
react(r: Reaction<T>): Reaction<T>;
react(f: (value: T) => void): Reaction<T>;
get(): T;
is(other: any): Derivable<boolean>;
}

}
