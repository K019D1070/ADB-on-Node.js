import { Worker } from 'worker_threads';
import fs from 'fs/promises';
import path from 'path';
import ADB from "./ADB.mjs";
import Progress from "./Progress.mjs";

const adb = new ADB();
const pull = new Worker(`${path.dirname(new URL(import.meta.url).pathname)}/Puller.mjs`, {stdin:true, stdout:true, stderr: true});
const unComplete = [];
const prg = new Progress();

adb.setOnConnected(()=>{
  pull.postMessage({
    type:"data",
    message:adb.getOptions()
  });
  adb.adbSpawn([["shell", "ls", "-go", "/storage/emulated/0/Android/data/com.sauzask.nicoid/files/nicoid/nicoid_cache/"]], (chunk)=>{
    let strStdout = chunk.toString();
    //remoteFiles = [row1[row, byte, name], row2[row, byte, name], row3[row, byte, name]...]
    let remoteFiles = [...strStdout.matchAll(/(?:[dl-])(?:[rwxst-]{9})\s+(?:[0-9]+)\s+([0-9]+) (?:[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}) ([\w\s!#$%&'()\-=~^@`[{+;\],.]+)\n/g)];
    remoteFiles.forEach((remoteFile) => {
      if(remoteFile[2].match(/archive/)){
        unComplete.push(remoteFile[2]);
      }
      fs.access("/mnt/m/Material/nicoid_cache/"+remoteFile[2]).then(()=>{
        fs.stat("/mnt/m/Material/nicoid_cache/"+remoteFile[2]).then((stat)=>{
          /*
          if(remoteFile[1] > stat.size){
            console.log(remoteFile[2]);
            console.log(stat.size);
            console.log(remoteFile[1]);
          }
          /*
            console.log(remoteFile);
            console.log(stat.size);
          */
        });
      }).catch((err)=>{
        //普通にpull(ローカルにないファイル)
        pull.postMessage({
          type:"filename",
          message:remoteFile[2]
        });
        //新規ファイルをカウント
        //console.log(++nf);
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
        console.log("Transferring was completed.");
        pull.terminate();
        process.exit();
      }
      break;
    case "finish":
      process.stdout.write(message.message);
      prg.display();
      break;
  }
})