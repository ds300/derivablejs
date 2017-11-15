export default (typeof window === "object"
  ? window
  : typeof global === "object" ? global : {});
