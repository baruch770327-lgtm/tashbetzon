// Pure screen-history stack (used for the in-app ✕ buttons and Android back).
export function createHistory() {
  const stack = [];
  return {
    push(name, params = {}) { stack.push({ name, params }); },
    replace(name, params = {}) {
      if (stack.length) stack[stack.length - 1] = { name, params };
      else stack.push({ name, params });
    },
    back() {
      if (stack.length <= 1) return false;
      stack.pop();
      return true;
    },
    reset(name, params = {}) { stack.length = 0; stack.push({ name, params }); },
    current() { return stack.length ? stack[stack.length - 1] : null; },
    depth() { return stack.length; },
  };
}
