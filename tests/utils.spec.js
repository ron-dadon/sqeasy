const { isFunction, secondsToMilliseconds, isErrorHandlingMiddleware, messageToContext } = require('../src/utils.js')

describe('isFunction', function() {
  it('should return true if argument is a function', function() {
    expect(isFunction(function() {})).toBeTruthy()
  })

  it('should return false if argument is not a function', function() {
    expect(isFunction({})).toBeFalsy()
  })
})

describe('secondsToMilliseconds', function() {
  it('should return milliseconds of seconds', function() {
    expect(secondsToMilliseconds(1)).toEqual(1000)
  })
})

describe('isErrorHandlingMiddleware', function() {
  it('should return true if function takes 3 or more arguments', function() {
    expect(isErrorHandlingMiddleware(function(a, b, c) {})).toBeTruthy()
    expect(isErrorHandlingMiddleware(function(a, b, c, d) {})).toBeTruthy()
  })

  it('should return true if function takes 2 or less arguments', function() {
    expect(isErrorHandlingMiddleware(function(a, b) {})).toBeFalsy()
    expect(isErrorHandlingMiddleware(function(a) {})).toBeFalsy()
    expect(isErrorHandlingMiddleware(function() {})).toBeFalsy()
  })
})

describe('messageToContext', function() {
  it('should return an object with message property', function() {
    const message = { test: 1 }
    const context = messageToContext(message)
    expect(context).toEqual({ message })
    expect(context.message).toBe(message)
  })
})
