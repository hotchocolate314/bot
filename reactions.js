var servers = {};
const ytdl = require('ytdl-core');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var jsonObj;
function loadDoc() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            jsonObj = JSON.parse(this.responseText);
       }
    };
    xhttp.open("GET", "https://erewhon.xyz/copypasta/api/random", true);
    xhttp.send();
}

loadDoc();

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

function spokenWord(msg) {
  switch (msg.content){
    case 'ping':
      msg.reply('FUCK OFF');
      break;
    case 'what\'s the time?':
      msg.reply(getTime())
      break;
    case 'mods?':
      msg.channel.send('ASLEEP AS FUCK');
      break;
    case 'sieg zeon':
      msg.channel.send('https://i.ytimg.com/vi/emzROzHwsSk/hqdefault.jpg');
      break;
    case 'sieg zion':
      msg.channel.send('https://i.redd.it/69xsc94129b01.png');
      break;
    case 'copypasta pls':
      loadDoc();
      msg.channel.send(jsonObj["content"]);
			break;
		case '<@!497882898519818250>':
			msg.reply('FUCK YOU');
			break;
		case 'strongly abuse':
			msg.reply('NO ABUSE');
			break;
		default: 
			console.log('default spoken word');
			return false;
  	}
	console.log('matched spoken word');
	return true;
}

const regexps = [
		{r: /nya/i, resp: ':3'},
		{r: /i can'?t believe/i, resp: 'believe it!'},
		{r: /flounders/i, resp: '>forcing memes'},
		{r: /wtflip/i, resp: 'watch your goddamn shitty fucking fucky language'},
		{r: /wtfrick/i, resp: 'watch your goddamn shitty fucking fucky language'},
];
function regexp(msg) {
	for (let regx of regexps) {
		const m = regx.r.exec(msg);
		if (m && m.length) {
			msg.channel.send(regx.resp);
			return !!regx.quit;
		}
	}
}

function command(msg) {
  const words = msg.content.split(" ");
  switch (words[0]){
    case 'say':
		case 'echo':
			msg.channel.send(words.splice(1).join(" "));
		break;
    case 'play':
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
       })
     }

		if(!msg.content[1]){
			msg.channel.send("You need to provide a link.")
			break;
		}

		if(!msg.member.voiceChannel){
			msg.channel.send("Join a voice channel first.")
			break;
		}

		if(!servers[msg.guild.id]) servers[msg.guild.id] = {
			queue: []
		}

		var server = servers[msg.guild.id];
		server.queue.push(msg.content[1]);

		if(!msg.guild.voiceConnection) msg.member.voiceChannel.join().then((connection) => {
				console.log('playing: ' + server.queue[0]);
				play(connection, msg);
		});
		break;
  }
}

async function respond(msg){
	// if we match a spoken word, stop pipeline
	if (spokenWord(msg)) return;
	// we may want to stop the pipeline for some regexps
	if (regexp(msg)) return;
	// finally, try for commands
	if (command(msg)) return;
}

module.exports = respond;
