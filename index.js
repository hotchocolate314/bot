const {prefix, token} = require('./config.json')
const respond = require('./reactions.js')
const Discord = require('discord.js')
const ytdl = require('ytdl-core')
const client = new Discord.Client()

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', async msg => {
  if(msg.author.bot) return;
  if(msg.content.search(prefix) == 0){
    msg.content = msg.content.slice(1,msg.content.length)
    respond(msg)
  }
})

client.login(token);
