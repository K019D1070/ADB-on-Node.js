import config from 'config';
import ADB from "./ADB.mjs";


const defaultSource = config.get("defaultSource");
const args = [
  "shell",
  "ls",
  defaultSource
];
const adb = new ADB();
adb.setOnConnected(()=>{
  //adb.shellSpawn();
});
/*
ls(){
  const ls = cp.execSync("./adb " + this.args.join( " " ), this.options);
  const remoteFiles = ls.toString().split("\n");
}*/
