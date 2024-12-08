const Post = require('../models/Post')
const plantCareData = require('../public/plant_care.json');

exports.viewCreateScreen = function(req, res) {
    res.render('create-post')
}

exports.create = function(req, res) {
    console.log("Received data:", req.body); // Log the incoming data
    
    let post = new Post(req.body, req.session.user._id)

    post.create().then(function(newId) {
        req.flash("success", "New plant entry created")
        req.session.save(() => {
            res.redirect(`/post/${newId}`)
        })
    }).catch(function(errors) {
        console.error("Error creating post:", errors); // Log any errors
        
        if (Array.isArray(errors)) {
            errors.forEach(error => req.flash("errors", error))
        } else {
            req.flash("errors", errors.toString() || "An error occurred")
        }
        
        req.session.save(() => {
            res.redirect("/create-post")
        })
    })
}

exports.ViewSingle = async function(req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen', {
            post: post,
            plantCareData: plantCareData
        })
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
            req.flash("errors", "No permission to edit")
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

    post.update().then((status) => {
        if(status == "success") {
            req.flash("success", "Plant entry updated")
            req.session.save(function() {
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
    }).catch(() => {
        req.flash("errors", "No permission to access")
        req.session.save(function() {
            res.redirect('/')
        })
    })
}

exports.delete = function(req, res) {
    Post.delete(req.params.id, req.visitorId).then(() => {
        req.flash("success", "Plant entry deleted")
        
        req.session.save(() => {
            res.redirect(`/profile/${req.session.user.username}`)
        })
    }).catch(() => {
        req.flash("errors", "No permission")
        req.session.save(() => {
            res.redirect("/")
        })
    })
}

exports.search = function(req, res) {
    Post.search(req.body.searchTerm).then((posts) => {
        res.json(posts)
    }).catch(() => {
        res.json([])
    })
}