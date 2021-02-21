function isFunction(fn) {
  return typeof fn === 'function'
}

function secondsToMilliseconds(sec) {
  return sec * 1000
}

module.exports = {
  isFunction,
  secondsToMilliseconds
}