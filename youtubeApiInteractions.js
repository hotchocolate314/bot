const https = require('https');

module.exports = youtubeDetailsGet;

function processYoutubeRespObjToArray(object){
  let processedArray = [];
  for(let i = 0; i < object.length; i++){
    if(object[i]){
      if(object[i][1]["snippet"]["title"] != "Private video"){
        //processedArray.push({});
        //let j = processedArray.length-1; //this is the final index in the processed array, using this so we don't have holes in the response (which would be due to private videos)
        //processedArray[j].title = object[i][1]["snippet"]["title"];
        //processedArray[j].thumbnail = object[i][1]["snippet"]["thumbnails"]["standard"];
        //processedArray[j].playlistID = object[i][1]["snippet"]["playlistId"];
        //processedArray[j].position = object[i][1]["snippet"]["position"];
        //processedArray[j].vidID = object[i][1]["snippet"]["resourceId"]["videoId"];
        processedArray.push(`https://www.youtube.com/watch?v=${object[i][1]["snippet"]["resourceId"]["videoId"]}`);
      }
    }
  }
  return processedArray;
}
  
async function youtubeAPIDetailsGetPlaylist(apiKey, playlistID, pageTokenString){ //recursively goes through the YouTube APIs paginated data
  return await new Promise((res, rej) => {
    if(pageTokenString==undefined) pageTokenString = "";
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistID}&maxResults=50&key=${apiKey}${pageTokenString}`;
    https.get(url, (resp) => {
      let data = '';
  
      resp.on('data', (chunk) => {
        data += chunk;
      });
    
      resp.on('end', () => {
        data = JSON.parse(data);
        
        let vids;
        try{
          vids = Object.entries(data["items"]);
        }catch{
          console.log(data);
        }
  
        let nextPageToken = (data["nextPageToken"]) ? `&pageToken=${data["nextPageToken"]}` : undefined;
        res({ //resolves as an object with the video as items, and the token for the next page
          items: processYoutubeRespObjToArray(vids), //returns an array of the videos in this playlist
          nextPageToken
        });
      });
    });
  }).then((resp) => {
    if(resp["nextPageToken"]){ //then if the nextPageToken isn't undefined (so evaluates to true)
      return youtubeAPIDetailsGetPlaylist(apiKey, playlistID, resp["nextPageToken"]).then((httpResp) => { //this function is called again, but for the next page, and eventually this data is returned
        return resp["items"].concat(httpResp); //and that response is concatenated to the response for this stage and returned
      });
    }else{
      return resp["items"]; //otherwise just the data acquired in this stage is returned - there is no next page
    }
  });
}

function extractRelaventInformation(url){ //this does some string processing to get the relavent parts of the url (the playlist ID or the video ID), otherwise returns an error message
  if(url.search("youtube.com") == -1){
      return {
          type: false,
          items: "Invalid URL."
      };
  }
  if(url.search("radio") != -1){
      return {
          type: false,
          items: "Radios can't be downloaded."
      };
  }

  let possibleIDs = url.split("?")[1].split("&");
  
  let vidID;
  let listID;
  for(let i = 0; i < possibleIDs.length; i++){
      if(possibleIDs[i].search("list=") != -1){
          listID = possibleIDs[i].replace("list=","");
      }else if(possibleIDs[i].search("v=") != -1){
          vidID = possibleIDs[i].replace("v=","");
      }
  }
  if(listID){
      return {
          type: "playlist",
          id: listID
      };
  }else if(vidID){
      return {
          type: "video",
          id: vidID
      };
  }else{
      return {
          type: false,
          items: "Invalid URL."
      };
  }
}

async function youtubeDetailsGet(apiKey, url){ //this function is interacted with directly - it takes in the apiKey and url, and if the url is valid, returns a video/list of videos
  let extractedInfo = extractRelaventInformation(url);
  if(extractedInfo["type"]){
    if(extractedInfo["type"]=="playlist"){
      return await youtubeAPIDetailsGetPlaylist(apiKey, extractedInfo["id"]).then((res) => { return { type: "playlist", items: res, id: extractedInfo["id"]}; });
    }else{
      //return await youtubeAPIDetailsGetVideo(apiKey, extractedInfo["id"]).then((res) => { return { type: "video", items: res, id: extractedInfo["id"] }; });
      throw "Radio does not play singular videoos, just playlists.";
    }
  }else{
    //return extractedInfo; //if no video(s) was/were returned, just this object is returned (it contains some error information)
    throw `${extractedInfo}`; //will have some error information
  }
}