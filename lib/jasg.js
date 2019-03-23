
const restler = require("restler");
const cheerio = require("cheerio");
const path = require("path");
const js2xmlparser = require('js2xmlparser');
const fs = require("fs");
const cluster = require("cluster");
const numCPU = require("os").cpus().length;

let dom; 
let urls = [];
let activeWorker=[];
let crawled = [];
let skipped =[];
let finishedWorker=0;
let workers=[];
let crawlableExt=["",".html",".htm",".asp",".php"];
let json={
        "@": {
            "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"
        },
		url: [],
}
const jasg =()=>{
    const start = (options,callback)=>{
        let url = options.url;
        dom = parseURL(url);
        if(!dom){
            callback(url,"is not valid");
            return;
        }
        url +=url[url.length -1] !="/" ? "/" : "";
        crawlableExt.push(path.extname(url));
        urls.push(url.split("?")[0].split("#")[0]);
        
        if(cluster.isMaster){
            cluster.on('exit', function(worker, code, signal) {
                finishedWorker++;
                if(finishedWorker>=numCPU){
                    parseToXML(crawled,(response)=>{
                        process.stdout.clearLine();  // clear current text
                        process.stdout.cursorTo(0);  
                        if(!response){
                            callback("fail to parse to xml")
                            return
                        }
                        saveToFile(response,(response)=>{
                            callback(response);
                        })
                    })
                }
            });
            for(var i =0;i <numCPU;i++){
                let worker = cluster.fork();
                worker.on("message",(results)=>{
                    if(results.error){
                        skipped.push(results.url);
                    }else{
                        if(crawled.indexOf(results.url)<0){
                            crawled.push(results.url);
                        }
                        urls.push(...results.urls);
                    }
                    activeWorker.splice(activeWorker.indexOf(worker.process.pid),1);
                    sendMessage(worker);
                   
                });
                workers.push(worker);
                sendMessage(worker);
            }
        }else{
            setupWorker();
        }
        
    }
    const getTarget=(cb)=>{
        if(urls.length <1){
            cb(false);
            return;
        }
        let tgt = urls.shift();
        let isOK = true;
        process.stdout.write("crawling, "+ urls.length +" left \r");
        
        if(crawled.indexOf(tgt)>=0){
            isOK = false
        }
        if(skipped.indexOf(tgt)>=0){
            isOK= false;
        }
        if(!tgt || typeof tgt !="string" || crawlableExt.indexOf(path.extname(tgt).toLowerCase())<0){
            skipped.push(tgt);
            isOK = false;
        }
        if(!isOK){
            setTimeout(()=>{
                getTarget(cb);
            },1)
            return;
        }
        cb(tgt);
    }
    const sendMessage=(worker)=>{
        getTarget((tgt)=>{
            if(!tgt){
                //if the other worker is busy
                if(activeWorker.length >0 || urls.length >0){
                    setTimeout(()=>{
                        sendMessage(worker)
                    },1)
                    return;
                }
                finishedWorker++;
                if(finishedWorker>=numCPU){
                    finishedWorker=0;
                    workers.forEach((v)=>{
                        v.process.kill();
                    });
                }
                return;
            }
            activeWorker.push(worker.process.pid);
            worker.send(tgt);
        });
    }
    const setupWorker = ()=>{
        process.on("message",(url)=>{
            fetch(url,(response)=>{
                process.send(response);
            })
        })
    }
    const saveToFile=(data,cb)=>{
        fs.writeFile('./sitemap.xml', data, function (err) {
            if (err){
                cb(err);
                return;
            }
            cb("Saved to sitemap.xml");
        });
    }
    const parseToXML=(arr,cb)=>{
        if(!arr || arr.length <1){
            cb(false);
            return;
        }
        arr.forEach((v)=>{
            json.url.push({loc:v});
        })
        let xml = js2xmlparser.parse("urlset",json);
        cb(xml);
    }
    const fetch= (url,callback)=>{
        restler.get(url).on("complete",(response,data)=>{
            if(response instanceof Error){
                callback({error:1,url:url,message:JSON.stringify(data)});
                return;
            }
            if(!response){
                callback({error:1,url:url,message:"no response"});
                return;
            }
            if(!data || data.statusCode!==200){
                callback({error:1,url:url,message:"status code not 200"});
                return;
            }
            if(!data.headers || !data.headers["content-type"]){
                callback({error:1,url:url,message:" content-tyle header not exists"});
                return;
            }
            if(data.headers && data.headers["content-type"] && data.headers["content-type"].indexOf("text/html")<0){
                callback({error:1,url:url,message:"not html"});
                return;
            }
            let $ = cheerio.load(response);
            let temp = [];
            $("a[href]").each((i,obj)=>{
                let href = $(obj).attr("href");
                if(href.substring(0,2)==="//"){
                    href = dom.protocol + href;
                }
                let test = parseURL(href);

                if(test.host ===dom.host){
                    test.href = test.href.split("?")[0].split("#")[0];
                    temp.push(test.href);
                }
            });
            callback({error:0,url:url,urls:temp,message:"Success"});
        })
    }
    const parseURL=(url)=>{
        
        let test;
        try{
            test = new URL(url);
            return test;
        }catch(e){
            if(dom){
                test = parseURL(dom.protocol + "/" +dom.host+url);
                if(!test){
                    return false;
                }
                return test;
            }
            return false;
        }
        return false;
    }
    return{
        start:start,
    }
}
module.exports = jasg();