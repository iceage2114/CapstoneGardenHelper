const { promiseImpl } = require('ejs')
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
                this.errors.push("Error creating plant entry")
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
            let post = await Post.findSingleById(this.requestedPostId, this.userid)
            if(post.isVisitorOwner) {
                let status = await this.actuallyUpdate()
                resolve(status)
            } else {
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
            await postsCollection.findOneAndUpdate(
                {_id: new ObjectId(this.requestedPostId)}, 
                {$set: {
                    speciesName: this.data.speciesName,
                    datePlanted: this.data.datePlanted,
                    daysSinceSprouting: this.data.daysSinceSprouting
                }}
            )
            resolve("success")
        } else {
            resolve("failure")
        }
    })
}

Post.prototype.cleanUp = function() {
    // Ensure data is an object
    if (typeof this.data !== 'object' || this.data === null) {
        this.data = {}
    }

    // Safe trimming and parsing
    this.data = {
        speciesName: typeof this.data.speciesName === 'string' ? 
            sanitizeHTML(this.data.speciesName.trim(), {allowedTags: [], allowedAttributes: []}) : 
            '',
        datePlanted: this.data.datePlanted ? new Date(this.data.datePlanted) : new Date(),
        daysSinceSprouting: this.data.daysSinceSprouting ? 
            parseInt(this.data.daysSinceSprouting) || 0 : 
            0,
        createdDate: new Date(),
        author: new ObjectId(this.userid)
    }
}

Post.prototype.validate = function() {
    // Validation rules for plant entry
    if (!this.data.speciesName || this.data.speciesName.trim() === "") {
        this.errors.push("Please provide a species name")
    }

    if (!this.data.datePlanted) {
        this.errors.push("Please provide the date planted")
    }

    if (isNaN(this.data.daysSinceSprouting) || this.data.daysSinceSprouting < 0) {
        this.errors.push("Days since sprouting must be a non-negative number")
    }
}

Post.reusablePostQuery = function(uniqueOperations, visitorId, finalOperations = []) {
    let promise = new Promise(async function(resolve, reject) {
        let aggOperations = uniqueOperations.concat([
            {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
            {$project: {
                speciesName: 1,
                datePlanted: 1,
                daysSinceSprouting: 1,
                createdDate: 1,
                authorId: "$author",
                author: {$arrayElemAt: ["$authorDocument", 0]},
            }}
        ]).concat(finalOperations)

        let posts = await postsCollection.aggregate(aggOperations).toArray()
        posts = posts.map(function(post) {
            post.isVisitorOwner = post.authorId.equals(visitorId)
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
    let promise = new Promise(async function(resolve, reject) {
        if(typeof(id) != "string" || !ObjectId.isValid(id)) {
            reject()
            return
        }

        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectId(id)}}
        ], visitorId)

        if(posts.length) {
            resolve(posts[0])
        } else {
            reject()
        }
    })

    return promise
}

Post.findByAuthorId = function(authorId, visitorId) {
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createdDate: -1}}
    ], visitorId)
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
    return new Promise(async(resolve, reject) => {
        if(typeof(searchTerm) == "string") {
            let posts = await Post.reusablePostQuery([
                {$match: {$or: [
                    {speciesName: {$regex: searchTerm, $options: 'i'}},
                    {daysSinceSprouting: isNaN(searchTerm) ? null : parseInt(searchTerm)}
                ]}}
            ], undefined)
            resolve(posts)
        } else {
            reject()
        }
    })
}

module.exports = Post