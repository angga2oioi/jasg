#!/usr/bin/env node

const lib = require("./../lib/jasg.js");
const fs = require("fs");

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