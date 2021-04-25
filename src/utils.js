function isFunction(fn) {
  return typeof fn === 'function'
}

function secondsToMilliseconds(sec) {
  return sec * 1000
}

function isErrorHandlingMiddleware(fn) {
  return fn.length >= 3
}

function formatLogMessage(msg) {
  return `${new Date().toISOString()} [Sqeasy]: ${msg}`
}

module.exports = {
  isFunction,
  secondsToMilliseconds,
  isErrorHandlingMiddleware,
  formatLogMessage
}
