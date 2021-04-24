class PipelineTimeoutError extends Error {
  constructor(timeout) {
    super(`Pipeline timeout after ${timeout} milliseconds`)
    this.name = 'PipelineTimeoutError'
  }
}

function pipeline(...fns) {
  const functions = fns

  function use(...fns) {
    functions.push(...fns)
  }

  async function execute(context, timeout) {
    if (timeout !== undefined) {
      if (!Number.isInteger(timeout)) throw new Error('Pipeline execution timeout must be a valid integer')
      if (timeout < 1) throw new Error('Pipeline execution timeout must be greater than 0')
    }

    return new Promise(function(resolve, reject) {
      let error = false
      let fns = [...functions.filter(fn => fn.length === 2)].reverse()
      const errHandlers = functions.filter(fn => fn.length === 3).reverse()
      let timeoutHandle
      let rejected = false

      function resolveAndClearTimeout() {
        if (timeoutHandle) clearTimeout(timeoutHandle)
        resolve()
      }

      function rejectAndMark(e) {
        rejected = true
        reject(e)
      }

      if (timeout) {
        timeoutHandle = setTimeout(function() {
          rejectAndMark(new PipelineTimeoutError(timeout))
        }, timeout)
      }

      async function next(err) {
        if (rejected) {
          return
        }
        if (err && !error) {
          error = true
          fns = errHandlers
        }
        if (!fns.length) {
          if (err) return rejectAndMark(err)
          return resolveAndClearTimeout()
        }
        if (error && !err) {
          return resolveAndClearTimeout()
        }
        const fn = fns.pop()
        try {
          if (error) {
            return await fn(err, context, next)
          } else {
            return await fn(context, next)
          }
        } catch (e) {
          return await next(e)
        }
      }
      next()
    })

  }

  return {
    use,
    execute
  }
}

module.exports = pipeline
module.exports.PipelineTimeoutError = PipelineTimeoutError
