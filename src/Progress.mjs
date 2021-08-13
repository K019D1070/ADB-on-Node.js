export default class Progress{
  progress = ""
  generate(data){
    let cursorMovedCount = 0;
    let progressView = [];
    progressView.push(`${data.finished}/${data.whole}`);
    cursorMovedCount++;
    data.message.forEach((progress)=>{
      progressView.push(`${progress} is transferring...`);
      cursorMovedCount++;
    });
    this.progress = `\n\r\x1B[0K${progressView.join("\n\r\x1B[0K")}\x1B[${cursorMovedCount}A\r\x1B[0K`;
    this.cursorPos = cursorMovedCount;
  }
  display(){
    process.stdout.write(this.progress);
  }
  reset(){
    //process.stdout.write(`\x1B[${this.cursorPos}B`);
    for(let i=0; i < this.cursorPos; i++){
      process.stdout.write(`\n\r\x1B[0K`);
    }
  }
}