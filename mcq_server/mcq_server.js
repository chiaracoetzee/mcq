//  START CONSTANTS
var PORT_NUMBER = 8888;
var MAX_NUM_ROOMS = 100;
var MAX_NUM_ACTIVE_CLIENTS = 1000;
var NUM_CLIENTS_PER_QUIZ_ROOM = 2;
var NUM_CLIENTS_PER_CHAT_ROOM = 2;
var NUM_QUESTIONS_PER_QUIZ_ROOM = 2;
var APP_URL = 'http://people.ischool.berkeley.edu/~stlim/mcq/socket.html';
//  END CONSTANTS

//  START GLOBAL VARIABLES
  //  START NODE MODULES
  var express = require('express');
  var app = express();
  var server = require('http').createServer(app).listen(PORT_NUMBER);
  var io = require('socket.io').listen(server);
  //  END NODE MODULES

  //    START DATABASE VARIABLES
  var database = "mcq_db";
  var collections = ["user_login", "user_quiz"];
  var db = require("mongojs").connect(database, collections);
  //    END DATABASE VARIABLES

var num_active_quiz_rooms = 0;
var active_quiz_rooms = new Array();
var active_clients = new Array();
var quiz_set = require('./mcq_quiz.json');
var NUM_QUIZ = quiz_set.length; //  NUM_QUIZ SHOULD BE A MULTIPLE OF NUM_QUESTIONS_PER_QUIZ_ROOM
var num_waiting_clients = 0;
var waiting_clients_for_quiz = new Array();
for(var i=0;i<NUM_QUIZ;i++) { waiting_clients_for_quiz[i] = new Array(); }
//  END GLOBAL VARIABLES

//  START CLASS DEFINITIONS
function Client(id, name, q, nq) {
  this.socket_id = id;
  this.username = name;
  this.quiz = q;
  this.next_quiz = nq;
}

function QuizRoom(no, clients_array, quiz) {
  this.quiz_room_id = no;
  this.members = clients_array;
  this.quizzes = quiz;
  this.progress = 0;
  this.quizStatus = 0;
}
//  END CLASS DEFINITIONS

io.sockets.on('connection', function(socket) {
  //  START register socket event handlers
  socket.on('login_req', login);
  socket.on('waitlist_req', waitlist);
  socket.on('quiz_req', send_quiz);
  socket.on('message', broadcastMessage);
  socket.on('disconnect', function() {
    //  REMOVE FROM ACTIVE_CLIENTS
    for(var i=0;i<active_clients.length;i++) {
      if(active_clients[i].socket_id==socket.id) {
        active_clients.splice(i, 1);
        break;
      }
    }

    //  REMOVE FROM WAITING_CLIENTS
    for(var i=0;i<waiting_clients_for_quiz.length;i++) {
      for(var j=0;j<waiting_clients_for_quiz[i].length;j++) {
        if(waiting_clients_for_quiz[i][j].socket_id==socket.id) {
          var c = waiting_clients_for_quiz[i].splice(j, 1);
          num_waiting_clients--;
          console.log("#disconnect while waiting - username: %s, quiz number: %d, waiting: %d", c[0].username, i, waiting_clients_for_quiz[i].length);
          break;
        }
      }
    }

    //  TODO: REMOVE FROM QUIZ ROOM

    // console.log("#disconneted - %s, %d active clients, %d sockets", socket.id, active_clients.length, sockets.length);
  });
  //  END register socket event handlers

  function login(data) {
    console.log("#login request received - %s", data.username);
    //  TODO: dealing with multiple connection with one account
    // active_clients.forEach(function(element, index, array) {
    //   if(element.username===data.username) {
    //     socket.emit('login_failure', 'The account is being used.');
    //     return;
    //   }
    // });
    
    //  START DB SEARCH FOR LOGIN
    db.user_login.find({username:data.username, password:data.password}, function(err, db_res) {
      if(err || db_res.length==0) {
        console.log("#login failure - username: %s", username + "\n" + err);
        socket.emit('login_failure', 'Wrong username or password');
      }
      else {
        var username = db_res[0].username;
        console.log("#login username-password found: %s, socket id: %s", username, socket.id);

        db.user_quiz.find({username:username}, function(err, db_res) {
          if(err || db_res.length==0) {
            console.log("#login failure (no quiz record) - username: %s", username + "\n" + err);
            socket.emit('login_failure', "Quiz record doesn't exist.");
          }
          else {
            var quiz = db_res[0].quiz;
            var next_quiz = db_res[0].next_quiz;
            console.log("#login username-quiz found: %s, socket id: %s", username, socket.id);

            var client = new Client(socket.id, username, quiz, next_quiz);
            active_clients[username] = client;
            socket.emit('login_success', {username:client.username, num:client.next_quiz});
          }
        });
      }
    });
  }

  function waitlist(username_and_num_obj) {
    var username = username_and_num_obj.username;
    var num = username_and_num_obj.num;
    // var index = num/NUM_QUESTIONS_PER_QUIZ_ROOM;

    //  UPDATE WAIT LIST
   if(waiting_clients_for_quiz[num].indexOf(active_clients[username])<0) {
      waiting_clients_for_quiz[num].push(active_clients[username]);
      num_waiting_clients++;
      console.log("#waitlist request received - username: %s, quiz number: %d, waiting: %d", username, num, waiting_clients_for_quiz[num].length);
    }

    if(waiting_clients_for_quiz[num].length<NUM_CLIENTS_PER_QUIZ_ROOM) {
      socket.emit('wait', username_and_num_obj);
    }
    else {
      //  ASSIGN A QUIZ ROOM
      var quiz = new Array();
      for(var i=0;i<NUM_QUESTIONS_PER_QUIZ_ROOM;i++) {
        quiz[i] = num + i;
      }
      var room_id = waiting_clients_for_quiz[num][0].username;
      var qr = new QuizRoom(room_id, waiting_clients_for_quiz[num], quiz);
      active_quiz_rooms[room_id] = qr;

      for(var i=0;i<waiting_clients_for_quiz[num].length;i++) {
        if(socket.id==waiting_clients_for_quiz[num][i].socket_id) {
          socket.emit('quiz_room', {username:username, room_id:room_id})
        }
      }
      num_active_quiz_rooms++;

      //  UPDATE DB
      // for(var i=0;i<waiting_clients_for_quiz[num].length;i++) {
      //   if(socket.id==waiting_clients_for_quiz[num][i].socket_id) {
      //     var nq = waiting_clients_for_quiz[num][i].next_quiz + NUM_QUESTIONS_PER_QUIZ_ROOM;
      //     db.user_quiz.update({username:username}, {$set: {next_quiz:nq}}, function(err, db_res) {
      //       if(err || db_res.length==0) {
      //         console.log("#waitlist db update error - username: %s", username + "\n" + err);
      //       }
      //       else {
      //         console.log("#waitlist db updated - username: %s, next_quiz: %d", username, nq);
      //       }
      //     });
      //   }
      // }
    }
  }

  function send_quiz(username_and_room_id) {
    var username = username_and_room_id.username;
    var room_id = username_and_room_id.room_id;
    // console.log("#send quiz request received -  username: %s, room: %s", username, room_id);

    var quiz_room = active_quiz_rooms[room_id];
    var members = quiz_room.members;
    var progress = quiz_room.progress;
    var num = quiz_room.quizzes[progress];

    //  UPDATE WAITLIST
    for(var i=0;i<waiting_clients_for_quiz[num].length;i++) { 
      waiting_clients_for_quiz[num].shift();
      console.log("waitlist len - " + waiting_clients_for_quiz[num].length);
    }

    for(var i=0;i<members.length;i++) {
      console.log(members[i].username + " is in " + room_id);
      // if(socket.id==members[i].socket_id) {
      //   socket.emit('quiz', quiz_set[num]);
      //   console.log("#send quiz - username: %s, room: %s, quiz number: %d", members[i].username, room_id, num);
      // }
    }
  }

  function broadcastMessage(msg){
    var _username = msg.username;
    var _message = msg.message;

    // socket.get('username', function(err, username){
    //   // if(!username)
    //   //   username = DEFAULT_USERNAME;
    //   var broadcastMsg = {
    //     msgOwner:username,
    //     msgContent:msg
    //   };
      socket.broadcast.emit('message', {username:_username, message:_message});
    // });
  }
});