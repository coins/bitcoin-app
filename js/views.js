class View {
	
	constructor(selector, store){
		this.$el = document.querySelector(selector);
		this.store = store;
	}

	/* Query inside of this DOM-Element */
	$(selector) { 
		return this.$el.querySelector(selector);
	}

	/* Set Attribute of root element. Removes attribute if value == false */
	setAttribute(attr, value){
		if(value)
			this.$el.setAttribute(attr, value);
		else
			this.$el.removeAttribute(attr);
	}

}

class ViewLogin extends View {

	constructor(store) {
		super('#login', store)

		this.$form = this.$('form');
		this.$form.addEventListener('submit', e => this._onLogin(e));

		this.$progress = this.$('progress');
		store.on('account.loginProgress', value => this.progress = value );
		store.on('account.isLoading', value => this.isLoading = value );
		store.on('account.email', email => this.email = email );
		store.on('account.password', password => this.password = password );
	}

	_onLogin(e) {
	    if(e) e.preventDefault();
	    this.store.dispatch('LOGIN', { email: this.email, password: this.password });
	}

	set progress(progress){
		this.$progress.value = progress
	}

	get email(){
		return this.$form.email.value
	}

	set email(email){
		this.$form.email.value = email
	}

	get password(){
		return this.$form.password.value
	}

	set password(password){
		this.$form.password.value = password
	}

	set isLoading(isLoading){
		this.setAttribute('loading', isLoading);
	}
}

class ViewSignup extends View {

	constructor(store){
		super('#signup', store);
		
		this.$form = this.$('form');
		this.$form.addEventListener('submit', e => this._onSignup(e));

		this.$progress = this.$('progress')

		store.on('account.loginProgress', progress => this.progress = progress )
		store.on('account.email', email => this.email = email )
		store.on('account.password', password => this.password = password )
		store.on('account.isLoading', isLoading => this.isLoading = isLoading )
	}

	_onSignup(e) {
	    if(e) e.preventDefault();
	    this.store.dispatch('LOGIN', { email: this.email, password: this.password })
	}

	get email(){
		return this.$form.email.value
	}

	set email(email){
		this.$form.email.value = email
	}

	get password(){
		return this.$form.password.value
	}

	set password(password){
		this.$form.password.value = password
	}

	set isLoading(isLoading){
		this.setAttribute('loading', isLoading);
	}

	set progress(progress){
		this.$progress.value = progress
	}
}

class ViewHome extends View {
	
	constructor(store){
		super('#home', store);
		this.$balanceCrypto = this.$('#balance-btc');
		this.$balanceFiat = this.$('#balance-fiat');
		this.$transactions = this.$('#transactions');

		store.on('account.balance.crypto', balance => this.balanceCrypto = balance )
		store.on('account.balance.fiat', balance => this.balanceFiat = balance )
		store.on('account.transactionsCount', _ => this.transactions = store.state.account.transactions )
	}

	set balanceCrypto(balance){
		this.$balanceCrypto.textContent = balance
	}

	set balanceFiat(balance){
		this.$balanceFiat.textContent = balance
	}

	set transactions(transactions){
		this.clearTransactions();
		transactions.forEach( (transaction, index) => this._addTransaction(transaction, index));
	}

	clearTransactions(){
		this.$transactions.innerHTML = '';
	}

	_addTransaction(transaction, index){
		const tx = new TransactionElement(transaction, this.store, index);
		this.$transactions.appendChild(tx.$el);
	}
}

class TransactionElement extends View {
	
	constructor(transaction, store, index){
		super();
		this.createElement();
		this.transaction = transaction;
		store.on(`account.transactions[${index}]`, transaction => this.transaction = transaction);
		store.on(`account.transactions[${index}].status`, status => this.status = status);
	}

	createElement(){
		const tpl = document.querySelector('#transaction-tpl');
		this.$el = document.importNode(tpl.content, true).firstElementChild;
	}

	set transaction(tx){
		this.valueFiat = tx.valueFiat;
		this.isIncoming = tx.isIncoming;
		this.txid = tx.txid;
		this.status = tx.status;
	}

	set valueFiat(value){
		this.$('#tx-value').textContent = value;
	}

	set isIncoming(isIncoming){
		this.setAttribute('incoming', isIncoming);
	}

	set txid(txid){
		this.$('#tx-id').textContent = txid;
		this.$('#tx-id').href = `https://blockstream.info/tx/${txid}`;
	}

	set status(status){
		this.$('#tx-status').textContent = status;
	}
}


class ViewSend extends View {
	
	constructor(store){
		super('#send', store);
		store.on('myTransaction.recipient', recipient => this.recipient = recipient);
		store.on('myTransaction.value.raw.fiat', value => this.value = value);
		store.on('myTransaction.fees.fiat', fees => this.fees = fees);
		store.on('myTransaction.remainingBalance', balance => this.remainingBalance = balance);
		store.on('myTransaction.isValid', isValid => this.isValid = isValid);
		store.on('myTransaction.isValidBalance', isValid => this.isValidBalance = isValid );
		store.on('myTransaction.isValidRecipient', isValid => this.isValidRecipient = isValid );
		this.registerFeesDialog()
		this.registerConfirmDialog()
		this.registerScanDialog()

		this.$recipient = this.$('#recipient')
		this.$fees = this.$('#fees')

		this.$value = this.$('#value')

		this.$value.addEventListener('keyup',  _ => store.dispatch('TX_VALUE', { value: this.value }));
		this.$recipient.addEventListener('keyup',  _ => store.dispatch('TX_RECIPIENT', { recipient: this.recipient }));

		this.$remainingBalance = this.$('#remaining-balance');

		this.$valueMax = this.$('#value-max');
		this.$valueMax.addEventListener('click', _ => store.dispatch('TX_VALUE_MAX'));
	}

	registerFeesDialog() {
	    const dialog = new FeesDialog(this.store);
	    const $btn = this.$('#fees');
	    $btn.addEventListener('click', e => dialog.show());
	    this._feesDialog = dialog;
	}

	registerConfirmDialog() {
	    const dialog = new ConfirmDialog(this.store);
	    const $btn = this.$('#confirm-tx-btn');
	    $btn.addEventListener('click', e => dialog.show());
	    this._confirmDialog = dialog;
	    this.$confirmDialogBtn = $btn;
	}

	registerScanDialog() {
	    const dialog = new Dialog('scan-address-dialog');
	    const $btn = this.$('#scan-recipient');
	    $btn.addEventListener('click', e => dialog.show());
	}

	set value(value){
		this.$value.value = value;
	}

	get value(){
		return this.$value.value;
	}

	set recipient(recipient){
		this.$recipient.value = recipient;
	}

	get recipient(){
		return this.$recipient.value;
	}

	set fees(fees){
		this.$fees.value = fees;
	}

	get fees(){
		return this.$fees.value;
	}

	set remainingBalance(remainingBalance){
		this.$remainingBalance.textContent = remainingBalance;
	}

	set isValid(isValid){
		this.$confirmDialogBtn.disabled = !isValid;
	}

	set isValidBalance(isValid){
		// this.$remainingBalance.setAttribute('invalid', isValid)
	}

	set isValidRecipient(isValid){
		// if(!isValid)
		// 	this.$recipient.setAttribute('invalid', isValid);
		// else 
		// 	this.$recipient.removeAttribute('invalid');
	}
}


class Dialog extends View {

    constructor(id) {
        super('#'+id);
        this.$el.querySelectorAll('[js-close]')
        	.forEach(el => el.addEventListener('click', e => this.hide()));
        this.$autoFocus = this.$('[autofocus]');
    }

    show() {
        this.setAttribute('hidden', false);
        if (this.$autoFocus) this.$autoFocus.focus();
    }

    hide() {
        this.setAttribute('hidden', true);
        document.activeElement.blur();
        window.blur();
    }
}


class ConfirmDialog extends Dialog {
	
	constructor(store){
		super('confirm-tx-dialog');
		store.on('myTransaction.recipient', recipient => this.recipient = recipient);
		store.on('myTransaction.value.fiat', value => this.valueFiat = value);
		store.on('myTransaction.value.crypto', value => this.valueCrypto = value);
		store.on('myTransaction.fees.fiat', fees => this.fees = fees);
		store.on('myTransaction.remainingBalance', balance => this.remainingBalance = balance);
		store.on('myTransaction.processingTime', time => this.processingTime = time );

		this.$('#send-tx-btn').addEventListener('click', _ => store.dispatch('TX_SEND'))
	}

	set recipient(recipient){
		this.$('#confirm-recipient').textContent = recipient;
	}

	set valueFiat(value){
		this.$('#confirm-value-fiat').textContent = value;
	}

	set valueCrypto(value){
		this.$('#confirm-value-crypto').textContent = value;
	}

	set fees(fees){
		this.$('#confirm-fees').textContent = fees;
	}

	set remainingBalance(remainingBalance){
		this.$('#confirm-remaining-balance').textContent = remainingBalance;
	}

	set processingTime(processingTime){
		this.$('#confirm-processing-time').textContent = processingTime;
	}

}


class FeesDialog extends Dialog {
	
	constructor(store){
		super('fees-dialog');
		this.$input = this.$('input');
		this.$input.addEventListener( 'input', 
			_ => store.dispatch('TX_FEES', { fees : this.feesFiat } )
		);
		store.on('myTransaction.fees.fiat', fees => this.feesFiat = fees );
		store.on('myTransaction.fees.crypto', fees => this.feesCrypto = fees );
		store.on('myTransaction.fees.raw.fiat', fees => this.feesRawFiat = fees );
		store.on('myTransaction.processingTime', time => this.processingTime = time );
		store.on('myTransaction.isValidBalance', isValid => this.isValid = isValid );

		// TODO: Remove code smell
		this.$input.min = 0.02;
		this.$input.max = 2;
		this.$input.step = 0.01;
	}

	set feesFiat(fees){
		this.$('#fees-fiat').textContent = fees;
	}

	get feesFiat(){
		return this.$input.value
	}

	set feesCrypto(fees){
		this.$('#fees-crypto').textContent = fees;
	}

	set processingTime(processingTime){
		this.$('#fees-processing-time').textContent = processingTime;
	}

	set feesRawFiat(fees){
		this.$('input').value = fees;
	}


	set isValid(isValid){
		this.$('button').disabled = !isValid;
	}
}


class ViewReceive extends View {
	
	constructor(store){
		super('#receive', store);
		this.$addressQr = this.$('#address-qr');
		this.$addressText = this.$('#address-text');
		this.$addressLink = this.$('#address-link');
		store.on('account.address', address => this.address = address);
		store.on('account.addressUri', uri => this.addressQr = uri);
		this.$addressText.addEventListener('click', _ => store.dispatch('COPY_ADDRESS') );
	}	

	get address(){
		return this.$addressText.value;
	}

	set address(address){
		this.addressText = address;
		this.addressLink = address;
	}

	set addressText(address){
		this.$addressText.value = address;
	}

	set addressQr(address) {
	    const options = {
	        text: address,
	        radius: 0.5,
	        ecLevel: 'H',
	        fill: '#333',
	        background: '#fff',
	        size: 240
	    }

	    this.$addressQr.innerHTML = '<svg class="icon size-2 shadow-1"><use xlink:href="#ic-logo"/></svg>';
	    QrCode.render(options, this.$addressQr );
	}

	set addressLink(address){
		const location = window.location.origin;
		const pathname = window.location.pathname;
		const url = `${location}${pathname}#uri=bitcoin:${address}`;
		this.$addressLink.href = `whatsapp://send?text=${encodeURIComponent(url)}`;
	}
}

class ViewSettings extends View {
	
	constructor(store){
		super('#settings', store);
		store.on('account.email', email => this.email = email);

		this.$('#logout-btn').addEventListener('click',  _ => store.dispatch('LOGOUT') );

		this.$('#register-protocol-btn').addEventListener('click',  _ => store.dispatch('REGISTER_PROTOCOL') );
		store.on('device.isProtocolHandlerSupported', isSupported => this.isProtocolHandlerSupported = isSupported );
	
		this.$('#install-btn').addEventListener('click',  _ => store.dispatch('INSTALL') );
		store.on('device.isInstallSupported', isSupported => this.isInstallSupported =isSupported);
	}

	set email(email){
		this.$('#email').textContent = email;
	}

	set isProtocolHandlerSupported(isSupported){
		if(isSupported){
			this.$('#register-protocol-btn').removeAttribute('hidden');
		} else {
			this.$('#register-protocol-btn').setAttribute('hidden', true);
		}
	}

	set isInstallSupported(isSupported){
		if(isSupported){
			this.$('#install-btn').removeAttribute('hidden');
		} else {
			this.$('#install-btn').setAttribute('hidden', true);
		}
	}
}


class Router {

	constructor(store){
		this._store = store;
		window.addEventListener('hashchange', _ => this._onHashChange());
		store.on('route', route => this.route = route);
		this._onHashChange()
	}

	_onHashChange() {
    	if (!this.route) return;
    	this._store.dispatch('ROUTE_CHANGE', { route : this.route });
	}

	set route(route){
		if(route === this.route) return;
		window.location = `#${route}`;
	}

	get route(){
		return location.hash.substr(1);
	}
}


class Platform {

	constructor(store){
		store.on('clipboard', payload => this.copyToClipboard(payload));
		store.on('share', payload => this.share(share));
		store.on('register_bitcoin_uri', uri => this.registerProtocolHandler(uri));
		store.on('install_prompt', _ => this.install());
	}

	copyToClipboard(payload){
		navigator.clipboard.writeText(payload);
	}

	readFromClipboard(){
		navigator.clipboard.readText(payload);
	}

	share(payload){
		navigator.share(payload);
	}

	registerProtocolHandler(uri){
		navigator.registerProtocolHandler('bitcoin', uri, 'Bitcoin App');
	}

	addToHomeScreen(){
		window.addEventListener('beforeinstallprompt', e => {
		    if (window.matchMedia('(display-mode: standalone)').matches) {
		        // don't display install banner when installed
		        this.store.dispatch('INSTALL_SUPPORTED', { isInstalled: true });
		        return e.preventDefault();
		    } else {
		        this._installPrompt = e;
		        this.store.dispatch('INSTALL_SUPPORTED', { isInstallSupported : true });
		        return e.preventDefault();
		    }
		});
	}

	install(){
		this._installPrompt.prompt();
	}

	registerServiceWorker(){
		if ('serviceWorker' in navigator) {
		    navigator.serviceWorker.register('/service-worker.js')
		        .then(serviceWorker => {
		            console.log('Service Worker registered');
		            window.serviceWorker = serviceWorker;
		        });
		}
	}

	registerOfflineHandler(){
		
	}
}

class Toast extends View {

	constructor(store){
		super('#toast', store);
		store.on('toast', caption => this.caption = caption )
	}

	set caption(caption){
		this.show()
		this.$el.textContent = caption;
	}

	show(){
		this.setAttribute('show', true);
		setTimeout( _ => this.hide(), 5000);
	}

	hide(){
		this.setAttribute('show', false);
	}

}

class ConfirmLogoutDialog extends Dialog {
	
	constructor(store){
		super('confirm-logout-dialog');
		this.$('#logout-btn').addEventListener('click', _ => store.dispatch('LOGOUT'));
	}

}

