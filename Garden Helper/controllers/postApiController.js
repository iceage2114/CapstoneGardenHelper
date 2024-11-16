const Post = require('../models/Post')

exports.apiCreate = function(req, res) {
    let post = new Post(req.body, req.apiUser._id)

    post.create().then(function(newId) {
        res.json("success")
    }).catch(function(errors) {
        res.json(errors)
    })
}

exports.apiDelete = function(req, res) {
    Post.delete(req.params.id, req.apiUser._id).then(() => {
        
    }).catch(() => {
        
    })
}