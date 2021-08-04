import config from 'config';
import * as cp from 'child_process';
import * as rl from 'readline';

process.stdin.setEncoding("utf8");
const adbPath = config.get("adbPath");
const defaultSource = config.get("defaultSource");
const defaultIP = config.get("IPAddress");

const IP = /(\[*[0-z.:]+\]*):([0-9]{1,6})/; // IPwithPort
export default class ADB{  
  options = {
    cwd:adbPath
  }
  activeSubprocess={
    pair:null
  }
  adbStatus = {
    host: defaultIP,
    port: null
  }
  inputInterface = null;
  checkInterval = null;
  onConnected = null;
  constructor(){
    this.inputInterface = rl.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const connected = ()=>{
      clearInterval(this.checkInterval);
      this.inputInterface.pause();
      console.log("Connected.");
    };
    this.connectCheck().then(connected, ()=>{
      this.checkInterval = setInterval(()=>{
        this.connectCheck().then(connected, ()=>{});
      },500);
      console.log("Attached devices were nothing.");
      console.log("Connect Android by USB cable.");
      console.log("Or setup wireless debuging. Setup wizard will start.");
      console.log("(You can connect android by USB cable during setup wizard.)");
      this.choice();
    });
  }
  choice(){
    this.inputInterface.question("Do you have already pairing?(normally n) y/n ", (c)=>{
      this.inputInterface.pause();
      switch(c){
        case "y":
          if(defaultIP != null){
            this.inputInterface.question("[port]", (input)=>{
              let connectRes = this.connect(defaultIP, input).toString();
              console.log("[adb]:"+ connectRes);
              if(connectRes.match(/failed/) != null){
                console.log("Connection failed. Retry.");
                this.choice();
              }
            });
          }else{  
            this.inputInterface.question("Enter [IP adress]:[port]", (input)=>{
              let match = input.match(IP);
              let connectRes = this.connect(match[1], match[2]);
              console.log("[adb]:"+ connectRes);
              if(connectRes.match(/failed/) != null){
                console.log("Connection failed. Retry.");
                this.choice();
              }
            });
          }
          break;
        case "n":
          this.pairing().then(()=>{
            return new Promise(()=>{
              this.inputInterface.question("Enter to connect [port](It is different port to pairing)\n> ", (input)=>{
                this.connect(this.adbStatus.host, input);
              });
            });
          });
          break;
        default:
          this.choice();
          break;
      }
    });
  }
  connect(IPAddress = this.adbStatus.host, port = this.adbStatus.port){
    return this.shellExecSync("./adb connect "+ IPAddress+ ":"+ port+ " 1>&1 2>&1").toString();
  }
  pairing(){
    return new Promise((paired)=>{
      console.log("Enter [IP address]:[port] [pair code]");
      this.inputInterface.prompt();
      this.inputInterface.on("line", (input)=>{
        let match = input.match(IP);
        switch(true){
          case match != null:
            this.adbStatus.host = match[1];
            this.shellSpawn(["./adb",["pair"].concat(input.split(" ")), this.options], (chunk)=>{
              let strStdout = chunk.toString();
              console.log("[adb]:" + chunk.toString());
              if(strStdout.match(/Successfully/)){
                paired();
                this.inputInterface.pause();
              }else{
                this.adbStatus.host = null;
              }
            });
            break;
          case this.activeSubprocess.pair != null:
            this.activeSubprocess.pair.stdin.write(input+"\n");
            break;
        }
      });
    });
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
    this.activeSubprocess.pair = cp.spawn(cmd, args, options)
    this.activeSubprocess.pair.stdout.on("data", (chunk)=>{
      callback(chunk);
    });
    this.activeSubprocess.pair.stderr.on("data", (chunk)=>{
      callback(chunk);
    });
  }
  setOnConnecting(callback){
      this.onConnected = callback;
  }
  connectCheck(){
    return new Promise((connected, unconnected)=>{
      if(this.pinger()){
        connected();
      }else{
        unconnected();
      }
    });
  }
  pinger(){
    var pinger = this.shellExecSync("./adb shell echo \"connection test\" 1>&1 2>&1");
    return pinger.toString().search(/failed/) == -1;
  }
}
