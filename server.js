var express = require('express');
var app = express();

var url = require('url');
var admin = require('./admin');
const pug = require('pug');

const message = pug.compileFile('message.pug');

app.get('/id=:id',function (req,res){
    res.send(req.params.id);
    console.log(url.parse(req.url).pathname);
});

app.get('/name=:name', function (req,res){
    res.write(message({name: req.params.name}));
});

app.use('/admin', admin);

app.get('/',function (req,res){
    res.write(message({name:'Hello'}));
});

app.listen(3000);
