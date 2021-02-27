function pipeline(...fns) {
  const functions = fns

  function use(...fns) {
    functions.push(...fns)
  }

  async function execute(context) {
    let error = false
    let fns = [...functions.filter(fn => fn.length === 2)].reverse()
    const errHandlers = functions.filter(fn => fn.length === 3).reverse()

    async function next(err) {
      if (err && !error) {
        error = true
        fns = errHandlers
      }
      if (!fns.length) {
        if (err) throw err
        return
      }
      if (error && !err) {
        return
      }
      const fn = fns.pop()
      try {
        if (error) {
          await fn(err, context, next)
        } else {
          await fn(context, next)
        }
      } catch (e) {
        await next(e)
      }
    }

    return await next()
  }

  return {
    use,
    execute
  }
}

module.exports = pipeline
