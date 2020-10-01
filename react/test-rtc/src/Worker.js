import React, {Component} from "react";

class WorkerData extends Component {
    constructor(props){
        super(props);
        this.state= {

        };


        this.setMaster = this.setMaster.bind(this);
        this.removeWorker = this.removeWorker.bind(this);

    }



    removeWorker(){
        console.log(this.props.index)

        this.props.removeWorker(this.props.index);

    }
    setMaster(){
        this.props.setMaster(this.props.index);
    }




    render() {
        return (<div>
            Воркер {this.props.index}: count: {this.props.item.count }{this.props.item.isMaster ? "master": ""}
            {this.props.item.deleted? "deleted": ""}
            <button onClick={this.removeWorker}  disabled={this.props.item.removed}>remove Worker </button>
            <button onClick={this.setMaster} style={{display: this.props.item.isMaster ? 'none' : ''}}  disabled={this.props.item.removed}>set Master </button>


        </div>);
    }
}
// https://tproger.ru/translations/guide-to-threads-in-node-js/
export default WorkerData;