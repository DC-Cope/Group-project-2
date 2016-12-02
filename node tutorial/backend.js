var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var nicknames = [];

//Serves front-end files
app.use(express.static('public'));

// app.get('/', function(req, res){
//   res.sendfile('index.html');
// });

io.on('connection', function(socket){
  socket.on('new user', function(data, callback) {
    if (nicknames.indexOf(data) != -1) { //checks if nickname exists
      callback(false);
    } else {
      callback(true);
      socket.nickname = data; //adds nickname to socket
      nicknames.push(socket.nickname);
      updateNicknames();
    }
  });
});

// io.on('connection', function(socket){
//   console.log('a user connected');
//   socket.on('disconnect', function(){
//     console.log('user disconnected');
//   });
// });


//Submits nicknames array to all users
function updateNicknames() {
  io.emit('usernames', nicknames);

}

io.on('connection', function(socket){
  socket.on('send message', function(data){
    io.emit('new message', {msg: data, nick: socket.nickname});
    console.log('message:', data);
  });


  //Removes user from array on disconnect
  socket.on('disconnect', function(data) {
    if(!socket.nickname) return;
    nicknames.splice(nicknames.indexOf(socket.nickname), 1); //cuts nickname out of array
    updateNicknames();
  });
});
http.listen(3000, function(){
  console.log('listening on *:3000');
});
