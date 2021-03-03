function isFunction(fn) {
  return typeof fn === 'function'
}

function secondsToMilliseconds(sec) {
  return sec * 1000
}

function isErrorHandlingMiddleware(fn) {
  return fn.length >= 3
}

function messageToContext(message) {
  return { message }
}

function formatLogMessage(msg) {
  return `${new Date().toISOString()} [Sqeasy]: ${msg}`
}

function nop() {}

module.exports = {
  isFunction,
  secondsToMilliseconds,
  isErrorHandlingMiddleware,
  messageToContext,
  formatLogMessage,
  nop
}
