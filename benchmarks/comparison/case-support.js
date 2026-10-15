export const host = () => document.querySelector('#root');
export const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};
