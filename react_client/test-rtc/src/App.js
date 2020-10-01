import React, { Component } from 'react';
import openSocket from 'socket.io-client';
import WorkerData from './Worker';
const socket = openSocket('http://localhost:8081');
class App extends Component {
  constructor(props){
    super(props);
    this.state= {
      _workers: [],
      count: 0
    };
    socket.on('information', (msg)=>{

      try {
        let _workers = JSON.parse(msg);
        let _arr = [];
        let _count = 0;
        for (let index in _workers){
          _arr[index] = _workers[index];
          _count +=  _workers[index].count
        }
        this.setState({ _workers: _arr, count: _count });
      }
      catch(e){}

    });


  }

  addWorker(){
    socket.emit('addWorker' )
  }

  removeWorker(index){
    socket.emit('removeWorker', index)
  }
  setMaster(index){
    socket.emit('setMaster', index)
  }

  render() {
    return (<div>
      <h2>Общее количество {this.state.count}</h2>
      <div>при ремове, сет мастере, и адд сообщения шлются всем воркерам</div>
      <div>
        {this.state._workers.map((item,index) =>
          <WorkerData index={index} item={item} key={`item${index}`} removeWorker={this.removeWorker}
                      setMaster={this.setMaster}/>
        )}
      </div>
      <button onClick={this.addWorker}>add Worker </button>
    </div>);
  }
}
// https://tproger.ru/translations/guide-to-threads-in-node-js/
  export default App;
