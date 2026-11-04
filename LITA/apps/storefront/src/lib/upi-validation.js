function isValidUtr(value) {
  return /^\d{12}$/.test(value.trim())
}

module.exports = { isValidUtr }
