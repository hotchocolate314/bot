var servers = {};
const ytdl = require('ytdl-core');

async function getTime(){
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    if(hours < 10) { hours = "0" + hours; }
    if(minutes < 10) { minutes = "0" + minutes; }
    if(seconds < 10) { seconds = "0" + seconds; }
    return ("The time is: " + hours + ":" + minutes + ":" + seconds);
}

async function respond(msg){
  msg.content = msg.content.split(" ");
  switch (msg.content[0]){
    case 'ping':
      msg.reply('FUCK OFF');
      break;
    case 'what\'s the time?':
      msg.reply(getTime())
      break;
    case 'say':
      msg.reply(msg.content[1])
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
        queue : []
      }

      var server = servers[msg.guild.id];

      server.queue.push(msg.content[1]);

      if(!msg.guild.voiceConnection) msg.member.voiceChannel.join().then((connection) => {
        console.log('playing: ' + server.queue[0]);
        play(connection, msg);
      })
  }
}

module.exports = respond;
