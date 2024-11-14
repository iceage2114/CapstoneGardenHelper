const User = require('../models/User')
const Post = require('../models/Post')
const jwt = require('jsonwebtoken')

exports.apiLogin = function(req, res) {
    console.log("apilogin")
    let user = new User(req.body)

    user.login().then((result) => {
       res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '30m'}))
    }).catch((e) => {
        res.json("b")
    })
}


exports.apiMustBeLoggedIn = function(req, res, next) {
    try {
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        console.log(req.apiUser)
        next()
    } catch {
        res.json("must have valid token")
    }
}
