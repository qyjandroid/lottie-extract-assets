#!/usr/bin/env node

const fs = require('fs');
const request = require('request');
const path = require('path');
const program = require('commander');
const inquirer = require('inquirer');
const cwd = process.cwd();

//默认读取的配置文件
const defaultConfigJsonName="lottie-extract-assets.json";
const defaultConfigJson =path.join(cwd,defaultConfigJsonName);
console.log("读取配置文件：",defaultConfigJson);
//支持同时编译多个项目lottie资源提取
readJsonFile(defaultConfigJson).then((result)=>{
    if(result){
        startAssetsExtract(result);
    }else{
        console.log(defaultConfigJsonName+"文件不存在,请按照以下提示操作")
        program.version('v' + require('./package.json').version, '-v, --version')
            .action(() => {
                    inquirer.prompt([
                        {
                            type:'input',
                            name: 'configPath',
                            message: '请输入LottieConfig文件path：(例如：src/lottieConfig.json)',
                            validate:val=>{
                                if (fs.existsSync(val)) {
                                    return true;
                                }
                                return '文件不存在，请输入正确文件path'
                            }
                        },
                        {
                            type:'input',
                            name: 'outFileName',
                            message: '请输入输出资源文件名称：(例如：lottie-assets.js)',
                        },
                        {
                            type:'input',
                            name: 'to',
                            message: '请输入输出资源文件保存目录：(例如：dist)'
                        },
                        {
                            type:'input',
                            name: 'globalName',
                            message: '请输入全局访问提取资源对象：(例如：window._config)'
                        },
                        {
                            type:'rawlist',
                            message:'图片资源是否生成绝对路径',
                            name:'absPath',
                            choices:[
                                {
                                    key:"yes",
                                    name:"是",
                                    value:1,
                                    checked: true // 默认选中
                                },
                                {
                                    key:"no",
                                    name:"否",
                                    value:2,
                                }
                            ]
                        }
                        
                        
                    ]).then(async(answers)  =>  {
                        extractAssets(answers,()=>{});
                    }).catch((e)=>{
                        console.log("错误信息：",e);
                    })
                
            });
        program.parse(process.argv);
    }
});


function startAssetsExtract(configJson){
    let count=0;
    configJson.map((item,key)=>{
        extractAssets(item,()=>{
            count++;
            if(count===configJson.length){
                console.log("all over out")
            }
        });
    })
}


function extractAssets(answers,callback) {
    const config=initPath(answers);
    readJsonFile(config.configPath).then(async (lottieConfig) =>{
        if(lottieConfig){
            //根据配置获取资源链接(包含当前的lottie和lottie中图片)
            const imgArray = await getLink(lottieConfig,config.isAbsPath);
            saveFile(imgArray,config.globalName,config.outFileName,callback);
        }
    });
}




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

  function initPath(config){
        console.log("读取的命令行配置：",config);
        //1:获取 lottie配置文件路径
        const curLottieConfig =path.join(cwd,config.configPath);
        //生成资源文件的全局名称
        const globalName =config.globalName ? config.globalName : "window._config";
        const to = config.to ? config.to : "dist";
        //2:获取输出文件名称
        const outFileName = config.outFileName ? config.outFileName : "lottie-assets.js";
        const outFile = path.join(to,outFileName);
        if (!fs.existsSync(to)) {
            mkDirsSync(to);
        }
        return {
            configPath:curLottieConfig,
            globalName:globalName,
            outFileName:outFile,
            isAbsPath:config.absPath ===1
        };
 }

     /**
     * 
     * 
     * 请求lottie json文件
     * @memberOf LottieExtractAssetsPlugin
     */
   function requestLottie(url,isAbsPath){
       return new Promise((resolve,reject)=>{
          request(url,  (error, response, body)=> {
              if (!error && response.statusCode == 200) {
                try{
                  const lottieData=JSON.parse(body);
                  const result= lottieParse(lottieData,url,isAbsPath);
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
     function lottieParse(data,url,isAbsPath){
      let urlArray=[];
      try{
          const assets=data.assets;
          const lottieInfo=getLottieInfo(url);
          for(let i=0;i<assets.length;i++){
              const item=assets[i];
              if(item.p && item.u){
                  const imgUrl=isAbsPath?`${lottieInfo.url}/${item.u}${item.p}`:`${lottieInfo.name}/${item.u}${item.p}`;
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
     function getLottieInfo(url){
      const lastIndex=  url.lastIndexOf("/");
      const name=url.substring(lastIndex+1,url.length);
      const curUrlPre=url.substring(0,lastIndex);
      const nameLastIndex=  curUrlPre.lastIndexOf("/");
      return {url:curUrlPre,name:curUrlPre.substring(nameLastIndex+1,nameLastIndex.length),jsonName:name}
    }

     /**
     * 
     * 
     * 获取lottie json 文件
     * @memberOf LottieExtractAssetsPlugin
     */
      function getLottieJsonInfo(url,isAbsPath){
        const info= getLottieInfo(url);
        return {
            key:info.name,
            url:isAbsPath?url:`${info.name}/${info.jsonName}`,
            source:url
         }
    }

     /**
     * 
     * 
     * 获取lottie 资源地址。
     * @memberOf LottieExtractAssetsPlugin
     */
    async function getLink (lottieConfig,isAbsPath){
        let imgArray=[];
        if(lottieConfig){
            for(let i=0;i<lottieConfig.length;i++){
                let curLottieMap={};
                const url=lottieConfig[i];
                //添加lottie json
                const info=getLottieJsonInfo(url,isAbsPath);
                curLottieMap=info;
                //请求lottie json文件，获取图片资源
                const result= await requestLottie(lottieConfig[i],isAbsPath);
                curLottieMap.imgs=result;
                imgArray.push(curLottieMap);
            }
        }
      return imgArray;
    }


     /**
     * 
     * 
     * 读取配置文件,生成js文件。
     * @memberOf LottieExtractAssetsPlugin
     */
    function readJsonFile (configPath) {
        //获取配置
        return  new Promise((resolve, reject) => {
            try {
                //读取配置文件
                fs.readFile(configPath, (err, data) => {
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
        }).catch((e)=>{
            console.warn("读取配置文件错误:"+ configPath);
        });
       
    }




    function saveFile(imgLink,globalName,outFileName,callback){
         // 采用js文件，方便我们前端代码集成使用。
         let content = globalName + " = " + JSON.stringify(imgLink, null, 4) + ";";
         fs.writeFile(outFileName,content,'utf-8',function(err){
             if(err){
                 throw err;
                 return;
             }
             console.log("out over: ",outFileName);
             if(callback){
                callback(outFileName);
             }
         })
    }
  
