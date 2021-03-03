const {
  isFunction,
  secondsToMilliseconds,
  isErrorHandlingMiddleware,
  messageToContext,
  formatLogMessage,
  nop
} = require('../src/utils.js')

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

describe('formatLogMessage', function() {
  it('Should be in the log format <TIMESTAMP> [Sqeasy]: <MSG>', function() {
    const log = formatLogMessage('test')
    //2021-03-03T11:12:11.187Z
    expect(log).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z \[Sqeasy]: test$/)
  })
})

describe('nop', function() {
  it('nop should be a function', function() {
    expect(typeof nop === 'function').toBeTruthy()
  })
  it('should not have input and should not return output', function() {
    expect(nop.length).toEqual(0)
    expect(nop()).not.toBeDefined()
  })
})
