import config from 'config';
import ADB from "./ADB.mjs";


const adbPath = config.get("adbPath");
const adb = new ADB();
adb.setOnConnected(()=>{
  adb.shellSpawn(["./adb", ["shell", "ls", "/storage/emulated/0/Android/data/com.sauzask.nicoid/files/nicoid/nicoid_cache/"]], (chunk)=>{
    let strStdout = chunk.toString();
    console.log(strStdout.split("\n").length);
  });
});