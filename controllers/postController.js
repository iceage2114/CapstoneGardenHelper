const Post = require('../models/Post')

exports.viewCreateScreen = function(req, res) {
    res.render('create-post')
}

exports.create = function(req, res) {
    let post = new Post(req.body, req.session.user._id)

    post.create().then(function(newId) {
        req.flash("success", "New post created")
        req.session.save(() => {
            res.redirect(`/post/${newId}`)
        })
    }).catch(function(errors) {
        errors.forEach(error => req.flash("errors", error))
        req.sessions.save(() => {
            res.redirect("/create-post")
        })
    })
}



exports.ViewSingle = async function(req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen', {post: post})
    } catch {
        res.render('404')
    }
}

exports.findPostByUser = async function(req, res) {
    try {
        let posts = await Post.findPostByUser(req.session.user)
        res.render('single-post-screen', {post: posts[0]})
    } catch {
        res.send("404")
    }
}

exports.viewEditScreen = async function(req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        if(post.isVisitorOwner) {
            res.render("edit-post", {post: post})
        } else {
            req.flash("errors", "no permission")
            req.session.save(() => {
                res.redirect("/")
            })
        }
        
    } catch {
        res.render('404')
    }
}

exports.edit = function(req, res) {
    let post = new Post(req.body, req.visitorId, req.params.id)

    //console.log(post)
    post.update().then((status) => { //successfully updated or error
        if(status == "success") {
            req.flash("success", "post updated")
            req.session.save(function() {
                //console.log(req.params.id)
                res.redirect(`/post/${req.params.id}/edit`)
            })
        } else {
            post.errors.forEach(function(error) {
                req.flash("errors", error)
            })
            req.session.save(function() {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(() => { //if post with id doesnt exist or not owner
        req.flash("errors", "no permission to access")
        req.session.save(function() {
            res.redirect('/')
        })
    })
}

exports.delete = function(req, res) {
    Post.delete(req.params.id, req.visitorId).then(() => {
        req.flash("success", "post deleted")
        //console.log(req.session.user.username)
        
        req.session.save(() => {
            res.redirect(`/profile/${req.session.user.username}`)
        })
    }).catch(() => {
        req.flash("errors", "no permission")
        req.session.save(() => {
            res.redirect("/")
        })
    })
}

exports.search = function(req, res) {
    console.log("server search")
    Post.search(req.body.searchTerm).then((posts) => {
        res.json(posts)
    }).catch(() => {
        res.json([])
    })
}