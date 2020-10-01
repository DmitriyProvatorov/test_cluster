const config = require('../config');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const redis = require("redis");
const server = require("http").createServer();
const io  = require("socket.io")(server, {origins: "*:*"});
let state_socket= {
    socket_connection: false
}
let informationFromWorkers = {}
server.listen(8081);
io.on("connection", (socket) => {
    socket
    console.log("connection");

    state_socket.socket_connection = true;
    console.log(JSON.stringify(informationFromWorkers))
    io.sockets.emit("information", JSON.stringify(informationFromWorkers))

    socket.on("newMaster", function (index) {

        workersManager.masterWorker.index = index;
        workersManager.masterWorker.worker.postMessage("WM_setMaster", JSON.stringify({index: index, count: workersManager.getWorkersLength()}));
    });

    socket.on("addWorker", function () {

        workersManager.state = "addWorker";
        workersManager.addWorker(workersManager.workers.length + 1);

    });

    socket.on("removeWorker", function (index) {

        let removeWorker = workersManager.workers[index -1];
        workersManager.workers[index -1] = 0
        removeWorker.worker.terminate();
    });
    socket.on("setMaster", function (index) {

        workersManager.masterWorker = workersManager.workers[index -1];
        workersManager.masterWorker.worker.postMessage({event: 'WM_setMaster', index: index, count:  workersManager.getWorkersLength()})
    });

});

let subscriberController = redis.createClient();
subscriberController.subscribe("controller");
//Отслеживаю своё событие в конце кода воркера - поскольку событие online при старкте воркера срабатывает не факт что слушатели подключены- вывод в консоли
subscriberController.on("message", function(channel, message) {
    switch (message){
        case "readyWorker":
            console.log('get message from worker slave create')
            workersManager.workersReady ++;
            workersManager.checkReady();
            break;

    }
});

const workersManager = {
    workersCount: 0,
    workersReady: 0,
    masterWorker: null,
    isSetMaster : false,
    workers: [],
    state: false,
    checkReady(){

        if(this.workersCount == this.workersReady  ) {
            console.log("All workers are ready");
            switch(this.state){
                case "setMaster":
                    let rand = parseInt(Math.random() * (this.workers.length -1) +1);
                    console.log("index worker of start: ", rand);
                    this.masterWorker = this.workers[rand -1];
                    console.log( this.masterWorker.index)
                    this.masterWorker.worker.postMessage({event: 'WM_setMaster', index: rand, count: this.getWorkersLength()})

                break;
                case "addWorker":

                    workersManager.masterWorker.worker.postMessage({event: 'WM_addWorker',  count: this.getWorkersLength()});
                break;
            }
        }
    },
    getWorkersLength(){
        let length = 0;

        for(let _w of this.workers){
            if(_w){
                length ++
            }
        }
        return length
    },
    newMaster(index){
        if (index != workersManager.masterWorker.index){
            workersManager.masterWorker.index = index;
            workersManager.masterWorker.worker.postMessage({event: 'WM_newMaster', index});
        }
    },
    addWorker(index) {
        let w = new Worker("./workers/worker.js", {workerData: {index: index }});
        w.on('message', (msg) => {

            if(!informationFromWorkers[msg.index]){
                informationFromWorkers[msg.index] = {
                    count: 0
                }
            }

            if(msg.isMaster ) {

                informationFromWorkers[msg.index].isMaster = true;
            }
            else{

                if (informationFromWorkers[msg.index]){
                    informationFromWorkers[msg.index].count++;

                    if(informationFromWorkers[msg.index].isMaster && !msg.isMaster){
                            informationFromWorkers[msg.index].isMaster = false;
                    }

                }
            }

           if(state_socket.socket_connection) {
                io.sockets.emit("information", JSON.stringify(informationFromWorkers))
            }
        });

        w.on('online', ()=>{
            console.log('worker:', index, "online event")
        });
        w.on('exit', (code) => {
            console.log("worker exit", code)
            if (code  > 1  ) {
                console.error(new Error(`Worker stopped with exit code ${code}`));
            }
            if(code == 1){

                informationFromWorkers[index] = informationFromWorkers[index] || {};
                informationFromWorkers[index].removed = true;
                informationFromWorkers[index].isMaster = false;

                if(state_socket.socket_connection) {
                    io.sockets.emit("information", JSON.stringify(informationFromWorkers))
                }
                if( index == workersManager.masterWorker.index){

                    for(let _w of workersManager.workers){
                        if(_w.index== index ){
                            _w = 0;
                            break;
                        }
                    }

                    for( let _worker of this.workers){
                        if(_worker){
                            this.masterWorker = _worker;
                            break;
                        }
                    }

                    if(this.masterWorker) {
                        this.masterWorker.worker.postMessage({
                            event: 'WM_setMaster',
                            index: this.masterWorker.index,
                            count: this.getWorkersLength()
                        })
                    }
                }
                else{
                    console.log("get Slaves")
                    this.masterWorker.worker.postMessage({event: 'WM_getSlaves', index: this.masterWorker.index, count: this.workers.length})
                }
            }
        });
        this.workers.push({
            isMaster :  false,
            worker : w,
            index: index
        });
        this.workersCount ++;
        return w;
    },
    createWorkers() {
        for (let index =0; index < config.workersNum; index++) {
            console.log("index cicle ",index +1)
            let worker = this.addWorker(index +1 )
        }
        workersManager.state = "setMaster";

    },
}
workersManager.createWorkers();


