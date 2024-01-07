/**
 * Randomly pick a value in an array
 * @param {T[]} arr array
 * @returns One of the array's values.
 */
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export interface IEqualable<T> {
  equals(other: T): boolean;
}

export interface IStringifyable {
  toString(): string;
}

export interface IEqualableAndStringifyable<T> extends IEqualable<T>, IStringifyable { }
