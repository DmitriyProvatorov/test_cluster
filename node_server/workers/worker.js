const {  parentPort,  workerData, isMainThread} = require("worker_threads");
console.log("worker: ", workerData.index, "start create")
;
const redis = require("redis");
let publisher  = redis.createClient();

if(!isMainThread) {
    // Не буду расширять класс классом слушателем , поскольку усложняет код
    class Worker{
        constructor(data) {
            this.subscriber = redis.createClient();
            this.publisher = redis.createClient();
            this.listSlaves = [];

            this.storage = data || {
                index: false,
                isMaster: false
            };
            this.redisSudscrable(this);
            this.parentPortListener(this);
            this.publisher.publish("controller", "readyWorker");
        }
        setMaster() {
            this.storage.isMaster = true;
        }
        redisSudscrable(that){
            that.subscriber.subscribe("worker");
            that.subscriber.on("message", function(channel, msg) {
                msg = JSON.parse(msg)

                switch (msg.event){
                    case "RM_getSlaveIndex":
                        /*
                         Получить индексы остальных воркеров чтоб идентифицировать их
                         */

                        if(!that.storage.isMaster){

                            that.publisher.publish("worker", JSON.stringify({event : "RM_addIndex", index: that.storage.index, count: msg.count}));
                        }
                        else{
                            that.listSlaves = [];
                        }
                        break;
                    case "RM_addIndex":
                        if(that.storage.isMaster){
                            if(msg.count) {
                                that.storage.workersCount = msg.count;
                            }
                            if(that.listSlaves .indexOf(msg.index) == -1){
                                that.listSlaves.push(msg.index)
                            }
                            if(that.listSlaves.length == that.storage.workersCount-1){

                                console.log(that.storage)
                                that.sendNumsToSlaves(that)
                                parentPort.postMessage({index: that.storage.index, isMaster: that.storage.isMaster, } );
                            }
                        }

                    break;

                    case "RM_setMaster":

                        if(that.storage.index == msg.index){

                            that.storage.workersCount = msg.count;
                            that.setMaster();
                            that.getSlaveIndexes();
                        }
                        else{
                            that.storage.isMaster =false;
                        }

                        break;

                    case "RM_addWorker":

                        if(that.storage.isMaster){

                            that.listSlaves = [];

                            that.storage.workersCount = msg.count;

                            parentPort.postMessage({index: that.storage.index, isMaster: that.storage.isMaster, } );

                            that.getSlaveIndexes();
                        }
                        break;
                    case "setNumber":
                        if(msg.index == that.storage.index){
                            console.log("slave :",  msg.index, "get num:", msg.num ," from master")

                            parentPort.postMessage({index: that.storage.index, isMaster: that.storage.isMaster, } );
                        }
                        break;
                }
            });
        }
        parentPortListener(that){
            parentPort.on("message", (msg, data) => {

                //  console.log(msg)
                switch(msg.event){
                    case "WM_setMaster":

                        that.storage.isMaster = false;

                        publisher.publish("worker", JSON.stringify({event: "RM_setMaster",index: msg.index, count:msg.count}));

                        break;

                   case "WM_removeWorker":
                        storage.isMaster = false;
                        break;

                    case "WM_addWorker":
                        publisher.publish("worker", JSON.stringify({event: "RM_addWorker", count:msg.count}));
                        break;
                    case "WM_getSlaves":

                            that.getSlaveIndexes(msg);
                        break;
                }
            })
        }
        getSlaveIndexes(msg){

            msg= msg || {};
            this.publisher.publish("worker", JSON.stringify({event : "RM_getSlaveIndex", index: this.storage.index, count:msg.count}));
        }
        random (min, max){
            return Math.floor(Math.random() * Math.floor(max));
        }
        removeWorker(index){
            this.publisher.publish("worker", JSON.stringify({event: "removeWorker",index: index}));
        }
        sendNumsToSlaves(that){
            for(let index of that.listSlaves){
                let num = parseInt(that.random(1, 100));
                console.log("master send:", num, "to worker: " , index );
                publisher.publish("worker", JSON.stringify({event: "setNumber",index, num}));

            }
        }}
    new Worker(workerData);
    console.log('create worker')
}
