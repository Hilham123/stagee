const { Service } = require('../models')

const initServices = async () => {
const services = [

]

for (const s of services) {
await Service.findOrCreate({ where: { code: s.code }, defaults: s })
}
console.log('Services initialises')
}

module.exports = { initServices }