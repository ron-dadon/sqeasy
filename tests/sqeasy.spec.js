const sqeasy = require('../src/sqeasy.js')

const sqs = {
  api: { serviceId: 'SQS' }
}

describe('sqeasy', function () {
  it('should throw error if no sqs instance provided', function () {
    expect(function() {
      sqeasy()
    }).toThrow()
  })
  it('should throw error if no valid sqs instance provided', function () {
    expect(function() {
      sqeasy({ api: {} })
    }).toThrow()
  })
  it('should create sqeasy app instance if valid sqs instance provided', function () {
    expect(function() {
      sqeasy(sqs)
    }).not.toThrow()
  })
})
