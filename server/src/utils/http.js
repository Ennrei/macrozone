function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function requireId(Model, id, label = 'Record') {
  if (!Model.db.base.isValidObjectId(id)) throw httpError(400, `Invalid ${label.toLowerCase()} ID`)
}

function localDayBounds(dateValue = new Date()) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) throw httpError(400, 'Invalid date')
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

module.exports = { httpError, requireId, localDayBounds }
