class Bitcoin extends Observable {

    constructor() {
        super()
        this._email = null;
        this._password = null;
    }

    login(email, password) {
        warpWallet(email, password,
            account => this.fire('logged-in', account),
            progress => this.fire('progress', progress));
    }

    getAddress() {

    }

    async sendTx(recipient, value, fees, privateKeyWIF, address) {
        try {
            value = Math.round(value * 1e8) // to satoshis
            fees = Math.round(fees * 1e8) // to satoshis
            const inputs = await BitcoinService.fetchUnspentOutputs(address);
            const tx = buildTransaction(inputs, privateKeyWIF, recipient, value, fees);
            await BitcoinService.broadcastTransaction(tx);
        } catch (error) {
            this.fire('error', {
                type: 'send-transaction',
                message: error.message
            });
        }
    }

    logout() {

    }

    static validateAddress(address) {
        // TODO: verify checksum
        // TODO: add bech32 format 
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
    }

    generateKeys() {
        const keyPair = bitcoin.ECPair.makeRandom();
        return {
            privateKey: keyPair.toWIF(),
            address: keyPair.getAddress()
        }
    }

    async fetchBalance(address) {
        const balance = await BitcoinService.fetchBalance(address);
        this.fire('balance', { balance })
    }

    async fetchExchangeRate() {
        try {
            const price = await BitcoinService.fetchExchangeRate();
            this.fire('exchange-rate', { exchangeRate: price })
        } catch (error) {
            this.fire('error', {
                type: 'fetch-exchange-rate',
                message: error.message
            });
            this.fire('exchange-rate', { exchangeRate: 10000 })
        }
    }

    async fetchTransactions(address) {
        if (!address) return;
        const transactions = await BitcoinService.fetchTransactions(address);
        this.fire('transactions', { transactions })
    }

    startPolling(address) {
        this.stopPolling();
        this._pollTimer = setInterval(_ => this._poll(address), 30 * 1000);
        this._poll(address);
    }

    stopPolling() {
        clearInterval(this._pollTimer);
    }

    _poll(address) {
        this.fetchBalance(address);
        this.fetchTransactions(address);
        this.fetchExchangeRate();
    }
}

function warpWallet(email, password, callback, progressHook) {
    console.log('starting KDF');
    warpwallet.run({
        salt: email,
        passphrase: password,
        progress_hook: onProgress,
        params: { N: 18, p: 1, r: 8, dkLen: 32, pbkdf2c: 65536 }
    }, callback);

    // Map the progress of the multiple KDFs to a single number between 1 - 100% 
    function onProgress(e) {
        let progress;
        let relativeProgress = e.i / e.total;
        switch (e.what) {
            case 'pbkdf2 (pass 1)':
                progress = relativeProgress * 1 / 10.0;
                break;
            case 'scrypt':
                progress = 1 / 10 + relativeProgress * 8 / 10.0;
                progressHook(progress)
                break;
            case 'pbkdf2':
                progress = 9 / 10 + relativeProgress * 1 / 10.0;
                progressHook(progress)
                break;
        }
    }
}


function transactionsAdaptor(transactions) {
    // TODO: isIncoming?
    // Rich Test Address: 18cBEMRxXHqzWWCxZNtU91F5sbUNKhL5PX
    return transactions.map(tx => {
        const inputs = tx.vin.map(i => (i.prevout && {
            address: i.prevout.scriptpubkey_address,
            value: i.prevout.value
        }));
        const outputs = tx.vout
            .filter(o => o.scriptpubkey_type !== 'op_return')
            .map(o => ({
                address: o.scriptpubkey_address,
                value: o.value
            }));
        const fees = tx.fee || 0;
        const isConfirmed = tx.status.confirmed;
        const timestamp = tx.status.block_time;
        const txid = tx.txid;
        return { inputs, outputs, fees, isConfirmed, timestamp, txid }
    });
}

function transactionsAdaptor2(transactions, address) {
    return transactions.map(transaction => {
        // "is incoming" If no input is from our address
        const isIncoming = !transaction.inputs.filter(input => input && input.address === address).length;
        transaction.isIncoming = isIncoming;
        const value = transaction.outputs
            .filter(output => (output.address === address) === isIncoming)
            .reduce((value, output) => value + output.value, 0)
        transaction.value = value;
        return transaction;
    });
}

class BitcoinService {

    /*
        Blockstream API Documentation 
        https://github.com/Blockstream/esplora/blob/master/API.md
    */

    static satsToBtc(sats) {
        return sats / 1e8
    }

    static async fetchExchangeRate(currency = 'USD') {
        const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json').then(r => r.json())
        return response.bpi[currency].rate_float;
    }

    static async fetchBalance(address) {
        const response = await fetch(`https://blockchain.info/q/addressbalance/${address}`).then(r => r.text());
        return BitcoinService.satsToBtc(Number(response));
    }

    static async broadcastTransaction(rawTransaction) {
        console.warn('broadcast not active', rawTransaction);
        const response = await fetch(
            `https://blockstream.info/api/tx`, {
                method: 'POST',
                body: rawTransaction
            }
        ).then(r => r.text());
        return response
    }

    static async fetchUnspentOutputs(address) {
        const response = await fetch(`https://blockstream.info/api/address/${address}/utxo`).then(r => r.json());
        return response;
    }

    static async fetchTransactions(address) {
        const response = await fetch(`https://blockstream.info/api/address/${address}/txs`).then(r => r.json());
        return transactionsAdaptor2(transactionsAdaptor(response), address)
    }

    static async fetchFeeEstimate() {
        const response = await fetch(`https://bitcoinfees.earn.com/api/v1/fees/recommended`).then(r => r.json());
        return response;
    }

}

function buildTransaction(inputs, privateKey, recipient, value, fees) {
    // TODO: This function consolidates all our inputs into one. Do we want that? 

    console.log('BUILD TRANSACTION', inputs, privateKey, recipient, value, fees);

    // Initialize a private key using WIF
    const keyPair = bitcoin.ECPair.fromWIF(privateKey);

    const changeAddress = keyPair.getAddress();

    // Build a transaction
    const tx = new bitcoin.TransactionBuilder();
    // Add the inputs (who is paying):
    inputs.forEach(input => tx.addInput(input.txid, input.vout));

    // Add the output (who to pay to):
    // [payee's address, amount in satoshis]
    tx.addOutput(recipient, value);

    // Add the change output
    const inputsSum = inputs.reduce((sum, input) => sum + input.value, 0);
    const change = inputsSum - value - fees;
    // Remove Dust
    if(change > 546){ 
        tx.addOutput(changeAddress, change);
    }

    // Sign every input with the private key
    inputs.forEach((input, index) => tx.sign(index, keyPair));
    // return in hex format
    const hex = tx.build().toHex();
    return hex;
}