
const restler = require("restler");
const cheerio = require("cheerio");
const path = require("path");
const js2xmlparser = require('js2xmlparser');
const fs = require("fs");

let dom; 
let urls = [];
let crawled = [];
let skipped =[];
let crawlableExt=["",".html",".htm",".asp",".php"];
let json={
        "@": {
            "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"
        },
		url: [],
}
const jasg =()=>{
    const start = (url,crawlable,callback)=>{
        if(typeof crawlable ==="function"){
            callback = crawlable;
        }
        dom = parseURL(url);
        if(!dom){
            callback(url,"is not valid");
            return;
        }
        url +=url[url.length -1] !="/" ? "/" : "";
        crawlableExt.push(path.extname(url));
        urls.push(url.split("?")[0].split("#")[0]);
        crawl((response)=>{
            parseToXML(response,(response)=>{
                saveToFile(response,(response)=>{
                    callback(response);
                })
            });
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
    const crawl=(callback)=>{
        if(!urls || urls.length <1){
            console.log("\n");
            let unique = [...new Set(crawled)];
            callback(unique);
            return;
        }
        let sel = urls.shift();
        console.log(urls.length+" left =>" + sel);
        if(crawled.indexOf(sel)>=0){
            setTimeout(()=>{
                crawl(callback)
            },1)
            return;
        }
        if(skipped.indexOf(sel)>=0){
            setTimeout(()=>{
                crawl(callback)
            },1)
            return;
        }
        if(crawlableExt.indexOf(path.extname(sel).toLowerCase())<0){
            setTimeout(()=>{
                crawl(callback)
            },1)
            return;
        }
        fetch(sel,(response)=>{
            setTimeout(()=>{
                crawl(callback)
            },1)
        })
    }
    const fetch= (url,callback)=>{
        restler.get(url).on("complete",(response,data)=>{
            if(data instanceof Error){
                callback(JSON.stringify(data));
                return;
            }
            if(!response){
                callback("empty response");
                return;
            }
            if(data && data.statusCode!==200){
                callback("response : " + response.statusCode);
                return;
            }
            if(!data.headers || !data.headers["content-type"]){
                callback("no response header content type ?")
                return;
            }
            if(data.headers && data.headers["content-type"] && data.headers["content-type"].indexOf("text/html")<0){
                skipped.push(url);
                callback("not html, skipped");
                return;
            }
            let $ = cheerio.load(response);
            $("[href]").each((i,obj)=>{
                let href = $(obj).attr("href");
                let test = parseURL(href);
                if(test.host ===dom.host){
                    if(crawled.indexOf(test.href)<0){
                        urls.push(test.href.split("?")[0].split("#")[0]);
                    }
                }
            })
            crawled.push(url);
            
            callback("included");
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