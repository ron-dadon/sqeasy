const sqeasy = require('../src/sqeasy.js')

const sqs = {
  api: { serviceId: 'SQS' },
  receiveMessage: jest.fn(function(parameters) {
    return {
      promise: jest.fn(function() {
        return new Promise.resolve()
      })
    }
  }),
  deleteMessage: jest.fn(function(parameters) {
    return {
      promise: jest.fn(function() {
        return new Promise.resolve()
      })
    }
  }),
  deleteMessageBatch: jest.fn(function(parameters) {
    return {
      promise: jest.fn(function() {
        return new Promise.resolve()
      })
    }
  })
}

describe('sqeasy', function () {
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
})
