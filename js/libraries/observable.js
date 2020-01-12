class Observable{

	constructor(){
		this._handlers=[];
	}
	
    on(type, handler){
    	if(this._handlers[type]){
    		this._handlers[type].push( handler )
    	} else {
    		this._handlers[type] = [ handler ]
    	}
    }

    off(type, id){
    	throw "not implemented"
    }

    fire(type, data){
        if(this._handlers[type])
    	   this._handlers[type].forEach( handler => handler(data) )
    }
}