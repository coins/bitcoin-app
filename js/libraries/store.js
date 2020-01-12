class Store extends Observable {

	constructor(){
		super()
		this._reducers = []
		this.reset();
	}

	reset(){
		this._state = {}
		this._history = []
	}

	dispatch(type, data){
		console.log('Action',type, data)
		this._history.push({type,data})

		const {stateDiff, nextState} = this._reducers.reduce( 
				(accu, reducer) => {
					const stateDiff = mergeDeep(accu.stateDiff, reducer(type, data, accu.nextState));
					const nextState = mergeDeep( accu.nextState, stateDiff )
					return { stateDiff, nextState }
				}, {
					stateDiff : {},
					nextState : this._state
				})

		this._state = nextState;
		console.log('State Diff', stateDiff)
		traverseObject(stateDiff, (key, value) => this.fire(key, value) )
	}

	register(...reducers){
		this._reducers = this._reducers.concat(reducers)
	}

	get state(){
		return JSON.parse(JSON.stringify(this._state))
	}

}

function traverseObject(obj, callback, path='') {
    Object.keys(obj).map( key => {
        const nextPath = (path ? path + '.' : '') + key
        const value = obj[key]
        if (isObject(value)) {
            traverseObject(obj[key], callback, nextPath)
        } else {
            callback(nextPath, value)
        }
    });
}

function mergeDeep(target, source) {
	let output = Object.assign({}, target);
	if (isObject(target) && isObject(source)) {
	Object.keys(source).forEach(key => {
		if (isObject(source[key])) {
			if (!(key in target))
				Object.assign(output, { [key]: source[key] });
			else
				output[key] = mergeDeep(target[key], source[key]);
		} else {
			Object.assign(output, { [key]: source[key] });
		} });
	}
	return output;
}

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}