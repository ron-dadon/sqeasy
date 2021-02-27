# sqeasy

![Unit Tests](https://github.com/ron-dadon/sqeasy/actions/workflows/main.yml/badge.svg)

AWS SQS made easy, inspired by express middleware pattern.

## Installation

Install with `yarn` or `npm`:

```shell
yarn add sqeasy
```

```shell
npm install sqeasy
```

## What is Sqeasy?

As micro-services becoming more and more popular every day and distributed systems evolve, messaging as a way of communication is taking over. One of AWS solutions for a queue system is [SQS](https://aws.amazon.com/sqs/) (Simple Queue Service). In order to consume SQS messages, the consuming service need to manually pull the queue for new messages. There are already some modules that solves this part, providing auto-pulling, such as [sqs-consumer](https://github.com/BBC/sqs-consumer).

Sqeasy takes it one step further, providing a simple-to-use library that provides both auto-pulling and [express](https://github.com/expressjs/express) inspired style middleware system, allowing you to build a full processing chain with ease.

## How it works?

Sqeasy is pulling SQS queue in a defined interval (`waitTime` seconds) and executes a middlewares pipeline for every incoming message.

If the incoming message was processed successfully, Sqeasy will automatically delete it from the queue, otherwise, it will not, and the message will become visible again.

Sqeasy middlewares runs sequentially, and you can define middlewares using the `use` method. A unique middleware setup is the `match` function, which behaves like the `use` function but takes a matcher function as the first argument. When an incoming message arrives to the match middleware, it will execute the matcher function, passing the incoming message into it, and will only process the following middlewares that were provided in the `match` call if the matcher function will return `true`. A common use case is to run different pipelines according to the incoming message attributes.

Error handling is done by using the error middleware. An error middleware is a middleware that takes in 3 arguments: the error, the incoming message and the `next` function. When a middleware throws an error / returns a promise that is rejected / calls `next` with a parameter, Sqeasy will move into error mode and will only execute the following middlewares that are used for error handling (detected by the amount of parameters the middleware takes).

## Example

```js
const sqeasy = require('sqeasy')
const aws = require('aws-sdk')

const QUEUE_URL = 'http://example.com'

// Initialize sqs instance
const sqs = new aws.SQS({ region: 'us-east-1' })

// Create app instance for that sqs
const app = sqeasy(sqs)

// Generate a matcher function that returns true
// if a message attribute 'attr' matches the value 'value'
function matchKeyAttribute(attr, value) {
  return function(msg) {
    return msg.MessageAttributes[attr].Value === value 
  }
}

// Print the incoming message body
function printMessage(msg, next) {
  console.log('Message:', msg.Body)
  next()
}

// Print the incoming message attributes
function printMessageAttributes(msg, next) {
  console.log('Message Attributes:', msg.MessageAttributes)
  next()
}

// Handle errors
function handleError(err, msg, next) {
  if (!err) {
    console.log('Done with message:', msg)
    return next()
  }
  console.error(err)
}

// Subscribe to a specific queue
app.subscribe({ queueUrl: QUEUE_URL, batchSize: 10, waitTime: 10 })

// General pre match middleware
app.use(printMessage)

// Match a specific message attribute named `test` with the value `test` 
// and only run `printMessageAttributes` if there is a match 
app.match(matchKeyAttribute('test', 'test'), printMessageAttributes)

// Handle errors
app.use(handleError)

app.start()
```
