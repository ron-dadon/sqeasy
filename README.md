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
  return function({ message }) {
    return message.MessageAttributes[attr].Value === value 
  }
}

// Print the incoming message body
function printMessage({ message }, next) {
  console.log('Message:', message.Body)
  next()
}

// Print the incoming message attributes
function printMessageAttributes({ message }, next) {
  console.log('Message Attributes:', message.MessageAttributes)
  next()
}

// Handle errors
function handleError(err, { message }, next) {
  if (!err) {
    console.log('Done with message:', message)
    return next()
  }
  console.error(err)
}

// General pre match middleware
app.use(printMessage)

// Match a specific message attribute named `test` with the value `test` 
// and only run `printMessageAttributes` if there is a match 
app.match(matchKeyAttribute('test', 'test'), printMessageAttributes)

// Handle errors
app.use(handleError)

app.pull({ queueUrl: QUEUE_URL, batchSize: 10, waitTime: 10 })
```
## API

### sqeasy

Sqeasy module exports one factory method that generates a Sqeasy app. Each app must get an AWS SQS instance object. Sqeasy keeps AWS SQS out of the module since in most cases AWS is already used in other parts of the app / service, so it allows the developer to re-use existing instances instead of creating one internally.

```js
const sqeasy = require('sqeasy')
const aws = require('aws-sdk')

const sqs = new aws.SQS({ region: 'us-east-1' })

const app = sqeasy(sqs)
```

### App methods

#### use

Method signature: `use(...fns)`

The `use` method is used to set up a middleware(s) in the execution chain.
The method can only accept functions (1...n).
Each middleware function is execute with 2 parameters: `context` and `next`.

The `context` parameter contain the execution context. When Sqeasy starts an execution chain for an incoming SQS message, the `context` object contains `message` property that hold the incoming SQS message. The context object is mutable, allowing every middleware in the chain to change its content.

The `next` parameter is a function that needs to be called when the middleware is done and ready to move forward to the next middleware in the chain. No calling the `next` function will result in a "dead" execution chain that will stop processing. If the `next` function is called with a parameter, it is treated as an error, and will skip all the next middlewares until it reaches the error handling middlewares.

```js
function validateMessage({ message }, next) {
  if (message.Body !== 'test') return next('Invalid body')
  next()
}

function printMessage({ message }, next) {
  console.log(message)
  next()
}

// Equivilant to app.use(validateMessage, printMessage)
app.use(validateMessage)
app.use(printMessage)
```

#### match

Method signature: `match(matcher, ...fns)`

The `match` method is a special middleware that is used to create a "sub" execution chain. This method accepts only functions (1...n), with the first parameter being a special "matcher" function.

A matcher function is a function that only gets one argument, the `context` argument. The function can implement any matching algorithm, and if the function returns `true`, then any other function that is provided to the `match` method will be executed as part of the execution chain. If the function returns `false`, Sqeasy will skip all the rest of the functions that were passed to the `match` method and will move to the next middleware.

```js
function matchBody({ message }) {
  return message.Body === 'test'
}

function printMessage({ message }, next) {
  console.log(message)
  next()
}

// Will only execute `printMessage` if the message body is 'test'
app.match(matchBody, printMessage)
```

#### pull

Method signature: `({ queueUrl, batchSize?, waitTime?, attributes?, messageAttributes? })`

Start pulling SQS queue according to the provided arguments.

`queueUrl`: The URL of the SQS queue to pull from.

`batchSize`: The number of message to pull every time. Possible values: `1` - `10`. Default value `10`.

`waitTime`: The number of seconds to wait between pulls. This affects also the message invisibility time. Value must be greater than `0`. Default value `10`.

`attributes`: The list of attributes to pull with each message. Must be an array with the attribute names. See AWS docs for possible values.

`messageAttributes`: The list of message attributes to pull with each message. Must be an array with the message attribute names. See AWS docs for possible values.

#### stop

Method signature: `()`

Stops the SQS pulling. If there are any messages still in processing, they will not stop processing.
