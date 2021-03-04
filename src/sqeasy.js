const pipeline = require('./pipeline.js')
const {
  isFunction,
  secondsToMilliseconds,
  formatLogMessage,
  messageToContext,
  nop
} = require('./utils.js')

const DEFAULT_WAIT_TIME = 10
const DEFAULT_BATCH_SIZE = 10

const EMPTY_LOGGER = { log: nop, error: nop }

function sqeasy(sqs) {
  // Primitive way of confirming sqs exists and is the actual AWS SQS instance
  if (!sqs || !sqs.api || sqs.api.serviceId !== 'SQS') throw new Error('Sqeasy must be initialized with a valid AWS SQS instance')

  const middlewares = pipeline()
  let running = false
  let _logger = EMPTY_LOGGER

  const subscription = {
    queueUrl: null,
    batchSize: DEFAULT_BATCH_SIZE,
    waitTime: DEFAULT_WAIT_TIME,
    waitTimeMs: secondsToMilliseconds(DEFAULT_WAIT_TIME),
    timeoutHandler: null,
    attributes: [],
    messageAttributes: [],
    logParameters: function() {
      return `Batch Size: ${this.batchSize}, Wait Time: ${this.waitTime} seconds, Attributes: [${(this.attributes.length && this.attributes.join(', ')) || 'none'}], Message Attributes: [${(this.messageAttributes.length && this.messageAttributes.join(', ')) || 'none'}]`
    },
    toSQSParams: function() {
      return {
        VisibilityTimeout: this.waitTime,
        WaitTimeSeconds: this.waitTime,
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.batchSize,
        MessageAttributeNames: this.messageAttributes,
        AttributeNames: this.attributes,
      }
    }
  }

  function use(...fns) {
    if (running) throw new Error('Cannot add middlewares while Sqeasy is running')
    if (!fns.every(isFunction)) throw new Error('use can only accept functions as arguments')
    middlewares.use(...fns)
  }

  function match(matcher, ...fns) {
    if (!isFunction(matcher)) throw new Error('Matcher must be a function')
    if (!fns.every(isFunction)) throw new Error('matcher can only accept functions as arguments')
    if (running) throw new Error('Cannot add matchers while Sqeasy is running')
    middlewares.use(async (msg, next) => {
      if (matcher(msg)) {
        const subMiddlewares = pipeline(...fns)
        await subMiddlewares.execute(msg)
      }
      next()
    })
  }

  async function fetchMessages() {
    let messages
    try {
      const { Messages } = await sqs.receiveMessage(subscription.toSQSParams()).promise()
      messages = Messages
    } catch (e) {
      _logger.error('Failed to pull', e)
      subscription.timeoutHandler = setTimeout(fetchMessages, subscription.waitTimeMs)
      return
    }
    const haveMessages = !!(messages && messages.length)
    let startTime
    if (haveMessages) {
      _logger.log(`Pull completed - ${messages.length} messages`)
      if (subscription.batchSize > 1) {
        startTime = Date.now()
        await handleMessages(messages)
      } else {
        startTime = Date.now()
        await handleMessage(...messages)
      }
    } else {
      _logger.log('Pull completed - no messages')
    }
    const passedDuration = Date.now() - startTime
    const nextPullIn = haveMessages ? Math.max(0, subscription.waitTimeMs - passedDuration) : subscription.waitTimeMs
    _logger.log(`Next pull in ${(nextPullIn / 1000).toFixed(3)} seconds`)
    subscription.timeoutHandler = setTimeout(fetchMessages, nextPullIn)
  }

  function pull({ queueUrl, batchSize = DEFAULT_BATCH_SIZE, waitTime = DEFAULT_WAIT_TIME, attributes = [], messageAttributes = [] }) {
    if (running) throw new Error('Must stop pulling before calling pull again')
    if (!queueUrl) throw new Error('Queue URL is required')
    if (!Number.isInteger(batchSize)) throw new Error('Batch size must be an integer')
    if (batchSize < 1 || batchSize > 10) throw new Error('Batch size must be between 1 and 10')
    if (!Number.isInteger(waitTime)) throw new Error('Wait time must be an integer')
    if (!Array.isArray(attributes)) throw new Error('Attributes must be an array')
    if (!Array.isArray(messageAttributes)) throw new Error('Message attributes must be an array')
    if (waitTime < 0) throw new Error('Wait time most be 0 or higher')
    if (attributes.some(function(value) { return typeof value !== 'string'})) throw new Error('Attributes array can contain only strings')
    if (messageAttributes.some(function(value) { return typeof value !== 'string'})) throw new Error('Message attributes array can contain only strings')
    subscription.queueUrl = queueUrl
    subscription.batchSize = batchSize
    subscription.waitTime = waitTime
    subscription.waitTimeMs = secondsToMilliseconds(waitTime)
    subscription.attributes = attributes || []
    subscription.messageAttributes = messageAttributes || []
    running = true
    _logger.log(`Start pulling ${queueUrl} with parameters: ${subscription.logParameters()}`)
    fetchMessages()
  }

  function stop() {
    if (subscription.timeoutHandler) {
      clearTimeout(subscription.timeoutHandler)
      subscription.timeoutHandler = null
    }
    running = false
    _logger.log('Stopped pulling')
  }

  async function handleMessage(message) {
    const receiptHandle = message.ReceiptHandle
    _logger.log(`Handling message ${message.MessageId}`)
    await middlewares.execute(messageToContext(message))
    try {
      await sqs.deleteMessage({ QueueUrl: subscription.queueUrl, ReceiptHandle: receiptHandle }).promise()
      _logger.log(`Deleted message ${message.MessageId}`)
    } catch (e) {
      _logger.error('Error deleting SQS message', e)
    }
  }

  function messageToEntry({ MessageId: Id , ReceiptHandle }) {
    return { Id, ReceiptHandle }
  }

  async function handleMessages(messages) {
    const entries = messages.map(messageToEntry)
    const messagesIds = entries.map(({ Id }) => Id).join(', ')
    _logger.log(`Handling messages ${messagesIds}`)
    await Promise.all(messages.map(messageToContext).map(middlewares.execute))
    try {
      await sqs.deleteMessageBatch({ QueueUrl: subscription.queueUrl, Entries: entries }).promise()
      _logger.log(`Deleted messages ${messagesIds}`)
    } catch (e) {
      _logger.error('Error deleting SQS message', e)
    }
  }

  function setLogger(logger) {
    if (!logger) {
      _logger = EMPTY_LOGGER
      return
    }
    if (typeof logger.log !== 'function') throw new Error('Logger must have a log method')
    if (typeof logger.error !== 'function') throw new Error('Logger must have an error method')
    _logger = {
      log: function(msg, ...args) { return logger.log(formatLogMessage(msg), ...args) },
      error: function(msg, ...args) { return logger.error(formatLogMessage(msg), ...args)}
    }
  }

  return {
    use,
    match,
    pull,
    stop,
    setLogger
  }
}

module.exports = sqeasy
