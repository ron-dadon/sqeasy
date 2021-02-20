function pipeline(...fns) {
  const functions = fns

  function use(...fns) {
    functions.push(...fns)
  }

  async function execute(context) {
    const fns = [...functions].reverse()

    async function next(err) {
      if (!fns.length) {
        if (err) throw err
        return
      }
      const fn = fns.pop()
      try {
        if (fn.length < 3) {
          await fn(context, next)
        } else {
          await fn(err, context, next)
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