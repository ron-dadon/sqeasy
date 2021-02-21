const pipeline = require('./pipeline.js')
const { isFunction, secondsToMilliseconds } = require('./utils.js')

const DEFAULT_WAIT_TIME = 10
const DEFAULT_BATCH_SIZE = 1

function sqeasy(sqs) {
  const middlewares = pipeline()
  let running = false

  const subscription = {
    queueUrl: null,
    batchSize: DEFAULT_BATCH_SIZE,
    waitTime: secondsToMilliseconds(DEFAULT_WAIT_TIME),
    timeoutHandler: null,
    attributes: [],
    toSQSParams: function() {
      return {
        VisibilityTimeout: this.waitTime,
        WaitTimeSeconds: this.waitTime,
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.batchSize,
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

  function subscribe({ queueUrl, batchSize = DEFAULT_BATCH_SIZE, waitTime = DEFAULT_WAIT_TIME, attributes = [] }) {
    if (running) throw new Error('Cannot change subscription while running')
    if (!Number.isInteger(batchSize)) throw new Error('Batch size must be an integer')
    if (batchSize < 1 || batchSize > 10) throw new Error('Batch size must be between 1 and 10')
    if (!Number.isInteger(waitTime)) throw new Error('Wait time must be an integer')
    if (!Array.isArray(attributes)) throw new Error('Attributes must be an array')
    if (waitTime < 0) throw new Error('Wait time most be 0 or higher')
    if (attributes.some(function(value) { return typeof value !== 'string'})) throw new Error('Attributes array can contain only strings')
    subscription.queueUrl = queueUrl
    subscription.batchSize = batchSize
    subscription.waitTime = secondsToMilliseconds(waitTime)
    subscription.attributes = attributes || []
  }

  async function fetchMessages() {
    const { Messages: messages } = await sqs.receiveMessage(subscription.toSQSParams()).promise()
    const haveMessages = !!(messages && messages.length)
    let startTime
    if (haveMessages) {
      if (subscription.batchSize > 1) {
        startTime = Date.now()
        await handleMessages(messages)
      } else {
        startTime = Date.now()
        await handleMessage(...messages)
      }
    }
    const passedDuration = Date.now() - startTime
    const nextPullIn = haveMessages ? Math.max(0, subscription.waitTime - passedDuration) : subscription.waitTime
    subscription.timeoutHandler = setTimeout(fetchMessages, nextPullIn)
  }

  function start() {
    if (!subscription.queueUrl) throw new Error('Cannot start without subscribing to a queue')
    running = true
    console.log('Start pulling')
    fetchMessages()
  }

  function stop() {
    if (subscription.timeoutHandler) {
      clearTimeout(subscription.timeoutHandler)
      subscription.timeoutHandler = null
    }
    running = false
  }

  async function handleMessage(message) {
    await middlewares.execute(message)
    try {
      await sqs.deleteMessage({ QueueUrl: subscription.queueUrl, ReceiptHandle: message.ReceiptHandle }).promise()
    } catch (e) {
      console.error('Error deleting SQS message', e)
    }
  }

  function messageToEntry({ MessageId: Id , ReceiptHandle }) {
    return { Id, ReceiptHandle }
  }

  async function handleMessages(messages) {
    await Promise.all(messages.map(middlewares.execute))
    try {
      await sqs.deleteMessageBatch({ QueueUrl: subscription.queueUrl, Entries: messages.map(messageToEntry) }).promise()
    } catch (e) {
      console.error('Error deleting SQS message', e)
    }
  }

  return {
    use,
    match,
    start,
    stop,
    subscribe
  }
}

module.exports = sqeasy