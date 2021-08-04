import config from 'config';
import * as cp from 'child_process';
import * as rl from 'readline';

process.stdin.setEncoding("utf8");
const adbPath = config.get("adbPath");
const defaultSource = config.get("defaultSource");

const IPP = /(\[*[0-z.:]+\]*):[0-9]{1,5} [0-9]{6}/; // IPwithPortandPair
const IP = /(\[*[0-z.:]+\]*):[0-9]{1,5}/; // IPwithPort
const P = /[0-9]{6}/; // Pair

class ADB{  
  args = [
    "shell",
    "ls",
    process.argv[2] || defaultSource
  ];
  options = {
    cwd:adbPath
  }
  activeSubprocess={
    pair:null
  }
  adbStatus={
    paired: false,
    connected: false,
    ready: false,
    checkInterval: null,
    host: null
  }
  constructor(){
    let IPPortPair = rl.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const connected = ()=>{
      this.adbStatus.paired = this.adbStatus.connected = this.adbStatus.ready = true;
      IPPortPair.close();
      clearInterval(this.adbStatus.checkInterval);
      console.log("Connected.");
    };
    this.connectCheck(connected, ()=>{
      this.adbStatus.checkInterval = setInterval(()=>{this.connectCheck(connected);},500);
      console.log("Attached devices were nothing.");
      console.log("Connect Android by USB cable.");
      console.log("Or if you want to use wireless debuging, enter to pair [IP address]:[port] [pair code(6 digit)]");
      console.log("(When you just connect, just enter [IP address]:[port])");
      IPPortPair.prompt();
      IPPortPair.on("line", (input)=>{
        let match = input.match(IP);
        switch(true){
          case input.match(IPP) != null:
            this.adbStatus.host = input.match(IPP)[1] || null;
            this.activeSubprocess.pair = this.shellSpawn(["./adb",["pair"].concat(input.split(" ")), this.options], (chunk)=>{
              let strStdout = chunk.toString();
              console.log("[adb]:" + chunk.toString());
              if(strStdout.match(/Successfully/)){
                console.log("Enter to connect [port](It is different port to pairing)");
              }else{
                this.adbStatus.host = null;
              }
            });
            break;
          ////////////////////////////////////////////
          //コード改変時注意
          case match  != null:
            this.adbStatus.host = match[1] || null;
          case this.adbStatus.host != null || match != null:
            console.log(this.shellExecSync("./adb connect "+ this.adbStatus.host+ ":"+ input+ " 1>&1 2>&1").toString());
            break;
          ////////////////////////////////////////////
          case this.activeSubprocess.pair != null:
            this.activeSubprocess.pair.subProcess.stdin.write(input+"\n");
            break;
        }
      });
    });
  }
  ls(){
    const ls = cp.execSync("./adb " + this.args.join( " " ), this.options);
    const remoteFiles = ls.toString().split("\n");
  }
  shellExecSync(cmd){
    try{
      var pinger = cp.execSync(cmd, this.options);
    }catch(err){
      var pinger = err;
    }finally{
      return pinger;
    }
  }
  shellSpawn([cmd, args, options], callback){
    let r = {
      subProcess: cp.spawn(cmd, args, options),
      log: []
    }
    r.subProcess.stdout.on("data", (chunk)=>{callback(chunk);r.log.push(chunk);})
    return r;
  }
  connectCheck(callback, error){
    if(this.pinger()){
      callback();
      return true;
    }
    if(error != null){
      error();
    }
    return false;
  }
  pinger(){
    var pinger = this.shellExecSync("./adb shell echo \"connection test\" 1>&1 2>&1");
    return pinger.toString().search(/failed/) == -1;
  }
}

const adb = new ADB();
