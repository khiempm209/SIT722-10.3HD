const express = require('express');
const router = express.Router();

const itemControllers = require('../controllers/items');
const conversationControllers = require('../controllers/conversations');
const authController = require("../controllers/auth");


router.get('/search', itemControllers.itemsSearch);
router.get('/trending', itemControllers.itemsTrending);
router.get('/itemById', itemControllers.itemsSearchById);

router.post('/pushConversation', conversationControllers.addConversation);
router.put('/updateConversation', conversationControllers.updateConversation);
router.post('/findConversationByUser', conversationControllers.findConversationsByUser);
router.put('/deleteConversationById', conversationControllers.deleteConversationById);

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

router.get("/me", authController.me);
router.get("/session", authController.sessionInfo);

module.exports = router;