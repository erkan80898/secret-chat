const info = (...details) => {
    console.log(details)
}

const error = (...details) => {
    console.error(details)
}

module.exports = {
    info,
    error
}