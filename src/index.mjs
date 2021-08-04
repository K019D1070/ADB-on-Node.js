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
  adbStatus = {
    checkInterval: null,
    host: null
  }
  inputInterface = null;
  constructor(){
    this.inputInterface = rl.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const connected = ()=>{
      clearInterval(this.adbStatus.checkInterval);
      this.inputInterface.close();
      console.log("Connected.");
    };
    this.connectCheck(connected, ()=>{
      this.adbStatus.checkInterval = setInterval(()=>{this.connectCheck(connected);},500);
      console.log("Attached devices were nothing.");
      console.log("Connect Android by USB cable.");
      console.log("Or setup wireless debuging. Setup wizard will start.");
      console.log("(You can connect android by USB cable during setup wizard.)");
      this.choice();
    });
  }
  choice(){
    this.inputInterface.question("Do you have already pairing?(normally n) y/n ", (c)=>{
      this.inputInterface.close();
      switch(c){
        case "y":
          this.connect();
          break;
        case "n":
          this.pairing();
          this.connect();
          break;
        default:
          this.choice();
          break;
      }
    });
  }
  connect(IPAddress = this.adbStatus.host, port){
    console.log("Enter to connect [port](It is different port to pairing)");
    /*
    let match = input.match(IP);
    case match != null && !this.adbStatus.connected:
      console.log(this.shellExecSync("./adb connect "+ input+ " 1>&1 2>&1").toString());
      break;
    case this.adbStatus.host != null && !this.adbStatus.paired:
      console.log(this.shellExecSync("./adb connect "+ this.adbStatus.host+ ":"+ input+ " 1>&1 2>&1").toString());
      break;
      */
  }
  pairing(){
    return new Promise((paired)=>{
      console.log("Enter [IP address]:[port] [pair code]");
      this.inputInterface = rl.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      this.inputInterface.prompt();
      this.inputInterface.on("line", (input)=>{
        console.log(input);
        switch(true){
          case input.match(IPP) != null:
            this.adbStatus.host = input.match(IPP)[1] || null;
            this.activeSubprocess.pair = this.shellSpawn(["./adb",["pair"].concat(input.split(" ")), this.options], (chunk)=>{
              let strStdout = chunk.toString();
              console.log("[adb]:" + chunk.toString());
              if(strStdout.match(/Successfully/)){
                paired();
                this.inputInterface.close();
              }else{
                this.adbStatus.host = null;
              }
            });
            break;
          case this.activeSubprocess.pair != null:
            this.activeSubprocess.pair.subProcess.stdin.write(input+"\n");
            break;
        }
      });
    });
  }
  /*
  ls(){
    const ls = cp.execSync("./adb " + this.args.join( " " ), this.options);
    const remoteFiles = ls.toString().split("\n");
  }*/
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
