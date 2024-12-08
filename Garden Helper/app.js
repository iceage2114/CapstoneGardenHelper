const express = require('express')

const session = require('express-session')
const MongoStore = require('connect-mongo')
const flash = require('connect-flash')


const markdown = require('marked')
const sanitizeHTML = require('sanitize-html')
const app = express()


app.use(express.urlencoded({extended: false}))
app.use(express.json())

app.use(express.static('public'));

app.use('/api', require('./router-api'))

let sessionOptions = session({
    secret: "javascript",
    store: MongoStore.create({client: require('./db')}),
    resave: false,
    saveUninitialize: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}
})

app.use(sessionOptions)

app.use(flash())

app.use(function(req, res, next) {

    res.locals.filterUserHTML = function(content) {
        return sanitizeHTML(markdown.parse(content), {allowedTags: ['p', 'br', 'ul', 'bold'], allowedAttributes: {}})
    }
    
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    
    if(req.session.user) {
        req.visitorId = req.session.user._id
    } else {
        req.visitorId = 0
    }

    res.locals.user = req.session.user
    next()
})

const router = require('./router')

app.use(express.static('public'))
app.set('views', 'views')
app.set('view engine', 'ejs')

app.use('/', router)

module.exports = app