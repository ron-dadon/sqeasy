function pipeline(...fns) {
  const functions = fns

  function use(...fns) {
    functions.push(...fns)
  }

  async function execute(context) {
    let error = false
    let errorResult
    let fns = [...functions.filter(fn => fn.length === 2)].reverse()
    const errHandlers = functions.filter(fn => fn.length === 3).reverse()

    async function next(err) {
      if (err && !error) {
        error = true
        fns = errHandlers
      }
      if (!fns.length) {
        if (err) errorResult = err
        return
      }
      if (error && !err) {
        return
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
    await next()
    if (error && errorResult) {
      throw errorResult
    }
  }

  return {
    use,
    execute
  }
}

module.exports = pipeline
