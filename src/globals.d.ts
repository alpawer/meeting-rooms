// Next handles CSS imports through its bundler, but TypeScript needs a
// declaration to accept a side-effect import of a stylesheet.
declare module '*.css';
