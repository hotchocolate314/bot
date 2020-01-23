var servers = {};



loadDoc();

/*i think the code is merged correctly

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
			return false;
  	}
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
>>>>>>> 40d28eb371c1faac16f93544a068861ad2e295c7
}

*/

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
		default: return false;
  }
	return true;
}

const regexps = [
		{r: /nya/i, resp: ':3'},
		{r: /i can'?t believe/i, resp: 'believe it!'},
		{r: /flounders/i, resp: '>forcing memes'}
];
function regexp(msg) {
	for (let regx of regexps) {
			if (regx.r.exec(msg).length > 0) {
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
      msg.reply(message.slice(msg.content[0].length+1, message.length));
      break;
    case 'play':
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
