const fs = require("fs");
const ytdl = require('ytdl-core');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const {prefix} = require('./config.json');

var servers = {}; //global variable to hold music queue
var copypastaObject; //global variable to hold retrieved copypastas

//initialising variables and stuff below
loadNewPasta(); //this initialises the object to contain a pasta as soon as the server starts
var beginningSentenceReactions = JSON.parse(fs.readFileSync("json/beginningSentenceReactions.json").toString());
var inSentenceReactions = JSON.parse(fs.readFileSync("json/inSentenceReactions.json").toString());

function loadNewPasta() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          copypastaObject = JSON.parse(this.responseText);
       }
    };
    xhttp.open("GET", "https://erewhon.xyz/copypasta/api/random", true);
    xhttp.send();
}

function getTime(){
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    if(hours < 10) { hours = "0" + hours; }
    if(minutes < 10) { minutes = "0" + minutes; }
    if(seconds < 10) { seconds = "0" + seconds; }
    return ("The time is: " + hours + ":" + minutes + ":" + seconds + " GMT");
}


function regexGen(input){ //https://stackoverflow.com/a/874742/, to add regex support directly from the JSON files
	var flags = input.replace(/.*\/([gimy]*)$/, '$1');
	var pattern = input.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
	return new RegExp(pattern, flags);
}

function spokenWord(msg){
    var reaction = beginningSentenceReactions[msg.content];
    if(reaction){ //handles cases where the thing just said matches a whole sentence
        if(reaction["regex"] == false){
            msg.channel.send(reaction["resp"]);
        }
    }else{
        for(var key in beginningSentenceReactions){
            if(beginningSentenceReactions[key]["regex"]){
                if(msg.content.search(regexGen(key)) == 0){
                    msg.channel.send(beginningSentenceReactions[key]["resp"]);
                }
            }
        }
    }

    for(var key in inSentenceReactions){ //handles cases where we want the bot to respond to whatever is in here no matter where in the sentence
        if(!inSentenceReactions[key]["regex"]){
            if(msg.content.search(key) != -1){
                msg.channel.send(inSentenceReactions[key]["resp"]);
            }
        }else{
            if(msg.content.search(regexGen(key)) != -1){
                msg.channel.send(inSentenceReactions[key]["resp"]);
            }
        }
    }
}

function playMusic(msg){
    msg.content = msg.content.split(" ");

    function play(connection, msg){
        var server = servers[msg.guild.id]
        server.dispatcher = connection.playStream(ytdl(server.queue[0], {filter: "audioonly"}));
        server.queue.shift();

        server.dispatcher.on("end", () => {
            if(server.queue[0]){
                play(connection, msg);
            }else{
                connection.disconnect();
            }
        });
    }

    if(!msg.content[1]){
        msg.channel.send("You need to provide a link.")
        return;
    }

    if(!msg.member.voiceChannel){
        msg.channel.send("Join a voice channel first.")
        return;
    }

    if(!servers[msg.guild.id]) servers[msg.guild.id] = {
        queue: []
    }

    var server = servers[msg.guild.id];
    server.queue.push(msg.content[1]);

    if(!msg.guild.voiceConnection) msg.member.voiceChannel.join().then((connection) => {
        play(connection, msg);
    });
}

function command(msg){
    if(msg.content.search(prefix) == 0){
        msg.content = msg.content.slice(1, msg.content.length);
        
        switch (msg.content){
            case 'play':
                playMusic(msg);
                break;
            case 'copypasta pls':
                msg.channel.send(copypastaObject);
                loadNewPasta();
                break;
            case 'what\'s the time?':
                msg.channel.search(getTime());
                break;
        }
    }
}

async function respond(msg){
	// if we match a spoken word, stop pipeline
	if (spokenWord(msg)) return;
	// finally, try for commands
	if (command(msg)) return;
}

module.exports = respond;