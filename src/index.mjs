import { Worker } from 'worker_threads';
import fs from 'fs/promises';
import Path from 'path';
import ADB from "./ADB.mjs";
import Progress from "./Progress.mjs";
import config from 'config';

const adb = new ADB();
const pull = new Worker(`${Path.dirname(new URL(import.meta.url).pathname)}/Puller.mjs`, {stdin:true, stdout:true, stderr: true});
const inComplete = [];
const prg = new Progress();
const path = config.get("path");

let deadMan = Date.now();
let spawn = null;
adb.setOnConnected(()=>{
  pull.postMessage({
    type:"data",
    message:adb.getOptions()
  });
  deadMan = Date.now();
  spawn = adb.adbSpawn([["shell", "ls", "-go", path.from]], (chunk)=>{
    let strStdout = chunk.toString();
    //remoteFiles = [row1[row, byte, name], row2[row, byte, name], row3[row, byte, name]...]
    let remoteFiles = [...strStdout.matchAll(/(?:[dl-])(?:[rwxst-]{9})\s+(?:[0-9]+)\s+([0-9]+) (?:[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}) ([\w\s!#$%&'()\-=~^@`[{+;\],.]+)\n/g)];
    remoteFiles.forEach((remoteFile) => {
      deadMan = Date.now();
      if(remoteFile[2].match(/archive/)){
        inComplete.push(remoteFile[2]);
      }
      fs.access(path.to+remoteFile[2]).then(()=>{
        fs.stat(path.to+remoteFile[2]).then((stat)=>{
          if(Number(remoteFile[1]) > Number(stat.size)){
            pull.postMessage({
              type:"filename",
              message:remoteFile[2]
            });
          }else{
            pull.postMessage({
              type:"query"
            });
          }
        });
      }).catch((err)=>{
        //普通にpull(ローカルにないファイル)
        pull.postMessage({
          type:"filename",
          message:remoteFile[2]
        });
      });
    });
  });
});
process.on('SIGINT', function() {
  pull.terminate();
  console.log("\n\n\n\n");
  process.exit();
});
pull.on("message",(message)=>{
  switch(message.type){
    case "status":
      prg.generate(message);
      prg.display();
      if(message.message.length == 0){
        prg.reset();
        if(inComplete.length > 0){
          console.log("Imcomplete files");
          console.log(`/r${inComplete.join("  ")}`);
        }
        console.log("Transferring was completed.");
        pull.terminate();
        process.exit();
      }
      break;
    case "finish":
      process.stdout.write(message.message);
      prg.display();
      break;
    case "response":
      if(spawn.exitCode != null && message.message == 0){
        if(deadMan < Date.now() - 1000){
          console.log("There is no job.");
          process.exit();
        }else{
          setInterval(()=>{
            pull.postMessage({
              type:"query"
            });
          }, 1000)
        }
      }
      break;
  }
})