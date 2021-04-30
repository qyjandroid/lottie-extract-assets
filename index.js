#!/usr/bin/env node

const fs = require('fs');
const request = require('request');
const path = require('path');
const program = require('commander');
const inquirer = require('inquirer');
const cwd = process.cwd();

program.version('v' + require('./package.json').version, '-v, --version')
	.action(() => {
			inquirer.prompt([
				{
                    type:'input',
					name: 'configPath',
					message: '请输入LottieConfig文件目录：(src/lottieConfig.json)',
                    validate:val=>{
                        if (fs.existsSync(val)) {
                            return true;
                          }
                        return '文件不存在，请输入正确文件目录'
                    }
				},
                {
                    type:'input',
					name: 'outFileName',
					message: '请输入输出资源文件名称：(lottie-assets.js)',
				},
				{
                    type:'input',
					name: 'to',
					message: '请输入输出资源文件保存目录：(dist/lottie)'
				},
                {
                    type:'input',
					name: 'globalName',
					message: '请输入全局访问提取资源对象：(window._config)'
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
                const config=initPath(answers);
               const  imgArray= await readJsonFile(config);
               saveFile(imgArray,config.globalName,config.outFileName);

			}).catch((e)=>{
                console.log("错误信息：",e);
            })
		
	});
program.parse(process.argv);


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
      async function readJsonFile (config) {
          const {configPath,isAbsPath}=config;
        //获取配置
        let lottieConfig = await new Promise((resolve, reject) => {
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
        }).catch(()=>{
            console.warn("读取配置文件错误:"+ configPath);
        });
        if(!lottieConfig){
            return;
        }
        //根据配置获取资源链接(包含当前的lottie和lottie中图片)
        const imgLink = await getLink(lottieConfig,isAbsPath);
        return imgLink;
       
    }

    saveFile=(imgLink,globalName,outFileName)=>{
         // 采用js文件，方便我们前端代码集成使用。
         let content = globalName + " = " + JSON.stringify(imgLink, null, 4) + ";";
         console.log("内容",content);
 
         fs.writeFile(outFileName,content,'utf-8',function(err){
             if(err){
                 throw err;
                 return;
             }
             console.log("out over: ",outFileName);
         })
    }
  
