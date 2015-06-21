var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var playersEntered = 0;
var playerNum = -1;
var playersLocked = 0;
var nicknames = [];
var socketIds = [];
var playerRole = ['god'];
var accused = [];
var votes = [];
var voted = [];
var debateMode = false;
var votingMode = false;
var mafiaList = [];
var mafiaMode = false;
var policeList = [];
var policeMode = false;
var dead = [];
var saved = [];
var doctorMode = false;
var taunt = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));

io.on('connection', function(socket){
  console.log(socket.id);
  if (playersLocked == 0){
    playerNum++;
    playersEntered++;
    nicknames.push("player"  + playersEntered);
    socketIds.push(socket.id);
    if (playerNum == 0){
      io.sockets.connected[socketIds[0]].emit('player enter', 'god');
    }
    sendPM(socket.id, "Your nickname is " + nicknames[socketIds.indexOf(socket.id)]);
    io.emit('disp message', nicknames[socketIds.indexOf(socket.id)] + " has joined the room");
  } else{

  }

  socket.on('pleb message', function(msg){
    if (debateMode){
      if (arguments.length == 2){
        io.emit('disp message', nicknames[socketIds.indexOf(socket.id)] + ": " + msg);
      } else {
        sendPM(socket.id, "yo you gotta have a message to send...");
      }
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('prelock message', function(msg){
    if (!playersLocked){
      if (arguments.length == 1){
        if (msg == "globaltaunt" && taunt == 0){
          io.emit('global taunt', "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
          taunt = 1;
          sendPM(socket.id, "hehehe");
        } else {
          io.emit('disp message', nicknames[socketIds.indexOf(socket.id)] + ": " + msg);
        }
      } else {
        sendPM(socket.id, "yo you gotta have a message to send...");
      }
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('who doctor', function(){
    if (checkRole(socket.id, 'god')){
      sendPM(socket.id, nicknames[playerRole.indexOf(doctor)]);
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('accused list', function(){
    sendPM(socket.id, accused.join(', '));
  });

  socket.on('vote target', function(prynne){
    if (votingMode){
      if (arguments.length == 2){
        var hesterId = socketIds.indexOf(socket.id);
        var votedNick = nicknames[hesterId];
        var accusedIndex = accused.indexOf(prynne);
        if(voted.indexOf(votedNick) == -1){
          if(accusedIndex != -1){
            io.emit('vote message', votedNick + " votes " + prynne + "!");
            votes[accusedIndex] += 1;
            voted.push(votedNick);
            if(voted.length == playerNum){
              heresJohnny();
            }
          } else {
            sendPM(socket.id, "Not a valid person to vote. Check /accusedlist");
          }
        } else {
          sendPM(socket.id, "you already voted!")
        }
      } else {
        sendPM(socket.id, "yo you gotta accuse someone, not no one");
      }
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  //Nickname stuff
  socket.on('player nicks', function(){
    sendPM(socket.id, nicknames.join(', '));
  });

  socket.on('who god', function(){
    sendPM(socket.id, nicknames[0]);
  });

  socket.on('set nickname', function(nick){
    if (socketIds.indexOf(socket.id) > -1){
      if (arguments.length == 1){
        if(checkName(nick)){
          var socketIndex = socketIds.indexOf(socket.id);
          io.emit('disp message', nicknames[socketIndex] + " now goes by: " + nick);
          nicknames[socketIndex] = nick;
          console.log(socket.id + "set their nickname to: " + nick);
          io.sockets.connected[socket.id].emit('send nickname', nick);
        } else {
          sendPM(socket.id, "sorry, that name is already taken");
        }
      } else {
        sendPM(socket.id, "Be sure to include the nickname. The format is: /pm theirname yourmessage");
      }
    } else {
      sendPM(socket.id, "shadup. You're dead. Stay dead.");
    }
  });

  //PMs
  socket.on('private message', function(nickname, message){
    if (socketIds.indexOf(socket.id) > -1){
      if (arguments.length == 2){
        var ourNick = nicknames[socketIds.indexOf(socket.id)];
        var theirInd = findPosNickname(nickname);
        if (theirInd > -1){
            var theirID = socketIds[theirInd];//
            newMessage = ourNick + " says: " + message;
            sendPM(theirID, newMessage);
            sendPM(socket.id, newMessage);
        }
        else{
            newMessage = nickname + " does not exist";
            sendPM(socket.id, newMessage);
        }
      }
    } else {
        sendPM(socket.id, "shadup. You're dead. Stay dead.");
    }
  });

  //God Commands
  socket.on('god message', function(msg){
    if (checkRole(socket.id, 'god')){
      io.emit('disp god', msg);
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('game lock', function(){
    if(checkRole(socket.id, 'god')){
      if(playerNum > 5 && playersLocked == 0){
        console.log('Game is locked');
        playersLocked = 1;
        roleAssignment();
        sendPM(socket.id, "the game is locked");
        io.emit('game locked');
      } else {
        sendPM(socket.id, "Not enough players or the game has already been locked");
      }
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('game start', function(){
    if(checkRole(socket.id, 'god')){
      if(playerLocked == 1){
        console.log('Game is starting...');
        sendPM(socket.id, "Game is starting...");
        accused = [];
        votes = [];
        voted = [];
        var saved = [];
        debateMode = false;
        votingMode = false;
        mafiaMode = false;
        var policeMode = false;
        var doctorMode = false;
        startGame();
      } else {
        sendPM(socket.id, "Gotta lock the players first");
      }
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('voting mode', function(){
    if(checkRole(socket.id, 'god')){
      debateMode = false;
      votingMode = true;
      io.emit('toggle debate', debateMode);
      io.emit('toggle vote', votingMode);
      io.emit('disp message', "Voting time has begun (no more accusing)! Type /accusedlist for a list of players who have been accused. Type /vote theirNickname to vote for someone!")
    } else{
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  //Mafia Commands
  socket.on('mafia friends', function(){
    var names = '';
    if(checkRole(socket.id, 'mafia') || checkRole(socket.id, 'god')){
      for (i = 0; i < mafiaList.length; i++) {
        names += nicknames[mafiaList[i]] + ' and ';
      }
      var namesMsg = names.slice(0, -5);
      sendPM(socket.id, "Mafia friends: " + namesMsg);
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('mafia kill', function(target){
    if (mafiaMode == true){
      if (checkRole(socket.id, 'mafia')){
        if (target != nicknames[0]){
          sendPM(socketIds[0], target + " has been marked for deletion.");
          for (i = 0; i < mafiaList.length; i++) {
            sendPM(socketIds[mafiaList[i]], target + " has been marked for deletion. Good work.");
          }
          if (saved.indexOf(target) == -1){
            killed(target);
          } else {
            sendPM(socketIds[0], target + " has been saved! Be sure to include it in your story :D");
            saved = [];
          }
          mafiaDone();
        } else {
          sendPM(socket.id, "lol sorry but you can't kill god (your name isn't Zancrow, Sherria Blendy, or Orga Nanagear by chance is it?)")
        }
      } else{
        io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
      }
    } else {
      sendPM(socket.id, "Not /mafiamode yet. Can't use this command.");
    }
  });

  //Police Commands
  socket.on('police friends', function(){
    var names = '';
    if(checkRole(socket.id, 'police') || checkRole(socket.id, 'god')){
      for (i = 0; i < policeList.length; i++) {
        names += nicknames[policeList[i]] + ' and ';
      }
      var namesMsg = names.slice(0, -5);
      sendPM(socket.id, "Police friends: " + namesMsg);
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  socket.on('police accuse', function(target){
    if (policeMode == true){
      if (checkRole(socket.id, 'police')){
        if (target != nicknames[0]){
          targetIndex = nicknames.indexOf(target);
          if (mafiaList.indexOf(targetIndex) > -1){
            for (i = 0; i < policeList.length; i++) {
              sendPM(socketIds[police[i]], target + " is a member of the mafia. Good work.");
              sendPM(socketIds[0], "The police have identified a member of a mafia. Do NOT mention this in the story");
            }
          } else {
            for (i = 0; i < policeList.length; i++) {
              sendPM(socketIds[police[i]], target + " is NOT a member of the mafia. Guess better.");
            }
          }
          policeDone();
        } else {
          sendPM(socket.id, "lol god isn't part of the mafia... Try again");
        }
      } else {
        io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
      }
    } else{
      sendPM(socket.id, "not /policemode yet. Can't use this command.");
    }
  });

  //Doctor Command
  socket.on('doctor heal', function(patient){
    if (doctorMode == true){
      if (checkRole(socket.id, 'doctor')){
        if (target != nicknames[0]){
          saved.push(target);
          sendPM(socket.id, target + " is safe tonight.");
          doctorDone();
        } else {
          sendPM(socket.id, "I assure you, god will not be harmed by the mafia this turn XD")
        }
      } else {
        io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
      }
    } else {
      sendPM(socket.id, "Not /doctormode yet. Can't use this command.")
    }
  });

  //Accused
  socket.on('accused', function(hester){
    if (debateMode){
      accuseMsg = '';
      accuseMsg += nicknames[socketIds.indexOf(socket.id)] + " accuses " + hester + "!";
      accused.push(hester);
      io.emit('accuse message', accuseMsg);
    } else {
      io.emit('disp message', "Either I goofed, or " + nicknames[socketIds.indexOf(socket.id)] + " is hacking and isn't cool.");
    }
  });

  //Baibai
  socket.on('disconnect', function(){
    var socketIndex = socketIds.indexOf(socket.id);
    if (playersLocked == 0){
      playerNum--;
      io.emit('player leave', playerRole[playerNum]);
    } else if(socketIndex == -1){
    } else {
      io.emit('disp message', nicknames[socketIndex] + " has left. FLAME THAT PERSON");
    }
    console.log(nicknames[socketIndex] + " has left.");
    socketIds.splice(socketIndex, 1);
    playerRole.splice(socketIndex, 1);
    if (playerRole.length == 0){
      playerRole = ['god'];
    }
    nicknames.splice(socketIndex, 1);
  });

});

//Stackoverflow is bae <3
//Shuffles a given list
function shuffle(array) {
  var counter = array.length, temp, index;
  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    index = Math.floor(Math.random() * counter);
    // Decrease counter by 1
    counter--;
    // And swap the last element with it
    temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }
  return array;
}

function checkRole(sockId, role){
  if(playerRole[socketIds.indexOf(sockId)] == role){
    return true;
  } else {
    return false;
  }
}

function checkName(name){
    var pos = findPosNickname(name);
    
    return (pos == -1);
  /*for (i = 0; i < nicknames.length; i++){
    if(nicknames[i].toLocaleLowerCase() == name.toLocaleLowerCase()){
      return false
    }
  }
  return true; */
  
}

//Finds the position using a given nickname
function findPosNickname(name){
  for (i = 0; i < nicknames.length; i++){
    if(nicknames[i].toLocaleLowerCase() == name.toLocaleLowerCase()){
      return i;
    }
  }
  return -1;
}

function sendPM(sockId, message){
  io.sockets.connected[sockId].emit('priv message', message);
}

function killed(target){
  var targetIndex = nicknames.indexOf(target);
  dead.push(nicknames[targetIndex]);
  sendPM(socketIds[targetIndex], "You died :( RIP. You can stay and watch the rest of the game as a bystander, but no PMing.");
  io.sockets.connected[socketIds[targetIndex]].emit('is dead');
  console.log(target + " died.")
  socketIds.splice(targetIndex, 1);
  playerRole.splice(targetIndex, 1);
  nicknames.splice(targetIndex, 1);
  votingMode = false;
  io.emit('toggle vote', votingMode);
  accused = [];
  votes = [];
  voted = [];
  saved = [];
  debateMode = false;
  votingMode = false;
}

function heresJohnny(){
  var highVotes = getMaxOfArray(votes);
  var deadIndex = votes.indexOf(highVotes);
  io.emit('disp message', accused[deadIndex] + " has been killed.")
  killed(accused[deadIndex]);
  sendPM(socketIds[0], "The round is over! Use /start to start the next round");
}

function getMaxOfArray(numArray) {
  return Math.max.apply(null, numArray);
}

function roleAssignment(){
  console.log("Assigning roles");
  if(playerNum == 6){
    playerRole = playerRole.concat(shuffle(['mafia', 'police', 'doctor', 'mafia', 'civilian', 'civilian']));
  } else {
    var playing = playerNum - 2;
    var roleArray = ['mafia', 'police', 'civilian', 'civilian'];
    var baseArray = repeatArray(roleArray, (playing - playing%4)/4);
    if (playing%4 != 0) {
      for (i = 0; i < 3; i++){
        baseArray.push('civilian');
      }
    }
    baseArray.push('doctor');
    var randomizedList = shuffle(baseArray);
    var rolesList = randomizedList;
    for (i = 1; i < playerRole.length; i++){
      if (playerRole[i] == 'mafia') {
        mafiaList.push(i);
      } else if (playerRole[i] == 'police'){
        policeList.push(i);
      }
      io.sockets.connected[socketIds[i]].emit('player enter', [playerRole[i]]);
    }
    playerRole = playerRole.concat(rolesList);
  }
}

function repeatArray(array, times){
  var newArray = [];
  for (i = 0; i <= times; i++){
    newArray = newArray.concat(array);
  }
  return newArray;
}

function startGame(){
  doctorMode = true;
  console.log('Doctor mode is set');
  doctorIndex = playerRole.indexOf('doctor');
  sendPM(socketIds[doctorIndex], "It's time to heal! Use /doctorheal theirNickname to heal someone");
  io.emit('disp message', "A doctor is wandering about...");
}

function doctorDone(){
  doctorMode = false;
  console.log('Doctor mode is off');
  mafiaMode = true;
  console.log('Mafia mode is set');
  for (i = 0; i < mafiaList.length; i++){
    sendPM(socketIds[mafiaList[i]], "It's time to kill! Use /mafiakill theirNickname to target someone for extermination");
  }
  io.emit('disp message', "The night comes and the mafia will strike! Sleep in fear...");
}

function mafiaDone(){
  mafiaMode = false;
  console.log('Mafia mode is off');
  policeMode = true;
  console.log('Police mode is set');
  for (i = 0; i < policeList.length; i++){
    sendPM(socketIds[policeList[i]], "It's time to investigate! Use /policeaccuse theirNickname to investigate someone");
  }
  io.emit('disp message', "The police are out investigating... can they save us?");
}

function policeDone(){
  policeMode = false;
  console.log('Police mode is off');
  debateMode = true;
  console.log('Debate mode is on');
  io.emit('toggle debate', debateMode);
  io.emit('disp message', "It is now time to debate! Anyone can chat. Accuse someone with /accuse! Voting will begin shortly");
  sendPM(socketIds[0], "yoyoyo use /voting when you think the time is right. Do NOT goof this up, once you start /voting you cannot go back and accuse someone else");
}

http.listen(4000, function(){
  console.log('listening on port: 4000');
});