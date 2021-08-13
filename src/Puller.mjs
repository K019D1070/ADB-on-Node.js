import { parentPort } from 'worker_threads';

let main = null;
parentPort.on("message", (message)=>{
  switch(message.type){
    case "data":
      main = new Pull(message.message);
      break;
    case "filename":
      main.entry(message.message);
      break;
    case "query":
      parentPort.postMessage({
        type:"response",
        message:main.getQue()
      });
      break;
  }
});

import config from 'config';
import ADB from "./ADB.mjs";

export default class Pull{
  mq = config.get("maxQue");
  path = config.get("path");
  do = false;
  constructor(adbopt){
    this.que = [];
    this.adb = new ADB(adbopt);
    this.adb.setOnConnected(()=>{
      console.log("Pull ready.");
      this.start();
    });
    this.trxStatus = {
      queue: []
    };
    this.whole = 0;
    this.finished = 0;
  }
  main(){
    while(this.trxStatus.queue.length < this.mq && this.que.length > 0 && this.do){
      this.pull(this.que[0]);
      this.que.splice(0,1);
      this.report();
    }
  }
  pull(filename){
    this.trxStatus.queue.push(filename);
    let spawn = this.adb.adbSpawn([["pull", `${this.path.from}${filename}`, `${this.path.to}${filename}`]]);
    spawn.stdout.on("data", (chunk)=>{
      this.finished++;
      this.trxStatus.queue.splice(this.trxStatus.queue.indexOf(filename),1);
      parentPort.postMessage({
        type:"finish",
        message: chunk.toString()
      });
      this.report();
      this.main();
    });
  }
  entry(entry){
    this.whole++;
    this.que.push(entry);
    this.main();
  }
  start(){
    this.do = true;
    this.main();
  }
  stop(){
    this.do = false;
  }
  report(){
    parentPort.postMessage({
      type:"status",
      message: this.trxStatus.queue,
      whole:this.whole,
      finished:this.finished
    });
  }
  getQue(){
    return this.que.length;
  }
}