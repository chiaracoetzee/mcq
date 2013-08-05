//  START CONSTANTS
var SERVER = "http://169.229.69.107:8888"
var RETRY_DELAY = 1000;
//  END CONSTANTS

//  START GLOBAL VARIABLES
var username = "";
var next_quiz = -1;
var first_choice = "";
var quiz_room_id = "";
var socket;
var retry_timer;
var quiz_timer;
var scroll_position = 0;
var scroll_speed = 20;
//  END GLOBAL VARIABLES

$(document).ready(function(){

  //  START
  socket = io.connect(SERVER);

  showUI('wait_ui', false);
  showUI('quiz_ui', false);
  showUI('discussion_ui', false);
  showUI('login_ui', true);

  $('#login').click(function(event) {
    var u = $('#username').val();
    var p = $('#password').val();

    socket.emit('login_req', {username: u, password: p});
  });

  $('#next_button').click(function(event) {
    showUI('discussion_ui', true);
  });

  $("#outgoing-message").keydown(function(e){
    if(e.which != 13) return;
    var msg = {username:username, message:$("#outgoing-message").val()};
    showOutgoingMessage(msg);
    $("#outgoing-message").val('');
    socket.emit('message', msg);
    $("#outgoing-message").focus();
  });
  
  $("#send").click(function(){
    // alert('clicked');
    var msg = {username:username, message:$("#outgoing-message").val()};
    showOutgoingMessage(msg);
    $("#outgoing-message").val('');
    socket.emit('message', msg);
    $("#outgoing-message").focus();
  });
  
  //  START EVENT HANDLERS
  socket.on('login_failure', loginFailed);
  socket.on('login_success', loginSucceeded);
  socket.on('wait', waitForQuiz);
  socket.on('quiz_room', quizRoom);
  socket.on('quiz', quiz);
  // socket.on('pick_quiz_failure', waitForQuiz);
  // socket.on('quiz_picked', goToQuiz);
  // socket.on('quiz_sent', quiz);
  socket.on('message', showIncomingMessage);
  // socket.on('active_clients', activeClients);
  //  END EVENT HANDLERS

  // socket.on('welcome', showGreetings);
  // socket.on('info', showSystemInfo);

  // addWaterMark();
  // sendButtonOnClick();
  // textboxOnEnter();
  // changeButtonOnClick();

  function loginFailed(msg) {
    alert("Login failed. " + msg);
    $('#password').val('');
  }

  function loginSucceeded(username_and_nq) {
    showUI('login_ui', false);
    showUI('wait_ui', true);
    
    socket.emit('waitlist_req', username_and_nq);
  }

  function waitForQuiz(username_and_nq) {
    retry_timer = window.setTimeout(function() {
      socket.emit('waitlist_req', username_and_nq);
    }, RETRY_DELAY);
  }

  function quizRoom(username_and_room_id) {
    clearTimeout(retry_timer);
    quiz_room_id = username_and_room_id.room_id;
    showUI('wait_ui', false);

    // alert(quiz_room_id);

    socket.emit('quiz_req', username_and_room_id);
  }

  function quiz(quiz_obj) {
    var question = quiz_obj.question;
    var image_url = quiz_obj.image_url;
    var choices = quiz_obj.choices;
    var time_limit = quiz_obj.time_limit;
    showUI('quiz_ui', true);

    $('#question').html(question);
    if(quiz.image_url!="") $('#image').html("<img src='" + image_url + "' />");
    for(var i=0;i<choices.length;i++) {
      $('#choices').append("<div class='choice_container'>");
      $('#choices').append("<div class='choice_box'>" + String.fromCharCode(65+i) + "</div>");
      $('#choices').append("<div class='choice'>");
      $('#choices').append(choices[i]);
      $('#choices').append("</div>");
      $('#choices').append("</div>");
    }
  }
  
  // function showGreetings(msg){
  //   $("#title").text(msg['greetings']);
  // }
 
  function showIncomingMessage(msg){
    $("#messages").append("<div class='in-message'>" + msg.username + ": " + msg.message + "</div>");
    scroll_position+=scroll_speed;
    $("#messages").scrollTop(scroll_position);
    $("#messages").scrollLeft(0);
  }

  function showOutgoingMessage(msg){
    $("#messages").append("<div class='out-message'>Me: " + msg.message + "</div>");
    scroll_position+=scroll_speed;
    $("#messages").scrollTop(scroll_position);
    $("#messages").scrollLeft(0);
  }

  // function addWaterMark(){
  //   $("#outgoing-message").watermark("Enter your message here");
  // }

  // function showSystemInfo(msg){
  //   $("#messages").append("<div class='info-message'>" + msg['msgOwner'] + ": " + msg['msgContent'] + "</div>");
  // }

  // function changeButtonOnClick(){
  //   $("#change").click(function(){
  //     var username = $("#username").val();
  //     registerUsername(username);
  //   });
  // }

  // function registerUsername(username){
  //   socket.emit('user-join', username);
  // }

  // function activeClients(data) {
  //   for(var i=0;i<data.length;i++) {
  //     alert(i+1 + "/" + data.length + "\n" + data[i].socket_id + "\n" + data[i].username + "\n" +data[i].next_quiz);
  //   }
  // }

  function showUI(ui_class, show) {
    if(show)
      $('.' + ui_class).css('display', 'inline');
    else
      $('.' + ui_class).css('display', 'none');
  }
});