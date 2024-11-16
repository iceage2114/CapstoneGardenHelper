const { promiseImpl } = require('ejs')
const { post } = require('../router')

const postsCollection = require('../db').db().collection("posts")
const ObjectId = require('mongodb').ObjectId
const User = require('./User')

const sanitizeHTML = require('sanitize-html')

let Post = function(data, userid, requestedPostId) {
    this.data = data
    this.errors = []
    this.userid = userid
    this.requestedPostId = requestedPostId
}

Post.prototype.create = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()

        if(!this.errors.length) {
            postsCollection.insertOne(this.data).then((info) => {
                resolve(info.insertedId)
            }).catch(() => {
                this.errors.push("try again")
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }
    })
}

Post.prototype.update = function() {
    let promise = new Promise(async (resolve, reject) => {
        try {
            //console.log("1")
            let post = await Post.findSingleById(this.requestedPostId, this.userid)
            //console.log("2")
            if(post.isVisitorOwner) {
                //console.log("3")
                let status = await this.actuallyUpdate()
                resolve(status)
            } else {
                //console.log("4")
                reject()
            }
        } catch {
            reject()
        }
    })
    return promise
}

Post.prototype.actuallyUpdate = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        this.validate()
        if(!this.errors.length) {
            await postsCollection.findOneAndUpdate({_id: new ObjectId(this.requestedPostId)}, {$set: {title: this.data.title, body: this.data.body}})
            resolve("success")
        } else {
            resolve("failure")
        }
    })
}

Post.prototype.cleanUp = function() {
    if(typeof(this.data.title) != "string") {
        this.data.title = ""
    }
    if(typeof(this.data.body) != "string") {
        this.data.body = ""
    }

    this.data = {
        title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes: []}),
        body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes: []}),
        createdDate: new Date(),
        author: new ObjectId(this.userid)
    }
}

Post.prototype.validate = function() {
    if (this.data.title == "") {
        this.errors.push("provide title")
    }
    if (this.data.body == "") {
        this.errors.push("provide body")
    }
}

Post.reusablePostQuery = function(uniqueOperations, visitorId, finalOperations = []) {
    let promise =  new Promise(async function(resolve, reject) {
        let aggOperations = uniqueOperations.concat([
            {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
            {$project: {
                title: 1,
                body: 1,
                createdDate: 1,
                authorId: "$author",
                author: {$arrayElemAt: ["$authorDocument", 0]},
            }}
        ]).concat(finalOperations)

        let posts = await postsCollection.aggregate(aggOperations).toArray()
        //console.log(aggOperations)
        //console.log(posts)
        posts = posts.map(function(post) {
            post.isVisitorOwner = post.authorId.equals(visitorId)
            //console.log(`post.isVisitorOwner =  ${post.isVisitorOwner}`)
            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })
        resolve(posts)
    })
    return promise
}

Post.findSingleById = function(id, visitorId) {
    let promise =  new Promise(async function(resolve, reject) {
        if(typeof(id) != "string" || !ObjectId.isValid(id)) {
            reject()
            return
        }

        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectId(id)}}
        ], visitorId)

        if(posts.length) {
            //console.log(posts[0])
            resolve(posts[0])
        } else {
            reject()
        }
        
    })

    return promise
}

Post.findByAuthorId = function(authorId) {
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createdDate: -1}}//-1 for descending order
    ])

}

Post.delete = function(postIdToDelete, currentUserId) {
    let promise = new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(postIdToDelete, currentUserId)
            if(post.isVisitorOwner) {
                await postsCollection.deleteOne({_id: new ObjectId(postIdToDelete)})
                resolve()
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
    return promise
}

Post.search = function(searchTerm) {
    console.log(searchTerm)
    return new Promise(async(resolve, reject) => {
        if(typeof(searchTerm) == "string") {
            let posts = await Post.reusablePostQuery([
                {$match: {$text: {$search: searchTerm}}}
            ], undefined, [{$sort: {score: {$meta: "textScore"}}}])
            resolve(posts)
        } else {
            reject()
        }
    })
}

module.exports = Post