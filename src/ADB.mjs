import config from 'config';
import * as cp from 'child_process';
import * as rl from 'readline';

export default class ADB{
  IP = /(\[*[0-z.:]+\]*):([0-9]{1,6})/; // IPwithPort
  adbName = config.get("adbName");
  options = {
    env:{
      PATH:`${process.env.PATH}:${config.get("adbPath")}`
    }
  }
  activeSubprocess={
    pair:null
  }
  adbStatus = {
    connected: false
  }
  adbOptions = {
    host: config.get("IPAddress"),
    port: null,
    device: null
  }
  inputInterface = null;
  checkInterval = null;
  onConnected = ()=>{};
  constructor(options = {
    host: config.get("IPAddress"),
    port: null,
    device: null
  }){
    process.stdin.setEncoding("utf8");
    this.adbOptions = {...options};
    this.inputInterface = rl.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.connectCheck().then(()=>{this.preOnConnected()}, ()=>{
      this.checkInterval = setInterval(()=>{
        this.connectCheck().then(()=>{this.preOnConnected()}, ()=>{});
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
          if(this.adbOptions.host != null){
            this.inputInterface.question("[port]", (input)=>{
              let connectRes = this.connect(this.adbOptions.host, input).toString();
              console.log("[adb]:"+ connectRes);
              if(connectRes.match(/failed/) != null){
                console.log("Connection failed. Retry.");
                this.choice();
              }
            });
          }else{  
            this.inputInterface.question("Enter [IP adress]:[port]", (input)=>{
              let match = input.match(this.IP);
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
                this.connect(this.adbOptions.host, input);
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
  connect(IPAddress = this.adbOptions.host, port = this.adbOptions.port){
    return this.shellExecSync(`${config.get("adbPath")}/${this.adbName} connect ${IPAddress}:${port} 1>&1 2>&1`).toString();
  }
  pairing(){
    return new Promise((paired)=>{
      console.log("Enter [IP address]:[port] [pair code]");
      this.inputInterface.prompt();
      this.inputInterface.on("line", (input)=>{
        let match = input.match(this.IP);
        switch(true){
          case match != null:
            this.adbOptions.host = match[1];
            this.activeSubprocess.pair = this.shellSpawn([this.adbName, ["pair"].concat(input.split(" ")), this.options], (chunk)=>{
              let strStdout = chunk.toString();
              console.log("[adb]:" + chunk.toString());
              if(strStdout.match(/Successfully/)){
                paired();
                this.inputInterface.pause();
              }else{
                this.adbOptions.host = null;
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
  adbExecSync(args, options = this.options){
    return this.shellExecSync(`${this.adbName} -s ${this.adbOptions.device} ${args}`, options);
  }
  shellExecSync(cmd, options = this.options){
    try{
      var pinger = cp.execSync(cmd, options);
    }catch(err){
      var pinger = err;
    }finally{
      return pinger;
    }
  }
  adbSpawn([args, options = this.options], callback = ()=>{}){
    return this.shellSpawn([this.adbName, ["-s", this.adbOptions.device].concat(args), options], callback)
  }
  shellSpawn([cmd, args, options = this.options], callback = ()=>{}){
    let spawn = cp.spawn(cmd, args, options);
    spawn.stdout.on("data", (chunk)=>{
      callback(chunk);
    })
    return spawn;
  }
  setOnConnected(callback){
      if(this.adbStatus.connected){
        callback();
      }else{
        this.onConnected = callback;
      }
  }
  preOnConnected(){
    clearInterval(this.checkInterval);
    this.inputInterface.close();
    this.adbStatus.connected = true;
    this.onConnected();
  }
  connectCheck(){
    return new Promise((connected, unconnected)=>{
      if(this.pinger()){
        connected();
      }
      let strStdout = this.shellExecSync(`${this.adbName} devices`).toString();
      let devices = [...strStdout.matchAll(/([0-z.:\[\]]+)\t(?:device)\n/g)];
      if(devices.length > 0){
        if(devices.length == 1){
          this.adbOptions.device = devices[0][1];
          if(this.pinger()){
            connected();
          }else{
            unconnected();
          }
        }else{
          console.log("There are many connected adb devices.");
          console.log("[adb]:"+strStdout);
          let n = 0;
          devices.forEach((device)=>{
            console.log(`[${n++}]` + device[1]);
          });
          let q = ()=>{
            this.inputInterface.question(`Choose device[0-${devices.length- 1}]`, (input)=>{
              if(devices[input] == undefined){
                console.log("You entered wrong parameter.");
                this.inputInterface.pause();
                q();
                return;
              }
              this.adbOptions.device = devices[input][1];
              console.log(`${devices[input][1]} was set.`);
              if(this.pinger()){
                connected();
              }else{
                unconnected();
              }
            });
          };
          q();
          
        };
      }else{  
        unconnected();
      }
    });
  }
  pinger(){
    var pinger = this.adbExecSync("shell echo \"connection test\" 1>&1 2>&1");
    return pinger.toString().search(/failed/) == -1;
  }
  getOptions(){
    return this.adbOptions;
  }
}
