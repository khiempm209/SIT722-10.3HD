const express = require('express');
const router = express.Router();  

const itemControllers = require('../controllers/items');

router.post('/inference', itemControllers.inference);
// router.get('/test', itemControllers.test);


module.exports = router;