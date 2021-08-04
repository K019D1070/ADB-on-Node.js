import ADB from "./ADB.mjs";

args = [
  "shell",
  "ls",
  defaultSource
];
const adb = new ADB();
adb.setConnected(()=>{
  //adb.shellSpawn();
});
/*
ls(){
  const ls = cp.execSync("./adb " + this.args.join( " " ), this.options);
  const remoteFiles = ls.toString().split("\n");
}*/
