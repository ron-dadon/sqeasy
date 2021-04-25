function getSqsMock() {
  return {
    api: { serviceId: 'SQS' },
    receiveMessage: getMockedPromise(function() {
      return new Promise.resolve()
    }),
    deleteMessage: getMockedPromise(function() {
      return new Promise.resolve()
    }),
    deleteMessageBatch: getMockedPromise(function() {
      return new Promise.resolve()
    })
  }
}

function getMockedPromise(mockImplementation) {
  return jest.fn(function() {
    return {
      promise: jest.fn(mockImplementation)
    }
  })
}

module.exports = {
  getSqsMock,
  getMockedPromise
}
