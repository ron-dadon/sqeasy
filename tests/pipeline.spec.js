const pipeline = require('../src/pipeline.js')
const { PipelineTimeoutError } = require('../src/pipeline.js')

describe('Pipeline', function() {
  const e = new Error('error')
  const mw1 = jest.fn(function(msg, next) {
    next()
  })
  const mw2 = jest.fn(function(msg, next) {
    next()
  })
  const mwError = jest.fn(function(msg, next) {
    next(e)
  })
  // eslint-disable-next-line no-unused-vars
  const mwThrowError = jest.fn(function(msg, next) {
    throw e
  })
  const mwErrorHandler = jest.fn(function(err, msg, next) {
    next(err)
  })
  const mwErrorHandler2 = jest.fn(function(err, msg, next) {
    next()
  })
  const mwErrorHandler3 = jest.fn(function(err, msg, next) {
    next()
  })
  const mwTimeout = jest.fn(function(msg, next) {
    setTimeout(next, 100)
  })

  beforeEach(function() {
    jest.clearAllMocks()
  })

  it('should create an empty pipeline',  function() {
    const p = pipeline()
    expect(p).toHaveProperty('use')
    expect(p).toHaveProperty('execute')
  })

  it('should create a pipeline with middleware and run it on execute', async function() {
    const p = pipeline(mw1)
    await expect(p.execute({})).resolves.toBeUndefined()
    expect(mw1).toHaveBeenCalledTimes(1)
  })

  it('should create a pipeline with multiple middlewares and run them on execute', async function() {
    const p = pipeline(mw1, mw2)
    await expect(p.execute({})).resolves.toBeUndefined()
    expect(mw1).toHaveBeenCalledTimes(1)
    expect(mw2).toHaveBeenCalledTimes(1)
  })

  it('should create a pipeline, add middlewares with use and run them on execute', async function() {
    const p = pipeline()
    p.use(mw1)
    p.use(mw2)
    await expect(p.execute({})).resolves.toBeUndefined()
    expect(mw1).toHaveBeenCalledTimes(1)
    expect(mw2).toHaveBeenCalledTimes(1)
  })

  it('should create a pipeline with middlewares, add middlewares with use and run them on execute', async function() {
    const p = pipeline(mw1)
    p.use(mw2)
    await expect(p.execute({})).resolves.toBeUndefined()
    expect(mw1).toHaveBeenCalledTimes(1)
    expect(mw2).toHaveBeenCalledTimes(1)
  })

  it('should reject with an error if error is thrown in middleware and there is no error handling',  async function() {
    const p = pipeline(mw1, mwThrowError)
    await expect(p.execute({})).rejects.toThrow(e)
  })

  it('should resolve if error is thrown in middleware and there is error handling',  async function() {
    const p = pipeline(mw1, mwThrowError, mw2, mwErrorHandler)
    const msg = {}
    await expect(p.execute(msg)).rejects.toThrow(e)
    expect(mwErrorHandler).toHaveBeenCalled()
    expect(mw1).toHaveBeenCalled()
    expect(mw2).not.toHaveBeenCalled()
    expect(mwErrorHandler.mock.calls[0][0]).toEqual(e)
    expect(mwErrorHandler.mock.calls[0][1]).toEqual(msg)
  })

  it('should resolve if error is passed in next in middleware and there is error handling',  async function() {
    const p = pipeline(mw1, mwError, mw2, mwErrorHandler)
    const msg = {}
    await expect(p.execute(msg)).rejects.toThrow(e)
    expect(mwErrorHandler).toHaveBeenCalled()
    expect(mw1).toHaveBeenCalled()
    expect(mw2).not.toHaveBeenCalled()
    expect(mwErrorHandler.mock.calls[0][0]).toEqual(e)
    expect(mwErrorHandler.mock.calls[0][1]).toEqual(msg)
  })

  it('should resolve if error is passed in next in middleware and there is error handling and not call third handler',  async function() {
    const p = pipeline(mw1, mwError, mw2, mwErrorHandler, mwErrorHandler2, mwErrorHandler3)
    const msg = {}
    await expect(p.execute(msg)).resolves.toBeUndefined()
    expect(mwErrorHandler).toHaveBeenCalled()
    expect(mw1).toHaveBeenCalled()
    expect(mw2).not.toHaveBeenCalled()
    expect(mwErrorHandler2).toHaveBeenCalled()
    expect(mwErrorHandler3).not.toHaveBeenCalled()
    expect(mwErrorHandler.mock.calls[0][0]).toEqual(e)
    expect(mwErrorHandler.mock.calls[0][1]).toEqual(msg)
  })

  it('should fail execution if timeout is not a valid integer',  async function() {
    const p = pipeline(mw1)
    const msg = {}
    await expect(p.execute(msg, 'test')).rejects.toThrow('Pipeline execution timeout must be a valid integer')
    expect(mw1).not.toHaveBeenCalled()
  })

  it('should fail execution if timeout is less than 1',  async function() {
    const p = pipeline(mw1)
    const msg = {}
    await expect(p.execute(msg, 0)).rejects.toThrow('Pipeline execution timeout must be greater than 0')
    expect(mw1).not.toHaveBeenCalled()
  })

  it('should fail execution if timeout reached',  async function() {
    jest.useRealTimers()
    const p = pipeline(mwTimeout, mw1)
    const msg = {}
    await expect(p.execute(msg, 10)).rejects.toThrow(PipelineTimeoutError)
    expect(mwTimeout).toHaveBeenCalled()
    expect(mw1).not.toHaveBeenCalled()
  })

  it('should not fail execution if timeout was not reached',  async function() {
    jest.useRealTimers()
    const p = pipeline(mwTimeout, mw1)
    const msg = {}
    await expect(p.execute(msg, 200)).resolves.toBeUndefined()
    expect(mwTimeout).toHaveBeenCalled()
    expect(mw1).toHaveBeenCalled()
  })
})
