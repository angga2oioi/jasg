#!/usr/bin/env node

const lib = require("./../lib/jasg.js");
const fs = require("fs");
const msToHMS = ( ms ) =>{
    // 1- Convert to seconds:
    var seconds = ms / 1000;
    // 2- Extract hours:
    var hours = parseInt( seconds / 3600 ); // 3,600 seconds in 1 hour
    seconds = seconds % 3600; // seconds remaining after extracting hours
    // 3- Extract minutes:
    var minutes = parseInt( seconds / 60 ); // 60 seconds in 1 minute
    // 4- Keep only seconds not extracted to minutes:
    seconds = seconds % 60;
    return( hours +" Hours, "+minutes+" Minutes, "+seconds+" Seconds");
}

var argv =process.argv.slice(2);
var params={};

argv.forEach((v)=>{
	if(v=="-h"){
        params.h = true;
    }else{
        params.url = v;
    }
})
if(params.h===true){
	console.log("USAGE : ");
    console.log("\t jasg [url]");
    console.log(" ");
	console.log("Example : ");
	console.log("\t jasg https://google.com");
	return;
}
if(params.url && typeof params.url ==="string"){
    lib.start({url:params.url},(response)=>{
        console.log(response);
    })
    return;
}

console.log("please run jasg -h for info");