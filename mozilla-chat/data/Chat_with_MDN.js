var Chat_with_MDN = {
    connection: null,
    room: null,
    nickname: null,

    NS_MUC: "http://jabber.org/protocol/muc",

    joined: null,
    participants: null,

    on_presence: function (presence) {
        var from = $(presence).attr('from');
        var room = Strophe.getBareJidFromJid(from);

        // make sure this presence is for the right room
        if (room === Chat_with_MDN.room) {
            var nick = Strophe.getResourceFromJid(from);
          
            if ($(presence).attr('type') === 'error' &&
                !Chat_with_MDN.joined) {
                // error joining room; reset app
                Chat_with_MDN.connection.disconnect();
            } else if (!Chat_with_MDN.participants[nick] &&
                $(presence).attr('type') !== 'unavailable') {
                // add to participant list
                var user_jid = $(presence).find('item').attr('jid');
                Chat_with_MDN.participants[nick] = user_jid || true;
                $('#participant-list').append('<li>' + nick + '</li>');

                if (Chat_with_MDN.joined) {
                    $(document).trigger('user_joined', nick);
                }
            } else if (Chat_with_MDN.participants[nick] &&
                       $(presence).attr('type') === 'unavailable') {
                // remove from participants list
                $('#participant-list li').each(function () {
                    if (nick === $(this).text()) {
                        $(this).remove();
                        return false;
                    }
                });

                $(document).trigger('user_left', nick);
            }

            if ($(presence).attr('type') !== 'error' &&
                !Chat_with_MDN.joined) {
                // check for status 110 to see if it's our own presence
                if ($(presence).find("status[code='110']").length > 0) {
                    // check if server changed our nick
                    if ($(presence).find("status[code='210']").length > 0) {
                        Chat_with_MDN.nickname = Strophe.getResourceFromJid(from);
                    }

                    // room join complete
                    $(document).trigger("room_joined");
                }
            }
        }

        return true;
    },

    on_public_message: function (message) {
        var from = $(message).attr('from');
        var room = Strophe.getBareJidFromJid(from);
        var nick = Strophe.getResourceFromJid(from);

        // make sure message is from the right place
        if (room === Chat_with_MDN.room) {
            // is message from a user or the room itself?
            var notice = !nick;

            // messages from ourself will be styled differently
            var nick_class = "nick";
            if (nick === Chat_with_MDN.nickname) {
                nick_class += " self";
            }
            
            var body = $(message).children('body').text();

            var delayed = $(message).children("delay").length > 0 ||
                $(message).children("x[xmlns='jabber:x:delay']").length > 0;

            // look for room topic change
            var subject = $(message).children('subject').text();
            if (subject) {
                $('#room-topic').text(subject);
            }

            if (!notice) {
                var delay_css = delayed ? " delayed" : "";

                var action = body.match(/\/me (.*)$/);
                if (!action) {
                    Chat_with_MDN.add_message(
                        "<div class='message" + delay_css + "'>" +
                            "&lt;<span class='" + nick_class + "'>" +
                            nick + "</span>&gt; <span class='body'>" +
                            body + "</span></div>");
                } else {
                    Chat_with_MDN.add_message(
                        "<div class='message action " + delay_css + "'>" +
                            "* " + nick + " " + action[1] + "</div>");
                }
            } else {
                Chat_with_MDN.add_message("<div class='notice'>*** " + body +
                                    "</div>");
            }
        }

        return true;
    },

    add_message: function (msg) {
        // detect if we are scrolled all the way down
        var chat = $('#chat').get(0);
        var at_bottom = chat.scrollTop >= chat.scrollHeight -
            chat.clientHeight;
        
        $('#chat').append(msg);

        // if we were at the bottom, keep us at the bottom
        if (at_bottom) {
            chat.scrollTop = chat.scrollHeight;
        }
    },

    on_private_message: function (message) {
        var from = $(message).attr('from');
        var room = Strophe.getBareJidFromJid(from);
        var nick = Strophe.getResourceFromJid(from);

        // make sure this message is from the correct room
        if (room === Chat_with_MDN.room) {
            var body = $(message).children('body').text();
            Chat_with_MDN.add_message("<div class='message private'>" +
                                "@@ &lt;<span class='nick'>" +
                                nick + "</span>&gt; <span class='body'>" +
                                body + "</span> @@</div>");
            
        }

        return true;
    }
};

$(document).ready(function () {
    $('#login_dialog').dialog({
        autoOpen: true,
        draggable: false,
        modal: true,
        title: 'Join a Room',
        buttons: {
            "Join": function () {
                Chat_with_MDN.room = $('#room').val().toLowerCase();
                Chat_with_MDN.nickname = $('#nickname').val();

                $(document).trigger('connect', {
                    jid: $('#jid').val().toLowerCase(),
                    password: $('#password').val()
                });

                $('#password').val('');
                $(this).dialog('close');
            }
        }
    });

    $('#leave').click(function () {
        $('#leave').attr('disabled', 'disabled');
        Chat_with_MDN.connection.send(
            $pres({to: Chat_with_MDN.room + "/" + Chat_with_MDN.nickname,
                   type: "unavailable"}));
        Chat_with_MDN.connection.disconnect();
    });

    $('#input').keypress(function (ev) {
        if (ev.which === 13) {
            ev.preventDefault();

            var body = $(this).val();

            var match = body.match(/^\/(.*?)(?: (.*))?$/);
            var args = null;
            if (match) {
                if (match[1] === "msg") {
                    args = match[2].match(/^(.*?) (.*)$/);
                    if (Chat_with_MDN.participants[args[1]]) {
                        Chat_with_MDN.connection.send(
                            $msg({
                                to: Chat_with_MDN.room + "/" + args[1],
                                type: "chat"}).c('body').t(body));
                        Chat_with_MDN.add_message(
                            "<div class='message private'>" +
                                "@@ &lt;<span class='nick self'>" +
                                Chat_with_MDN.nickname +
                                "</span>&gt; <span class='body'>" +
                                args[2] + "</span> @@</div>");
                    } else {
                        Chat_with_MDN.add_message(
                            "<div class='notice error'>" +
                                "Error: User not in room." +
                                "</div>");
                    }
                } else if (match[1] === "me" || match[1] === "action") {
                    Chat_with_MDN.connection.send(
                        $msg({
                            to: Chat_with_MDN.room,
                            type: "groupchat"}).c('body')
                            .t('/me ' + match[2]));
                } else if (match[1] === "topic") {
                    Chat_with_MDN.connection.send(
                        $msg({to: Chat_with_MDN.room,
                              type: "groupchat"}).c('subject')
                            .text(match[2]));
                } else if (match[1] === "kick") {
                    Chat_with_MDN.connection.sendIQ(
                        $iq({to: Chat_with_MDN.room,
                             type: "set"})
                            .c('query', {xmlns: Chat_with_MDN.NS_MUC + "#admin"})
                            .c('item', {nick: match[2],
                                        role: "none"}));
                } else if (match[1] === "ban") {
                    Chat_with_MDN.connection.sendIQ(
                        $iq({to: Chat_with_MDN.room,
                             type: "set"})
                            .c('query', {xmlns: Chat_with_MDN.NS_MUC + "#admin"})
                            .c('item', {jid: Chat_with_MDN.participants[match[2]],
                                        affiliation: "outcast"}));
                } else if (match[1] === "op") {
                    Chat_with_MDN.connection.sendIQ(
                        $iq({to: Chat_with_MDN.room,
                             type: "set"})
                            .c('query', {xmlns: Chat_with_MDN.NS_MUC + "#admin"})
                            .c('item', {jid: Chat_with_MDN.participants[match[2]],
                                        affiliation: "admin"}));
                } else if (match[1] === "deop") {
                    Chat_with_MDN.connection.sendIQ(
                        $iq({to: Chat_with_MDN.room,
                             type: "set"})
                            .c('query', {xmlns: Chat_with_MDN.NS_MUC + "#admin"})
                            .c('item', {jid: Chat_with_MDN.participants[match[2]],
                                        affiliation: "none"}));
                } else {
                    Chat_with_MDN.add_message(
                        "<div class='notice error'>" +
                            "Error: Command not recognized." +
                            "</div>");
                }
            } else {
                Chat_with_MDN.connection.send(
                    $msg({
                        to: Chat_with_MDN.room,
                        type: "groupchat"}).c('body').t(body));
            }

            $(this).val('');
        }
    });
});

$(document).bind('connect', function (ev, data) {
    Chat_with_MDN.connection = new Strophe.Connection(
        'http://bosh.aprilmorone.im:5280/xmpp-httpbind');

    Chat_with_MDN.connection.connect(
        data.jid, data.password,
        function (status) {
            if (status === Strophe.Status.CONNECTED) {
                $(document).trigger('connected');
            } else if (status === Strophe.Status.DISCONNECTED) {
                $(document).trigger('disconnected');
            }
        });
});

$(document).bind('connected', function () {
    Chat_with_MDN.joined = false;
    Chat_with_MDN.participants = {};

    Chat_with_MDN.connection.send($pres().c('priority').t('-1'));
    
    Chat_with_MDN.connection.addHandler(Chat_with_MDN.on_presence,
                                  null, "presence");
    Chat_with_MDN.connection.addHandler(Chat_with_MDN.on_public_message,
                                  null, "message", "groupchat");
    Chat_with_MDN.connection.addHandler(Chat_with_MDN.on_private_message,
                                  null, "message", "chat");

    Chat_with_MDN.connection.send(
        $pres({
            to: Chat_with_MDN.room + "/" + Chat_with_MDN.nickname
        }).c('x', {xmlns: Chat_with_MDN.NS_MUC}));
});

$(document).bind('disconnected', function () {
    Chat_with_MDN.connection = null;
    $('#room-name').empty();
    $('#room-topic').empty();
    $('#participant-list').empty();
    $('#chat').empty();
    $('#login_dialog').dialog('open');
});

$(document).bind('room_joined', function () {
    Chat_with_MDN.joined = true;

    $('#leave').removeAttr('disabled');
    $('#room-name').text(Chat_with_MDN.room);

    Chat_with_MDN.add_message("<div class='notice'>*** Room joined.</div>")
});

$(document).bind('user_joined', function (ev, nick) {
    Chat_with_MDN.add_message("<div class='notice'>*** " + nick +
                         " joined.</div>");
});

$(document).bind('user_left', function (ev, nick) {
    Chat_with_MDN.add_message("<div class='notice'>*** " + nick +
                        " left.</div>");
});