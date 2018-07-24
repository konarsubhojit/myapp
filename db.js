var MongoClient = require('mongodb').MongoClient;
const md5 = require('md5');
var url = "mongodb://localhost:27017/";
var id;

MongoClient.connect(url, { useNewUrlParser: true },function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  
  dbo.collection('users').deleteMany({},function( err, res){
    console.log(res);
  });

  var query = { pass: md5('pass') };
  
  dbo.collection('users').find(query).toArray( function (err , res){
    if(err) throw err;
    console.log(res);
    db.close();
  });

});