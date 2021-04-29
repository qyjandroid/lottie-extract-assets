const fs = require('fs');
const request = require('request');
const path = require('path');

function mkDirsSync(dirname) {
    if (fs.existsSync(dirname)) {
      return true;
    } else {
      if (mkDirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
      }
    }
  }

function initConfig(){
    const argv=process.argv;
    let curConfig={};
    for (let i=0;i<argv.length;i++){
        const item=argv[i];
        const array=`${item}`.split("=");
        if(array.length===2){
            curConfig[array[0]]=array[1];
        }
    }
    return curConfig;
}

const config=initConfig() || {};
const cwd = process.cwd();

/**
 * 
 * lottie资源提取插件
 * @class LottieExtractAssetsPlugin
 */
class LottieExtractAssets {

    start() {
        this.initPath();
        this.readJsonFile(this.configPath);
    }

    initPath=()=>{
        console.log("读取的命令行配置：",config);
        //1:获取 lottie配置文件路径
        const configPath= config.configPath? config.configPath : "./lottieConfig.json";
        this.configPath =path.join(cwd,configPath);
        //生成资源文件的全局名称
        this.globalName =config.globalName ? config.globalName : "window._config";
        this.to = config.to ? config.to : "dist";
        //2:获取输出文件名称
        const outFileName = config.outFileName ? config.outFileName : "lottie-assets.js";
        this.outFileName = path.join(this.to,outFileName);
        if (!fs.existsSync(this.to)) {
            console.log("创建目录=",this.to);
            mkDirsSync(this.to);
        }
    }
    
    /**
     * 
     * 
     * 获取lottie 资源地址。
     * @memberOf LottieExtractAssetsPlugin
     */
    getLink= async(lottieConfig)=>{
        let imgArray=[];
        if(lottieConfig){
            for(let i=0;i<lottieConfig.length;i++){
                let curLottieMap={};
                const url=lottieConfig[i];
                //添加lottie json
                const info=this.getLottieJsonInfo(url);
                curLottieMap=info;
                //请求lottie json文件，获取图片资源
                const result=  await this.requestLottie(lottieConfig[i]);
                curLottieMap.imgs=result;
                imgArray.push(curLottieMap);
            }
        }
      return imgArray;
    }
    /**
     * 
     * 
     * 获取lottie json 文件
     * @memberOf LottieExtractAssetsPlugin
     */
    getLottieJsonInfo=(url)=>{
        const info=this.getLottieInfo(url);
        return {
            key:info.name,
            url:url,
         }
    }
    
    /**
     * 
     * 
     * 读取配置文件,生成js文件。
     * @memberOf LottieExtractAssetsPlugin
     */
    readJsonFile= async(assetPath)=>{
        //获取配置
        let lottieConfig = await new Promise((resolve, reject) => {
            try {
                //读取配置文件
                fs.readFile(assetPath, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        let curData = data.toString();
                        const config = JSON.parse(curData);
                        resolve(config);
                    }
                });
            } catch (e) {
                reject(e);
            }
        }).catch(()=>{
            console.warn("读取配置文件错误:"+assetPath);
        });
        if(!lottieConfig){
            return;
        }
        //根据配置获取资源链接(包含当前的lottie和lottie中图片)
        const imgLink = await this.getLink(lottieConfig);
        // 采用js文件，方便我们前端代码集成使用。
        let content = this.globalName + " = " + JSON.stringify(imgLink, null, 4) + ";";
        console.log("内容",content);

        fs.writeFile(this.outFileName,content,'utf-8',function(err){
            if(err){
                throw err;
                return;
            }
            console.log("写入成功");
        })
    }
    /**
     * 
     * 
     * 请求lottie json文件
     * @memberOf LottieExtractAssetsPlugin
     */
    requestLottie=  (url)=>{
       return new Promise((resolve,reject)=>{
          request(url,  (error, response, body)=> {
              if (!error && response.statusCode == 200) {
                try{
                  const lottieData=JSON.parse(body);
                  const result= this.lottieParse(lottieData,url);
                  resolve(result);
                }catch(e){
                    console.log(e);
                }
              }else{
                  reject(url+"==失败");
              }
            })
        })
      
    }

    /**
     * 
     * 解析lottie
     * @memberOf LottieExtractAssetsPlugin
     */
    lottieParse=(data,url)=>{
      let urlArray=[];
      try{
          const assets=data.assets;
          const lottieInfo=this.getLottieInfo(url);
          for(let i=0;i<assets.length;i++){
              const item=assets[i];
              if(item.p && item.u){
                  const imgUrl=`${lottieInfo.url}/${item.u}${item.p}`;
                  urlArray.push({
                      key:`${lottieInfo.name}_${item.p}`,
                      url:imgUrl,
                      source:url,
                      lottieName:lottieInfo.name
                  });
              }
          }
        }catch(e){
            console.log(e);
        }
        return urlArray;
    }
    /**
     * 
     * 根据url获取lottie信息，方便生成配置文件。
     * @memberOf LottieExtractAssetsPlugin
     */
    getLottieInfo=(url)=>{
      const lastIndex=  url.lastIndexOf("/");
      const curUrlPre=url.substring(0,lastIndex);
      const nameLastIndex=  curUrlPre.lastIndexOf("/");
      return {url:curUrlPre,name:curUrlPre.substring(nameLastIndex+1,nameLastIndex.length)}
    }
   
}
  
const lottieAssets=new LottieExtractAssets()
lottieAssets.start();