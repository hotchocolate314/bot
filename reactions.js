const fs = require("fs");
const ytdl = require('ytdl-core');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const {prefix} = require('./config.json');
const discord = require("discord.js");
const ytlist = require('youtube-playlist');

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

function embedMaker(colour, description, title, image, link){
    var embed = new discord.RichEmbed();
    if(colour) embed.setColor(colour);
    if(title) embed.setTitle(title);
    if(description) embed.setDescription(description);
    //if(image) embed.setImage(image);
    if(link) embed.setFooter(link);
    return embed;
}

async function playMusic(msg){
    msg.content = msg.content.split(" ");

    async function play(connection, msg){
        var server = servers[msg.guild.id];

        const songInfo = await ytdl.getInfo(server.queue[0].url);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
            //thumbnail: songInfo.player_response.videoDetails.thumbnail["thumbnails"][3]["url"]
        };

        if(song.title){ //it can't get vid details and stuff if this is undefined
            msg.channel.send(embedMaker("#27ae60", "Now playing:\n***" + song.title + "***", "cute little music bot", /*song.thumbnail,*/ song.url));

            server.currentlyPlaying = {};
            server.currentlyPlaying.title = song.title;
            server.currentlyPlaying.url = song.url;
            //server.currentlyPlaying.thumbnail = song.thumbnail;
            server.currentlyPlaying.requesterID = server.queue[0].requesterID;

            server.dispatcher = connection.playStream(ytdl(server.queue[0].url, {quality: "highestaudio"})); //THIS LINE FAILS sometimes
            server.queue.shift();
        }

        server.dispatcher.on("end", () => {
            if(server.queue[0]){
                play(connection, msg);
            }else{
                server.currentlyPlaying = undefined;
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
    
    if(msg.content[1].search('playlist') == -1){ //different routine if it's a playlist
        const songInfo = await ytdl.getInfo(msg.content[1]);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
            //thumbnail: songInfo.player_response.videoDetails.thumbnail["thumbnails"][3]["url"]
        };

        var pushItem = {
            requesterID: msg.member.id,
            url: msg.content[1],
            title: song.title
        };
        server.queue.push(pushItem);

        if(song.title){ //it can't get vid details and stuff if this is undefined
            msg.channel.send(embedMaker("#27ae60", "Added song to queue:\n***" + song.title + "***", "cute little music bot", /*song.thumbnail,*/ song.url));
            if(!msg.guild.voiceConnection) msg.member.voiceChannel.join().then((connection) => {
                play(connection, msg);
            });
        }
    }else{
        async function playlistToQueue(urlsObj){
            var urls = urlsObj.data.playlist;
            var validSongCount = 0;
            for(var i = 0; i < urls.length; i++){
                server.queue.push({requesterID: msg.member.id, url: urls[i], title: "Random song!"});
            }
            msg.channel.send(embedMaker("#27ae60", "Added " + i + " songs to the queue!", "cute little music bot"));
            
            if(!msg.guild.voiceConnection) msg.member.voiceChannel.join().then((connection) => {
                play(connection, msg);
            });

        }

        var url = msg.content[1];
        ytlist(url, "url").then(res => {
            playlistToQueue(res);
        });
    }
}

function skip(msg) {
    var server = servers[msg.guild.id];
    if(server.currentlyPlaying){
        if(msg.member.id != server.currentlyPlaying.requesterID) return msg.channel.send('You do not have permission to skip this song!');
        if (!msg.member.voiceChannel) return msg.channel.send('You have to be in a voice channel to skip the music!');
        if (!server.queue.length) return msg.channel.send('There is no song that I could skip!');
        server.dispatcher.end();
    }
}

function stop(msg) {
    var server = servers[msg.guild.id];
    if(server){
        if(server.currentlyPlaying){
            if(msg.member.id != server.currentlyPlaying.requesterID) return msg.channel.send('You do not have permission to stop the music!');
            if (!msg.member.voiceChannel) return msg.channel.send('You have to be in a voice channel to stop the music!');
            server.queue.length = 0;
            server.dispatcher.end();
        }
    }
}

function nowPlaying(msg){
    var server = servers[msg.guild.id];
    if(server.currentlyPlaying){
        if (!msg.member.voiceChannel) return msg.channel.send('You have to be in a voice channel to stop the music!');
        msg.channel.send(embedMaker("#27ae60", "Now playing:\n***" + server.currentlyPlaying.title + "***", "cute little music bot"));
    }
}

async function printQueue(msg){
    var server = servers[msg.guild.id];
    var description = "";
    if(server){
        for(var i = 0; i < server.queue.length; i++){
            description += "\n" + (i+1) + ": ***" + server.queue[i].title + "***";
        }
        if(description.length == 0) { description = "\n*No queued songs.*"; }
        msg.channel.send(embedMaker("#27ae60", "Queued songs: " + description));
    }else{
        msg.channel.send(embedMaker("#27ae60", "Queued songs: \n*No queued songs.*"));
    }
}

async function randomplay(msg){

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

function say(msg){
    msg.content = msg.content.slice(4, msg.content.length);
    msg.channel.send(msg.content);
}

function command(msg){
    switch (msg.content){
        case 'copypasta pls':
            msg.channel.send(copypastaObject["content"]);
            loadNewPasta();
            break;
        case 'what\'s the time?':
            msg.channel.send(getTime());
            break;
    }

    switch (msg.content.split(" ")[0]){
        case 'say':
            say(msg);
            break;
    }

    if(msg.content.search(prefix) == 0){
        var originalMsg = msg.content;
        msg.content = msg.content.slice(1, msg.content.length);
        var msgSwitch = msg.content.split(" ")[0];
        switch (msgSwitch){
            case 'play':
                playMusic(msg);
                break;
            case 'skip':
                skip(msg);
                break;
            case 'queue':
                printQueue(msg);
                break;
            case 'np':
                nowPlaying(msg);
                break;
            case 'stop':
                stop(msg);
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