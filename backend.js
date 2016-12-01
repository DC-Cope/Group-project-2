var express = require('express'),
   app = express(),
   server = require('http').createServer(app),
   io = require('socket.io').listen(server),
   bcrypt = require('bcrypt'),
   bodyParser = require('body-parser'),
   uuid = require('uuid'),
   pgp = require('pg-promise')(),
   dotenv = require('dotenv').config(),
   room = '',
   listeners = [],
   speakerRoom = [];
  //  http = require('http').Server(app);

  //  nicknames = [];



// Makes front end files pull from /public
app.use(express.static('public'));
app.use(bodyParser.json());


var db = pgp(database='cope_db');

db.connect({
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.dnv.DB_PASS
});

//Signup
app.post('/signup', function(req, res) {
  //Contains key-value pairs of data submitted in the request body
  var userInfo = req.body;

  // Encrypts the new user's password and stores it in a hash variable
  bcrypt.hash(userInfo.password, 10, function(err, hash){
    //Handles errors
    if (err) {
      res.json({status: "Failed"});
      return;
    }
    //If info is valid, it inserts info into database
    else {
      db.query('INSERT INTO copee VALUES (default, $1, $2, $3, $4, $5, default, default)', [userInfo.username, userInfo.email, hash, userInfo.first_name, userInfo.last_name]);
    }
    //Returns success response
    res.json({status: 'OK'});
  });
});

//Login
app.post('/login', function(req, res) {
 var userInfo = req.body;
 db.query('SELECT * FROM copee where copee.email = $1', [userInfo.email]).then(function(userInfoOld) {
   console.log(userInfoOld);
   console.log("HEY HEY HEY",userInfoOld[0].password);
   bcrypt.compare(userInfo.password, userInfoOld[0].password, function(err, newHash) {
     if (err) {
       res.json({status: "Failed"});
       return;
     } else if (!newHash) {
       res.status(401).json({status: "Failed", message: "Incorrect Password"});
       return;
     } else {
       var token = uuid();
       var id = userInfoOld[0].id;
       db.query('INSERT INTO auth_token VALUES($1, default, $2)', [token, id]);
     }
     res.status(200).json({token: token, status: "Logged In", username: userInfoOld[0].username, email: userInfoOld[0].email, first_name: userInfoOld[0].first_name, last_name: userInfoOld[0].last_name });
   });
 });

});


//**************************************************
//THIS IS THE SOCKET.IO STUFF
//**************************************************

io.on('connection', function(socket) {
  socket.on('user', function(data) {
    if (data.listener) {
      // console.log('this user is a listener');
      if (data.username in listeners) {
        console.log('name taken');
      }
      else {
        socket.nickname = data.username;
        socket.room = 'listeners';
        listeners.push(socket);
        // console.log('this is the listeners array and should be populated now', listeners.map(function(socket){
        //   return socket.nickname;
        // }));
        socket.join(socket.room);
        updateListeners();
      }
      socket.on('user', function(data) {
        console.log('blah');
      });
    }
    else {
      var privateRoom = [];
      // console.log('this user is a speaker');
      privateRoom.push(data.username);
      socket.nickname = data.username;
      socket.room = data.username;
      speakerRoom.push(socket);
      console.log('hey ho, lets go. im speaker, this is the room name', socket.room);
      console.log('this is the list of available listeners', listeners.map(function(socket){
        return socket.nickname;
      }));
      socket.join(socket.room);
      io.sockets.in(socket.room).emit('user room update', socket.room);
      io.sockets.in(socket.room).emit('sent users', privateRoom);
      if (listeners.length > 0) {
        // console.log('the listeners list is populated!');
        // console.log('the first listener is', listeners[0].nickname);
        privateRoom.push(listeners[0].nickname);
        io.emit('move message', {userRoom: socket.room, listener: listeners[0].nickname});
        listeners[0].leave('listeners');
        listeners[0].room = socket.room;
        io.sockets.in(socket.room).emit('move message', {userRoom: socket.room, listener: listeners[0].nickname});
        // console.log('this is the room i want to go to', socket.room);
        listeners[0].join(socket.room);
        io.sockets.in(socket.room).emit('user room update', listeners[0].nickname);
        io.sockets.in(socket.room).emit('sent users', privateRoom);
        listeners.splice(0, 1);
      }
    }
  });
  console.log('a user connected');

  function updateListeners() {
    io.emit('sent listeners', listeners.map(function(socket){
      return socket.nickname;
    }));
  }

  // function updateSpeakerRoom() {
  //   io.emit('sent users', speakerRoom.map(function(socket) {
  //     return socket.nickname;
  //   }));
  // }

  socket.on('sent chat message', function(msg) {
    console.log('sent chat message:' + msg);
    io.sockets.in(socket.room).emit('recieved chat message', {message: msg, user: socket.nickname});
  });

  socket.on('disconnect', function() {
    console.log('user disconnected');
    if(!socket.nickname) return;
    var index = listeners.indexOf(socket);
    var index2 = speakerRoom.indexOf(socket);
    if (index != -1) {
      listeners.splice(index, 1);
    }
    if (index2 != -1) {
      speakerRoom.splice(index2, 1);
    }
    updateListeners();
  });

});

server.listen(3000, function() {
  console.log('listening on *:3000');
});

// http.listen(3000, function() {
//   console.log('listening on *:3000');
// });
