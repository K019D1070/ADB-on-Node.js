import config from 'config';
import fs from 'fs/promises';
import ADB from "./ADB.mjs";

const adb = new ADB();
adb.setOnConnected(()=>{
  let nf = 0;
  adb.adbSpawn([["shell", "ls", "-go", "/storage/emulated/0/Android/data/com.sauzask.nicoid/files/nicoid/nicoid_cache/"]], (chunk)=>{
    let strStdout = chunk.toString();
    //remoteFiles = [row1[row, byte, name], row2[row, byte, name], row3[row, byte, name]...]
    let remoteFiles = [...strStdout.matchAll(/(?:[dl-])(?:[rwxst-]{9})\s+(?:[0-9]+)\s+([0-9]+) (?:[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}) ([\w\s!#$%&'()\-=~^@`[{+;\],.]+)\n/g)];
    remoteFiles.forEach((remoteFile) => {
      fs.access("/mnt/m/Material/nicoid_cache/"+remoteFile[2]).then(()=>{
        fs.stat("/mnt/m/Material/nicoid_cache/"+remoteFile[2]).then((stat)=>{
          if(remoteFile[1] != stat.size){
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

        //新規ファイルをカウント
        //console.log(++nf);
      });
    });
  });
});