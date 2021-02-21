# sqeasy

![Tests](https://github.com/ron-dadon/sqeasy/actions/workflows/main.yml/badge.svg)

AWS SQS made easy, inspired by express middleware pattern.

## Installation

Install with `yarn` or `npm`:

```shell
yarn add sqeasy
```

```shell
npm install sqeasy
```

## How it works?

Sqeasy is pulling SQS queue in a defined interval (`waitTime` seconds) and executes a middlewares pipeline for every incoming message.

If the incoming message was processed successfully, Sqeasy will automatically delete it from the queue, otherwise, it will not, and the message will become visible again.

You can set up "global" (runs for every message) middlewares using the `use` function, passing 1 or more middleware functions to it. Middleware functions takes 2 arguments: the incoming SQS message and a `next` function. When your middleware ends and you want to tell Sqeasy to move forward to the next middleware, you call the `next` function from your middleware.

You can set up a middleware that will execute only if a certain condition matches by using the `match` function. The `match` function takes 2+ arguments, the first one is the `matcher` function that is executed with the incoming SQS message, and all others are middleware functions that will execute if and only if the `matcher` function returns a truthy value.

To handle errors, you can set up error middlewares. Those should be defined last, and takes 3 arguments: the error, the incoming message and `next` function.  

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