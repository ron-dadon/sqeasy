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

## Example

```js
const sqeasy = require('sqeasy')
const aws = require('aws-sdk')
const sqs = new aws.SQS({ region: 'us-east-1' })

const QUEUE_URL = 'http://example.com'

const app = sqeasy(sqs)

function printMessage(msg, next) {
  console.log('Message:', msg)
  next()
}

function handleError(err, msg, next) {
  if (!err) {
    console.log('Done with message:', msg)
    return next()
  }
  console.error(err)
}

app.subscribe({ queueUrl: QUEUE_URL, batchSize: 10, waitTime: 10 })

app.use(printMessage)
app.use(handleError)

app.start()
```