const validator = require("validator")
const usersCollection = require('../db').db().collection("users")
const bcrypt = require("bcryptjs")
const md5 = require('md5')

let User = function(data, getAvatar) {
    this.data = data
    this.errors = []
    if(getAvatar == undefined) {
        getAvatar = false
    }
    if(getAvatar) {
        this.getAvatar
    }
}

User.prototype.cleanUp = function() {
    if(typeof(this.data.username) != "string") {
        this.data.username = ""
    }
    if(typeof(this.data.email) != "string") {
        this.data.email = ""
    }
    if(typeof(this.data.password) != "string") {
        this.data.password = ""
    }

    this.data = {
        username: this.data.username,
        email: this.data.email,
        password: this.data.password,
    }
    
}

User.prototype.validate = function() {
    return new Promise(async (resolve, reject) => {
        if(this.data.username == "") {
            this.errors.push("provide username")
        }
        /*
        if(this.data.username != "" && !validator.isAlphanumeric(this.data.username)){
            this.errors.push("only letters and numbers")
        }
        /*
        if(!validator.isEmail(this.data.email)) {
            this.errors.push("provide valid email")
        }*/
        if(this.data.email == "") {
            this.errors.push("provide email")
        }
        if(this.data.password == "") {
            this.errors.push("provide password")
        }
        /*
        if(this.data.password.length > 0 && this.data.password.length < 12) {
            this.errors.push("password > 12 char")
        }
        if(this.data.password.length > 100) {
            this.errors.push("password < 100")
        }*/
        
        if(this.data.username) {
            let usernameExists = await usersCollection.findOne({username: this.data.username})
    
            if(usernameExists) {
                this.errors.push("username taken")
            }
        }

        resolve()
    })
}

User.prototype.login = function() {

    let promise = new Promise(async (resolve, reject) => {
        this.cleanUp()
        const attemptedUser = await usersCollection.findOne({username: this.data.username})
        if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {//attemptedUser.password == this.data.password) {
            this.data = attemptedUser
            this.getAvatar()
            resolve(attemptedUser)
        } else {
            reject(false)
        }
    })
    return promise

    /*
    return new Promise(asnyc (resolve, reject) => {
        this.cleanUp()
        const attemptedUser = await usersCollection.findOne({username: this.data.username})
        if(attemptedUser && attemptedUser.password == this.data.password) {
            resolve(true)
        } else {
            reject(false)
        }
    })*/

    /*this.cleanUp()
    const attemptedUser = await usersCollection.findOne({username: this.data.username})
    if(attemptedUser && attemptedUser.password == this.data.password) {
        callback(true)
    } else {
        callback(false)
    }*/
}

User.prototype.register = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate()
    
        if(!this.errors.length) {
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
    
            await usersCollection.insertOne(this.data)
            this.getAvatar()
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

User.prototype.getAvatar = function () {
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username) {
    let promise = new Promise(function(resolve, reject) {
        if(typeof(username) != "string") {
            reject()
            return
        }

    //console.log(username)
    usersCollection.findOne({username: username}).then(function (userDoc) {
        if(userDoc) {
            //console.log(userDoc)

            /*
            userDoc = new User(userDoc, true)
            userDoc = {
                _id: userDoc.data.id,
                username: userDoc.data.username,
                avatar: userDoc.avatar
            }*/
            

            resolve(userDoc)
        } else {
            reject()
        }
    }).catch(() => {
        reject()
    })
    })

    return promise
}

module.exports = User