/**
 * Created by scarry on 2.11.16.
 */
var Chat = function (socket) {
    this.socket = socket
};
Chat.prototype.sendMessage = function (room, text) {
    var message = {
        room: room,
        text: text
    };
    this.socket.emit('message', message);
};
Chat.prototype.changeRoom = function (room) {
    this.socket.emit('join', {newRoom: room});
};
Chat.prototype.processCommand = function (command) {
    var words = command.split(' '),
        command = words[0].substring(1, words[0].length).toLowerCase(),
        message = false;

    switch (command) {
        case 'join': {
            words.shift();
            var room = words.join('');
            this.changeRoom(room);
            break;
        }
        case 'nick': {
            words.shift();
            var name = words.join(' ');
            this.socket.emit('nameAttempt', name);
            break;
        }
        default: {
            message = 'Unrecognized command';
            break;
        }
    }
    return message;
};
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>'+message+'</i>');
}
function processUserInput(chatApp, socket) {
    var message = $('#send-message').val(),
        systemMessage = false;

    if (message.indexOf('/') == 0) {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');
}
var socket = io.connect();//продолжить отсюда

$(document).ready(function (result) {
    var chatApp = new Chat(socket);

    socket.on('nameResult', function (result) {
        var message;

        if (result.success) {
            message = 'You are now known as '+result.name+'.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });
    socket.on('joinResult', function (result) {
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed.'));
    });
    socket.on('message', function (message) {
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });
    socket.on('rooms', function (rooms) {
        $('#room-list').empty();
        for (var room in rooms) {
            room = room.substring(1,room.length);

            if (room != '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }

        $('#room-list div').click(function (e) {
            chatApp.processCommand('/join '+$(this).text());
            $('#send-message').focus();
        });
    });

    setInterval(function () {
        socket.emit('rooms');
    }, 1000);
    $('#send-message').focus();

    $('#send-form').submit(function (e) {
        processUserInput(chatApp, socket);
        return false;
    });
});