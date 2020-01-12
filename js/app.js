class App {
	
	constructor(){
		// Create Store
		let store = new Store();
		store.register(...walletReducers)
		store.on('route', route => this.route = route)
		this._store = store

		// Register Views
		this._viewLogin = new ViewLogin(store);
		this._viewSignup = new ViewSignup(store);
		this._viewSend = new ViewSend(store);
		this._viewReceive = new ViewReceive(store);
		this._viewHome = new ViewHome(store);
		this._viewSettings = new ViewSettings(store);
		this._router = new Router(store);
		this._platform = new Platform(store);
		this._toast = new Toast(store);

		// Initialize Bitcoin Services
		this._bindBitcoin(store);
		this._bitcoin.fetchExchangeRate();
		store.dispatch('INIT', {
			location : {
				origin : location.origin
			},
			device : {
				isProtocolHandlerSupported : !!navigator.registerProtocolHandler,
				isClipboardPasteSupported : !!(navigator.clipboard && navigator.clipboard.readText),
				isInstallSupported : false
			}
		});
	}

	_bindBitcoin(store){
		const bitcoin = new Bitcoin();
		bitcoin.on('progress', progress => store.dispatch('LOGIN_PROGRESS', {progress}));
		bitcoin.on('logged-in', account => store.dispatch('LOGGED_IN', account ));
		bitcoin.on('balance', balance => store.dispatch('BALANCE', balance ));
		bitcoin.on('exchange-rate', exchangeRate => store.dispatch('EXCHANGE_RATE', exchangeRate ));
		bitcoin.on('transactions', transactions => store.dispatch('TRANSACTIONS', transactions ));
		bitcoin.on('error', error => store.dispatch('ERROR', error ));

		store.on('account.isLoading', isLoading => {
			if(isLoading === false) return;
			const account = store.state.account;
			bitcoin.login( account.email, account.password ); 
		});

		store.on('account.address', address => {
			bitcoin.startPolling(address);
		});

		store.on('myTransaction.pending', pending => {
			if(!pending) return;
			const recipient = store.state.myTransaction.recipient;
			const value = store.state.myTransaction.value.raw.crypto;
			const fees = store.state.myTransaction.fees.raw.crypto;
			const privateKey = store.state.account.private;
			const address = store.state.account.address;
			bitcoin.sendTx(recipient, value, fees, privateKey, address);
		});
		this._bitcoin = bitcoin;
	}

	set route(route){
		document.body.setAttribute('state', route);
	}

	get state(){
		return this._store.state
	}

	set state(history){
		history.forEach(action => this._store.dispatch(action.type, action.data))
	}

	get history(){
		return this.state._history
	}
}

const app = new App()


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(serviceWorker => {
            console.log('Service Worker registered');
            window.serviceWorker = serviceWorker
        });
}