var express =   require("express");
var multer  =   require('multer');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads');
  },
  filename: function (req, file, callback) {
    callback(null, req.body.userId + '.png');
  }
});
var upload = multer({ storage : storage}).single('userPhoto');

var users=[];
var messages=[];
var clients=[];
var count=0;

app.use(express.static(__dirname + '/public'));
//app.use(express.static(__dirname + '/uploads'));

app.get('/',function(req,res){
      res.sendFile(__dirname + "/index2.html");
});
app.post('/api/photo',function(req,res){
    upload(req,res,function(err) {
        if(err) {
          return res.end("Error uploading file.");
        }
        var user={
          id:req.body.userId,
          ipAddress:req.connection.remoteAddress,
          nickname:req.body.userNickname,
          isOnline:true,
          color:""+getRandomColor(),
          lastDateOnline:Date.now(),
          number:count,
          img:req.body.userPhotoName,
          accepts:''
        };
	    count+=1;
      	users.push(user);
      	res.end(JSON.stringify(user));
    });
});

io.on('connection', function(socket){
    socket.on('disconnect',function(){
      for(var key in clients){
        if(clients[key].id==socket.id){
          users[key].isOnline=false;
        }
      }
    });
    socket.on('NewUser', function(obj){
  		var client=socket;
		clients.push(client);
      	//console.log("Yepisyeni kullanıcı geldii....");
      	io.emit('UpdateUsers', users);
    });
    socket.on('NewMessage', function(obj){
      //console.log("from : "+JSON.parse(obj.fromUser).number);
      //console.log("to : "+obj.toUserId);
      messages.push(obj);
      clients[JSON.parse(obj.fromUser).number].emit('UpdateChatView',obj);
      clients[obj.toUserId].emit('UpdateChatToView',obj);
    });
    socket.on('requestAccept',function(obj){
      clients[obj.toUserId].emit('UpdateRequest',obj);
      //console.log(obj);
    });
    socket.on('requestAcceptResponse',function(obj){
      if(obj.status){
        users[obj.toUserId].accepts+=obj.fromUserId;
        users[obj.fromUserId].accepts+=obj.toUserId;
        clients[obj.toUserId].emit('UpdateRequestResponseYes',users);
        clients[obj.fromUserId].emit('UpdateRequestResponse',users);
      }else{
        clients[obj.toUserId].emit('UpdateRequestResponseNo',obj);
      }
      //console.log(obj);
    });
    socket.on('IsOnlineUsers', function(obj) {
      io.emit('UpdateUsers', users);
    });
    socket.on("UserDoConnect",function(obj){
      users[obj].isOnline=true;
      //clients[obj].emit('UpdateUserStatus', users[obj]);
    });
    socket.on("UserDoDisConnect",function(obj){
      users[obj].isOnline=false;
      //clients[obj].emit('UpdateUserStatus', users[obj]);
    });
});

http.listen(3000, function(){
  console.log('listening on *:' + 3000);
});

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}