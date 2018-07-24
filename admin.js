var express = require('express');
var router = express.Router();

router.get('/',function (req , res){
    res.write('You are in the admin sectin');
});

module.exports = router;