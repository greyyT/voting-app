type DeepReadonly<T> = T extends (...args: unknown[]) => unknown ? T : { readonly [P in keyof T]: DeepReadonly<T[P]> };
