const fs = require("fs");
const ytdl = require('ytdl-core');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const {prefix} = require('./config.json');
const discord = require("discord.js");
const ytlist = require('youtube-playlist');
const rand = require('csprng');
const humanizeDuration = require('humanize-duration')

//the ytlist stuff doesn't return a full playlist, so use this instead for more than 100 items (it'll only be used by me though for now)
const youtubeDetailsGet = require('./youtubeApiInteractions');
const youtubeApiKey = require('./secret');

var servers = {}; //global variable to hold music queue
var copypastaObject; //global variable to hold retrieved copypastas

const serverRadio = {
    Stop: [], //used to stop the radio
    PlaylistItems: [], //used to hold the server radio playlist items
    CurrentItem: [], //used for holding the server radio current item
    BotConnections: [], //used to hold the server bot connections
    StartTime: [], //used for holding the start times
    Dispatchers: [] //used for stopping playback immediately
};

//initialising variables and stuff below
loadNewPasta(); //this initialises the object to contain a pasta as soon as the server starts
var beginningSentenceReactions = JSON.parse(fs.readFileSync("json/beginningSentenceReactions.json").toString());
var inSentenceReactions = JSON.parse(fs.readFileSync("json/inSentenceReactions.json").toString());
var randomSayJSON = JSON.parse(fs.readFileSync("json/randomSay.json").toString());

function probability(p){
    return (Math.random() <= p);
}

function randomSay(msg){
    var random = Math.random();
    var saySentence = "";
    var lastFreq = 0;
    for(var key in randomSayJSON){
        if(random < randomSayJSON[key]["freq"]){
            if(saySentence == ""){
                lastFreq = randomSayJSON[key]["freq"];
                saySentence = randomSayJSON[key]["resp"];
            }else if(randomSayJSON[key]["freq"] < lastFreq){
                lastFreq = randomSayJSON[key]["freq"];
                saySentence = randomSayJSON[key]["resp"];
            }
        }
    }
    if(saySentence != ""){
        msg.channel.send(saySentence);
    }
}

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
    if(image && image != '[NO_IMAGE]') embed.setImage(image);
    if(link) embed.setFooter(link);
    return embed;
}

async function playMusic(msg){
    msg.content = msg.content.split(" ");

    async function play(connection, msg){
        var server = servers[msg.guild.id];

        const songInfo = await ytdl.getInfo(server.queue[0].url);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            //thumbnail: songInfo.player_response.videoDetails.thumbnail["thumbnails"][3]["url"]
        };

        if(song.title){ //it can't get vid details and stuff if this is undefined
            msg.channel.send(embedMaker("#27ae60", "Now playing:\n***" + song.title + "***", "cute little music bot", '[NO_IMAGE]', song.url));

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
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            //thumbnail: songInfo.player_response.videoDetails.thumbnail["thumbnails"][3]["url"]
        };

        var pushItem = {
            requesterID: msg.member.id,
            url: msg.content[1],
            title: song.title
        };
        server.queue.push(pushItem);

        if(song.title){ //it can't get vid details and stuff if this is undefined
            msg.channel.send(embedMaker("#27ae60", "Added song to queue:\n***" + song.title + "***", "cute little music bot", '[NO_IMAGE]', song.url));
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

function spokenWord(msg){
    var reaction = beginningSentenceReactions[msg.content];
    if(reaction){ //handles cases where the thing just said matches a whole sentence
        if(reaction["regex"] == false){
            if(probability(reaction["freq"])){
                msg.channel.send(reaction["resp"]);
            }
        }
    }else{
        for(var key in beginningSentenceReactions){
            if(beginningSentenceReactions[key]["regex"]){
                if(msg.content.search(regexGen(key)) == 0){
                    if(probability(beginningSentenceReactions[key]["freq"])){
                        msg.channel.send(beginningSentenceReactions[key]["resp"]);
                    }
                }
            }
        }
    }

    for(var key in inSentenceReactions){ //handles cases where we want the bot to respond to whatever is in here no matter where in the sentence
        if(!inSentenceReactions[key]["regex"]){
            if(msg.content.search(key) != -1){
                if(probability(inSentenceReactions[key]["freq"])){
                    msg.channel.send(inSentenceReactions[key]["resp"]);
                }
            }
        }else{
            if(msg.content.search(regexGen(key)) != -1){
                if(probability(inSentenceReactions[key]["freq"])){
                    msg.channel.send(inSentenceReactions[key]["resp"]);
                }
            }
        }
    }
}

function radioStopRoutine(guildID){ //stops the radio, and resets respective variables
    serverRadio.Stop[guildID] = false; //sets a flag to naturally stop the radioLoop for this server
    if(serverRadio.Dispatchers[guildID]) serverRadio.Dispatchers[guildID].end(); //ends the currently playing track, if one is playing
    serverRadio.BotConnections[guildID].disconnect(); //disconnects the bot from the channel it's in
    serverRadio.PlaylistItems[guildID] = []; //clear the radio queue
    serverRadio.CurrentItem[guildID] = ""; //resets the current item
    serverRadio.StartTime[guildID] = 0; //resets the start time
    return serverRadio.Stop[guildID] = true; //stop the radio
}

async function playRadio(msg){
    const command = msg.content.split(" ")[1];
    const url = msg.content.split(" ")[2];

    if(command === 'stop') {
        radioStopRoutine(msg.guild.id); //stops the radio
    }

    if(command === 'np'){
        if(serverRadio.CurrentItem[msg.guild.id]){
            const song = serverRadio.CurrentItem[msg.guild.id];
            //replace '[NO_IMAGE]' with song.preview to get a song preview working
            msg.channel.send(embedMaker("#27ae60", "Currently playing:\n***" + song.title + "***", "cute little music bot", '[NO_IMAGE]', song.url));
            return;
        }else{
            msg.channel.send(embedMaker("#27ae60", "Nothing playing right now."));
            return;
        }
    }

    if(command === 'uptime'){
        if(serverRadio.StartTime[msg.guild.id]){
            msg.channel.send(embedMaker("#27ae60", `Current uptime: ${humanizeDuration(Date.now() - serverRadio.StartTime[msg.guild.id])}`));
            return;
        }else{
            msg.channel.send(embedMaker("#27ae60", "Nothing playing right now."));
            return;
        }
    }

    if(command != 'play'){
        msg.channel.send(embedMaker("#27ae60", "Invalid command."));
        return;
    }

    if(!msg.content[1]){
        msg.channel.send(embedMaker("#27ae60", "You need to provide a link."));
        return;
    }

    if(!msg.member.voiceChannel){
        msg.channel.send(embedMaker("#27ae60", "Join a voice channel first."));
        return;
    }

    if(serverRadio.PlaylistItems[msg.guild.id]){
        if(serverRadio.PlaylistItems[msg.guild.id].length != 0){
            msg.channel.send(embedMaker("#27ae60", `Stop the current radio playback first.`));
            return;
        }
    }

    msg.channel.send(embedMaker("#27ae60", "Queueing items..."));

    const server = servers[msg.guild.id];
    serverRadio.Stop[msg.guild.id] = false; //make sure the server radio stop flag is reset

    try {
        serverRadio.BotConnections[msg.guild.id] = await msg.member.voiceChannel.join(); //joins the voice channel, and saves the connection
    } catch(err) {
        console.log("(CHANNELJOIN) " + err);
        msg.channel.send(embedMaker("#27ae60", "An error occurred when joining the voice channel."));
        radioStopRoutine(msg.guild.id); //stop the radio properly
        return;
    }

    try {
        if(msg.author.id === '128088350287593472'){ //when it's just me (Fate) it'll use the youtubeApiKey, so more than 100 items can be added
            serverRadio.PlaylistItems[msg.guild.id] = (await youtubeDetailsGet(youtubeApiKey, url)).items; //saves the playlist
        }else{
            serverRadio.PlaylistItems[msg.guild.id] = (await ytlist(url, "url")).data.playlist; //saves the playlist
        }
    } catch(err) {
        console.log("(YTLISTGET) " + err);
        msg.channel.send(embedMaker("#27ae60", "An error occurred getting the playlist data."));
        radioStopRoutine(msg.guild.id); //stop the radio properly
        return;
    }

    serverRadio.StartTime[msg.guild.id] = Date.now();
    msg.channel.send(embedMaker("#27ae60", `Started the radio with ${serverRadio.PlaylistItems[msg.guild.id].length} items!`));
    radioLoop(msg.guild.id, -1);
}

async function radioLoop(guildID, previousIndex){
    if(serverRadio.Stop[guildID]) { //if the flag to stop the radio has been set, then just return
        return 0; //return from this, the radio is stopped
    }

    let currentIndex = rand(14, 10) % serverRadio.PlaylistItems[guildID].length;
    while(previousIndex === currentIndex){
        currentIndex = rand(14, 10) % serverRadio.PlaylistItems[guildID].length; //keep on randomly generating until you get one which isn't the previous index
    }

    let songInfo, song; //will hold the songInfo from ytdl.getInfo(...) and then title, url and preview image respectively
    let playableOrNot = true; //flag for the current track, if it's set to false, there's an issue

    try {
        songInfo = await ytdl.getInfo(serverRadio.PlaylistItems[guildID][currentIndex]);
        song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            preview: songInfo.videoDetails.thumbnail.thumbnails[3].url
        };
    } catch(err) {
        console.log("(YTDLGETINFO) " + err);
        playableOrNot = false;
    }

    serverRadio.CurrentItem[guildID] = song;

    if(playableOrNot){ //it can't get vid details and stuff if this is undefined
        try {
            serverRadio.Dispatchers[guildID] = serverRadio.BotConnections[guildID].playStream(ytdl(song.url, {quality: "highestaudio"})); //plays the music
        } catch(err) {
            console.log("(PLAYSTREAM/YTDL) " + err);
            playableOrNot = false; //error occurred, go to the next song
        }
    }

    if(playableOrNot = false){ //error occurred, just go to the next song then
        return radioLoop(guildID, currentIndex); //will play the next song
    }

    serverRadio.Dispatchers[guildID].on("end", () => {
        radioLoop(guildID, currentIndex); //will play the next song
    });

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
            case 'radio':
                playRadio(msg);
                break;
        }
    }
}

async function respond(msg){
	// if we match a spoken word, stop pipeline
	if (spokenWord(msg)) return;
	// then, try for commands
    if (command(msg)) return;
    // finally, probably nothing so just try some random shit
    randomSay(msg); return;
}

module.exports = respond;