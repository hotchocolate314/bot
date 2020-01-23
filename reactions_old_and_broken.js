var servers = {};



loadDoc();


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
