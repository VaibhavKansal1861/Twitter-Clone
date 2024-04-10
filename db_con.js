var mysql = require('mysql');
var con = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "Anurag@2003",
  database:"twitter"
});
con.connect(function (err) {
	if(err)
	{
		console.log('Error connecting to database: err', err.message);
		throw err;
	}
	console.log("Connection done");
	
});
module.exports = con;