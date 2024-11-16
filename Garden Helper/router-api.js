const apiRouter = require('express').Router()
const userController = require('./controllers/userApiController')
const postController = require('./controllers/postApiController')


apiRouter.post('/login', userController.apiLogin)  
apiRouter.post('/create-post', userController.apiMustBeLoggedIn, postController.apiCreate)
//apiRouter.delete('/post/:id', userContrller.apiMustBeLoggedIn, postController.apiDelete)

/*
apiRouter.post('/login', function(req, res) {
    res.json("message")
})*/

module.exports = apiRouter
