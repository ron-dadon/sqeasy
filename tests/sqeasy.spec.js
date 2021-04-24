const sqeasy = require('../src/sqeasy.js')
const { getSqsMock, getMockedPromise } = require('./sqs-mock.js')

function fn() {}

const sqs = getSqsMock()
const logger = { log: jest.fn(), error: jest.fn() }

describe('sqeasy', function () {
  beforeEach(function() {
    jest.clearAllMocks()
  })

  describe('app factory', function() {
    it('should throw error if no sqs instance provided', function () {
      expect(function() {
        sqeasy()
      }).toThrow()
    })

    it('should throw error if no valid sqs instance provided', function () {
      expect(function() {
        sqeasy({ sqs: { api: {} } })
      }).toThrow()
    })

    it('should create sqeasy app instance if valid sqs instance provided', function () {
      expect(function() {
        sqeasy({ sqs })
      }).not.toThrow()
    })

    it('should throw error if logger does not contain log method', function () {
      expect(function() {
        sqeasy({ sqs, logger: { error: fn } })
      }).toThrow()
    })

    it('should throw error if logger does not contain error method', function () {
      expect(function() {
        sqeasy({ sqs, logger: { log: fn } })
      }).toThrow()
    })

    it('should create sqeasy app instance if valid logger instance provided', function () {
      expect(function() {
        sqeasy({ sqs, logger })
      }).not.toThrow()
    })
  })

  describe('use', function() {
    const app = sqeasy({ sqs, logger })

    it('should throw error if called without parameters', function() {
      expect(function() { app.use() }).toThrow()
    })

    it('should throw error if called with a non function parameter', function() {
      expect(function() { app.use(fn, 1) }).toThrow()
    })
  })

  describe('match', function() {
    const app = sqeasy({ sqs, logger })

    it('should throw error if called without matcher function', function() {
      expect(function() { app.match() }).toThrow()
    })

    it('should throw error if called with a non function parameter', function() {
      expect(function() { app.match(1) }).toThrow()
    })

    it('should throw error if called with a matcher with more than 1 argument', function() {
      expect(function() { app.match(function(a, b) { }) }).toThrow()
    })

    it('should throw error if called with a matcher but no middlewares', function() {
      expect(function() { app.match(function(a) { }) }).toThrow()
    })

    it('should throw error if called with a matcher and following arguments are non function', function() {
      expect(function() { app.match(function(a) { }, 1) }).toThrow()
    })

    it('should not throw error if called with a matcher and following arguments are functions', function() {
      expect(function() { app.match(function(a) { }, fn) }).not.toThrow()
    })
  })

  describe('stop', function() {
    const app = sqeasy({ sqs, logger })

    it('should stop and log message', function() {
      app.stop()
      expect(logger.log).toHaveBeenCalled()
    })
  })

  describe('pull', function() {
    const mockedSqs = getSqsMock()

    mockedSqs.receiveMessage = getMockedPromise(async function() {
      return { Messages: [{}] }
    })

    mockedSqs.deleteMessage = getMockedPromise(async function() {
      return true
    })

    const app = sqeasy({ sqs: mockedSqs, logger })

    afterEach(function() {
      app.stop()
    })

    it('should pull and execute middlewares', function(done) {
      const mw = jest.fn(function({ message }, next) {
        next()
      })

      app.use(mw)
      app.pull({ queueUrl: 'TEST' })
      setTimeout(function() {
        expect(mw).toHaveBeenCalled()
        done()
      }, 100)
    })

    it('should fail on pull and throw error', function(done) {
      const mw = jest.fn(function({ message }, next) {
        next()
      })

      mockedSqs.receiveMessage = getMockedPromise(async function() {
        throw new Error('Unauthorized')
      })

      app.use(mw)
      expect(app.pull({ queueUrl: 'TEST' })).rejects.toThrow()
      setTimeout(function() {
        expect(mw).not.toHaveBeenCalled()
        done()
      }, 100)
    })
  })
})
