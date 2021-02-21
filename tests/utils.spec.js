const { isFunction, secondsToMilliseconds } = require('../src/utils.js')

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