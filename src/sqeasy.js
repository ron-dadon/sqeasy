const pipeline = require('./pipeline.js')

const DEFAULT_WAIT_TIME = 10
const DEFAULT_BATCH_SIZE = 1

function sqeasy(sqs) {
  const middlewares = pipeline()
  let running = false

  const subscription = {
    queueUrl: null,
    batchSize: DEFAULT_BATCH_SIZE,
    waitTime: DEFAULT_WAIT_TIME,
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
    middlewares.use(...fns)
  }

  function match(matcher, ...fns) {
    if (running) throw new Error('Cannot add matchers while Sqeasy is running')
    middlewares.use(async (ctx, next) => {
      if (
        (typeof matcher === 'function' && matcher(ctx)) ||
        (typeof matcher === 'object' && matchAttributes(matcher, ctx.MessageAttributes))
      ) {
        const subMiddlewares = pipeline(...fns)
        await subMiddlewares.execute(ctx)
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
    if (attributes.some(function(value) { return typeof value !== 'string'})) throw new Error('Attributes array can contain only strings')
    subscription.queueUrl = queueUrl
    subscription.batchSize = batchSize
    subscription.waitTime = waitTime
    subscription.attributes = attributes || []
  }

  async function fetchMessages() {
    const { Messages: messages } = await sqs.receiveMessage(subscription.toSQSParams()).promise()
    if (messages && messages.length) {
      if (subscription.batchSize > 1) {
        await handleMessages(messages)
      } else {
        await handleMessage(...messages)
      }
    }
    subscription.timeoutHandler = setTimeout(fetchMessages, subscription.waitTime * 1000)
  }

  function start() {
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
    try {
      await middlewares.execute(message)
      await sqs.deleteMessage({ QueueUrl: subscription.queueUrl, ReceiptHandle: message.ReceiptHandle }).promise()
    } catch (e) {
      console.log('Error delete', e)
    }
  }

  function messageToEntry({ MessageId: Id , ReceiptHandle }) {
    return { Id, ReceiptHandle }
  }

  async function handleMessages(messages) {
    try {
      await Promise.all(messages.map(middlewares.execute))
      await sqs.deleteMessageBatch({ QueueUrl: subscription.queueUrl, Entries: messages.map(messageToEntry) }).promise()
    } catch (e) {
      console.log('Error delete', e)
    }
  }

  function matchAttributes(matcher, messageAttributes) {
    for (const key in matcher) {
      if (!matcher.hasOwnProperty(key)) continue
      const currentAttribute = messageAttributes[key]
      const currentMatcher = matcher[key]
      if (typeof currentMatcher === 'string' && currentMatcher !== currentAttribute) return false
      if (Array.isArray(currentMatcher) && !currentMatcher.includes(currentAttribute)) return false
      if (typeof currentMatcher === 'object') {
        if (typeof currentMatcher.anythingBut === 'string' && currentMatcher.anythingBut === currentAttribute) return false
        if (Array.isArray(currentMatcher.anythingBut) && currentMatcher.anythingBut.includes(currentAttribute)) return false
      }
    }
    return true
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