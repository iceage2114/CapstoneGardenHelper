const User = require('../models/User')
const Post = require('../models/Post')
const jwt = require('jsonwebtoken')


exports.mustBeLoggedIn = function(req, res, next) {
    if(req.session.user) {
        next()
    } else {
        req.flash("errors", "not signed in")
        req.session.save()
        res.redirect('/')
    }
}

exports.login = function(req, res) {
    let user = new User(req.body)

    let promise = user.login()

    promise.then((result) => {
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(function() {
            res.redirect('/')
        })
    }).catch((e) => {
        req.flash('errors', "wrong user/password")
        req.session.save(function() {
            res.redirect('/')
        })
    })

    /*
    user.login(function(result) {
        if(result){
            res.send("success")
        } else {
            res.send("fail")
        }
    })*/
    
}

exports.apiLogin = function(req, res) {
    console.log("apilogin")
    let user = new User(req.body)

    let promise = user.login()

    promise.then((result) => {
       res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '30m'}))
    }).catch((e) => {
        res.json("b")
    })
}

exports.logout = function(req, res) {
    req.session.destroy(function() {
        res.redirect('/')
    })
}

exports.register = function(req, res) {
    let user = new User(req.body)
    user.register().then(() => {
        req.session.user = {username: user.data.username, avatar: user.avatar, _id:user.data._id}
        req.session.save(function() {
            res.redirect('/')
        })
    }).catch((regErrors) => {
        regErrors.forEach(function(error) {
            req.flash('regErrors', error)

        })
        req.session.save(function() {
            res.redirect('/')
        })
    })
}

exports.home = function(req, res) {
    if(req.session.user) {
        res.render('home-dashboard')
    } else {
        res.render('home-guest', {regErrors: req.flash('regErrors')})
    }
}

exports.ifUserExists = function(req, res, next) {
    User.findByUsername(req.params.username).then(function(userDocument) {
        req.profileUser = userDocument
        next()
    }).catch(function() {
        res.render('404')
    })
}

exports.profilePostsScreen = function(req, res) {
    
    Post.findByAuthorId(req.profileUser._id).then(function(posts) {

        res.render('profile', {
            posts: posts,
            profileUsername: req.profileUser.username,
            profileAvatar:req.profileUser.avatar
        })
    }).catch(function() {
        res.render('404')
    })

    
}