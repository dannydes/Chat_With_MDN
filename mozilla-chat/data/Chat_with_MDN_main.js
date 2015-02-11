// Log messages to the output area
var output = document.getElementById("output");
function log(message) {
var line = document.createElement("div");
line.textContent = message;
output.appendChild(line);
}
function connectHandler(cond) {
if (cond == Strophe.Status.CONNECTED) {
log("connected");
connection.send($pres());
}
}

var url = "ws://localhost:5280/";
var connection = null;
var connectButton = document.getElementById("connectButton");
connectButton.onclick = function() {
var username = document.getElementById("username").value;
var password = document.getElementById("password").value;
connection = new Strophe.Connection(
{proto: new Strophe.Websocket(url)});
connection.connect(username, password, connectHandler);
}

// Create presence update UI
var presenceArea = document.getElementById("presenceArea");
var sel = document.createElement("select");
var availabilities = ["away", "chat", "dnd", "xa"];
var labels = ["Away", "Available", "Busy", "Gone"];
for (var i=0; i<availabilities.length; i++) {
var option = document.createElement("option");
option.value = availabilities[i];
option.text = labels[i];
sel.add(option);
}
presenceArea.appendChild(sel);

var statusInput = document.createElement("input");
statusInput.setAttribute("placeholder", "status");
presenceArea.appendChild(statusInput);

var statusButton = document.createElement("button");
statusButton.onclick = function() {
var pres = $pres()
.c("show").t("away").up()
.c("status").t(statusInput.value);
connection.send(pres)
}
presenceArea.appendChild(statusButton);

function presenceHandler(presence) {
var from = presence.getAttribute("from");
var show = "";
var status = "";
Strophe.forEachChild(presence, "show", function(elem) {
show = elem.textContent;
});
Strophe.forEachChild(presence, "status", function(elem) {
status = elem.textContent;
});
//
if (show || status){
log("[presence] " + from + ":" + status + " " + show);
}
// indicate that this handler should be called repeatedly
return true;
}

connection.addHandler(presenceHandler, null, "presence", null);