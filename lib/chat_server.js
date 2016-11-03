var socketio = require('socket.io'),
    io = false,
    guestNumber = 1,
    nickNames = {},
    namesUsed = [],
    currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function (socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        joinRoom(socket, 'Lobby');
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        socket.on('room', function () {
            socket.emit('room', io.sockets.manager.rooms);
        });

        handleClientDisconnection(socket, nickNames, namesUsed);
    })
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = "Guest"+guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success:true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
// Вход пользователя в комнату чата
    socket.join(room);
// Обнаружение пользователя в данной комнате
    currentRoom[socket.id] = room;
// Оповещение пользователя о том, что он находится в новой комнате
    socket.emit('joinResult', {room: room});
// Оповещение других пользователей о появлении нового
// пользователя в комнате чата
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });
// Идентификация других пользователей, находящихся в той же
// комнате, что и пользователь
    var usersInRoom = io.sockets.clients(room);
// Если другие пользователи присутствуют в данной
// комнате чата, просуммировать их
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
// Вывод отчета о других пользователях, находящихся в комнате
        socket.emit('message', {text: usersInRoomSummary});
    }
}
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function (name) {
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest"'
            });
        } else {
            if (namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id],
                    previousNameIndex = namesUsed.indexOf(previousName);

                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text:previousName + ' is now known as '+ name + "."
                })
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: "That name is alredy in use."
                });
            }
        }
    });
}
function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ": "+message.text
        })
    });
}
function handleRoomJoining(socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}
function handleClientDisconnection(socket) {
    socket.on('disconnect', function () {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}