function parseNameFromEmail(email){
	const name = email
			.split('@')[0]	// use everything before "@"
			.replace('.',' ')
			.replace('-',' ')
			.replace('_',' ')
			.toLowerCase()
		    .split(' ')
		    .map( s => s.charAt(0).toUpperCase() + s.substring(1) )
		    .join(' ')
	return name;
}

function reduceLogin(type, payload, state){
	switch(type){
		case 'LOGIN' : {
			const email = payload.email;
			const name = parseNameFromEmail(email);
			return {
				account : {
					isLoggedIn : true,
					isLoading : true,
					email,
					name,
					password : payload.password
				},
				route: 'loading'
			}
		}
		case 'LOGIN_PROGRESS' :
			return {
				account : {
					loginProgress : payload.progress * 100
				}
			}
		case 'LOGGED_IN' :{
			const address = payload.public;
			const name = encodeURIComponent(state.account.name);
			const addressUri = `bitcoin:${address}?label=${name}`;
			const nextRoute = (state.myTransaction && state.myTransaction.recipient) ? 'send' : 'home'; // check if we have a transaction
			return {
				account : {
					isLoading : false,
					loginProgress : 100,
					address,
					addressUri, 
					private : payload.private,
				}, 
				route : nextRoute
			}
		}
		case 'LOGOUT' :
			return {
				account : {
					isLoggedIn : false,
					password : '',
					address : '',
					private : ''
				},
				route: 'login'
			}
	}
}



function reduceAccount(type, payload, state){
	switch(type){
		case 'BALANCE': {
			const exchangeRate = state.exchangeRate || 0;
			const balanceCrypto = payload.balance || 0;
			const balanceFiat = exchangeRate * balanceCrypto;
			return {
				account : {
					balance : {
						raw : {
							crypto : balanceCrypto,
							fiat: balanceFiat
						},
						crypto : formatBTC(balanceCrypto),
						fiat : formatUSD(balanceFiat)
					}
				}
			}
		}
		case 'EXCHANGE_RATE': {
			const exchangeRate = payload.exchangeRate;
			const balanceCrypto = ( state.account && state.account.balance && state.account.balance.raw && state.account.balance.raw.crypto) || 0;
			const balanceFiat = exchangeRate * balanceCrypto;
			return {
				exchangeRate : exchangeRate,
				account : {
					balance : {
						fiat : formatUSD(balanceFiat)
					}
				}
			}
		}
		case 'COPY_ADDRESS': {
			const address = state.account.address;
			return { 
				clipboard : address,
				toast : 'Copied your address to clipboard'
			}
		}
	}
}

function reduceTransaction(type, payload, state){
	switch(type){
		case 'ROUTE_CHANGE': {
			if (payload.route !== 'send') return;
			const balanceCrypto = (state.account && state.account.balance && state.account.balance.raw && state.account.balance.raw.crypto ) || 0;
			const exchangeRate = state.exchangeRate || 0;
			const recipient = (state.myTransaction && state.myTransaction.recipient ) || '';
			const valueCrypto = (state.myTransaction && state.myTransaction.value && state.myTransaction.value.raw.crypto ) || 0;
			const valueFiat = valueCrypto * exchangeRate;
			const feesFiat = 0.05;
			const processingTime = feesToProccessingTime(feesFiat);
			const feesCrypto = feesFiat / exchangeRate;
			const remainingBalance = ( balanceCrypto - valueCrypto - feesCrypto ) * state.exchangeRate;
			return {
				myTransaction : {
					recipient : recipient,
					value : {
						raw: {
							crypto : valueCrypto,
							fiat : formatUSDRaw(valueFiat),
						},
						crypto : formatBTC(valueCrypto),
						fiat : formatUSD(valueFiat),
					},
					fees : {
						raw: {
							crypto : feesCrypto,
							fiat: feesFiat
						},
						crypto: formatBTC(feesCrypto),
						fiat: formatUSD(feesFiat)
					},
					processingTime,
					remainingBalance: formatUSD(remainingBalance),
					isValid : false,
					pending : false
				},
			}
		}
		case 'BALANCE': {
			const balanceCrypto = payload.balance || 0;
			const valueCrypto = ( state.myTransaction && state.myTransaction.value && state.myTransaction.value.raw.crypto ) || 0;
			const feesCrypto = ( state.myTransaction && state.myTransaction.fees && state.myTransaction.fees.raw.crypto )  || 0;
			const remainingBalance = ( balanceCrypto - valueCrypto - feesCrypto) * state.exchangeRate;
			return {
				myTransaction : {
					remainingBalance: formatUSD(remainingBalance)
				}
			}
		}
		case 'TX_RECIPIENT': 
			// Todo: validate address
			return {
				myTransaction : {
					recipient: payload.recipient
				}
			}
		case 'TX_VALUE': {
			const value = payload.value.replace(',','.');
			const valueFiat = Math.max( Number(value), 0);
			const valueCrypto = valueFiat / state.exchangeRate;
			const feesCrypto = state.myTransaction.fees.raw.crypto;
			const balanceCrypto = state.account.balance.raw.crypto;
			const remainingBalance = ( balanceCrypto - valueCrypto - feesCrypto ) * state.exchangeRate;
			return {
				myTransaction : {
					value : {
						raw : {
							crypto: valueCrypto,
							fiat: formatUSDRaw( valueFiat )
						},
						crypto: formatBTC(valueCrypto),
						fiat: formatUSD(valueFiat)
					},
					remainingBalance: formatUSD(remainingBalance)
				}
			}
		}
		case 'TX_VALUE_MAX': {
			// TODO reduce TX_VALUE_MAX
			return {};
		}
		case 'TX_FEES' : {
			const feesFiat = Number(payload.fees);
			const feesCrypto = feesFiat / state.exchangeRate;
			const processingTime = feesToProccessingTime(feesFiat);
			const balanceCrypto = state.account.balance.raw.crypto;
			const valueCrypto = state.myTransaction.value.raw.crypto;
			const remainingBalance = ( balanceCrypto - valueCrypto - feesCrypto ) * state.exchangeRate;
			return {
				myTransaction : {
					fees: {
						raw: {
							crypto : feesCrypto,
							fiat: feesFiat
						},
						crypto: formatBTC(feesCrypto),
						fiat: formatUSD(feesFiat)
					},
					remainingBalance: formatUSD(remainingBalance),
					processingTime : processingTime
				},
			}
		}
		case 'TX_SEND':
			return {
				myTransaction : {
					pending: true
				},
				route: 'home'
			}
		case 'TX_SEND_SUCCESS':
			return {}
	}
}

function feesToProccessingTime(fees){
	// TODO: Clean this hack up 
	const maxFees = 1.8;
	const ratio = (1-fees/maxFees)**3;
	const tenMinutes = 60 * 10;
	const oneDay = 24 * 60 * 60;
	const minutes = Math.ceil( oneDay * ratio / (10*60) ) * 10 * 60;
	const time = Math.max(tenMinutes,  minutes);
	return `~ ${formatTime(time)}`;
}

function reduceTransactionValidation(type, payload, state){
	switch(type){
		case 'BALANCE':
		case 'TX_RECIPIENT':
		case 'TX_FEES':
		case 'TX_VALUE':
		case 'ROUTE_CHANGE':
			try{
				const validValue = state.myTransaction.value.raw.crypto > 0;
				const validFees = state.myTransaction.fees.raw.crypto > 0;
				const validRecipient = Bitcoin.validateAddress( state.myTransaction.recipient ); 
				const validBalance = state.account.balance.raw.crypto >= state.myTransaction.value.raw.crypto + state.myTransaction.fees.raw.crypto;
				const isValid = validValue && validFees && validRecipient && validBalance;
				return {
					myTransaction : { 
						isValid, 
						isValidBalance : validBalance,
						isValidRecipient : validRecipient
					}
				}
			} catch(e){
				return {
					myTransaction: { 
						isValid : false
					}
				}
			}
	}
}



function parseBitcoinUriRoute(route){
	if(!route.startsWith('uri')) return;
	let uri = route.replace('uri=','');
	uri = decodeURIComponent(uri);
	return parseBitcoinUri(uri);
}

function parseBitcoinUri(uri){
	const r = /^bitcoin:([a-zA-Z0-9]{27,34})(?:\?(.*))?$/;
	const legalKeys = ['address','amount','value','message','label'];
	const match = r.exec(uri);
	if (!match) return null;

	const parsed = { uri: uri }
	if (match[2]) {
		const queries = match[2].split('&');
		for (let i = 0; i < queries.length; i++) {
		  	const query = queries[i].split('=');
			const key = query[0];
			if (query.length === 2 && legalKeys.includes(key) ) {
				parsed[key] = decodeURIComponent(query[1].replace(/\+/g, '%20'));
			}
		}
	}

	parsed.address = match[1];
	return parsed;
}

function isValidRoute(route){
	return (['login','signup','loading','home','send','receive','settings'].indexOf(route) !== -1);
}

function reduceRoute(type, payload, state){
	if(type !== 'ROUTE_CHANGE') return;

	const route = payload.route;

	// Parse Bitcoin URI Scheme 
	const bitcoinUri = parseBitcoinUriRoute(route);
	if(bitcoinUri)
		return {
			route: 'send',
			myTransaction : {
				recipient : bitcoinUri.address,
				value : {
					raw : {
						crypto: bitcoinUri.value || bitcoinUri.amount
					}
				},
				label: bitcoinUri.label || '',
				message: bitcoinUri.message || ''
			}
		}

	// don't react loading
	if( route === 'loading' ) 
		return { route: 'login' };

	const isLoggedIn = ( state.account && state.account.isLoggedIn );

	// If not logged in, redirect to login 
	if(!isLoggedIn && (route !== 'login' && route !== 'signup'))
		return { route : 'login' };

	// If logged in, do not redirect to login or signup
	if(isLoggedIn && (route === 'login' || route === 'signup'))
		return { route : state.route };

	return { route: route }
}

function reduceTransactions(type, payload, state){
	// TODO: update transactions on exchangeRate update
	if(type !== 'TRANSACTIONS') return;
	const transactions = payload.transactions.map(transaction => {
		const valueCrypto = transaction.value / 1e8;
		const valueFiat = valueCrypto * state.exchangeRate;
		const status = transaction.isConfirmed ? currentTimeDiff(transaction.timestamp) : 'Processing...';
		transaction.valueFiat = formatUSD(valueFiat);
		transaction.valueCrypto = formatBTC(valueCrypto);
		transaction.status = status;
		return transaction
	});
	return {
		account : {
			transactions : transactions,
			transactionsCount : transactions.length
		}
	}
}

function reduceInit(type, payload, state){
	if(type !== 'INIT') return;
	return payload
}


function reduceError(type, payload, state){
	if(type !== 'ERROR') return;
	
	switch(payload.type){
		case 'fetch-exchange-rate':
			return {
				toast : 'Error: Could not fetch exchange rate'
			}
			break;
		default:
			return {
				toast : payload.message
			}
	}
}

function reduceSettings(type, payload, state){
	switch(type){
		case 'REGISTER_PROTOCOL': 
			return {
				register_bitcoin_uri: `${state.location.origin}/#uri=%s`
			}
		case 'INSTALL_SUPPORTED':
			if (payload.isInstalled) 
				return { 
					isInstalled : true,
				}
			return {
				device : {
					isInstallSupported : true
				}
			}
		case 'INSTALL':
			return {
				install_prompt : true
			}
	}
}

const walletReducers = [ 
	reduceInit, 
	reduceLogin, 
	reduceRoute,  
	reduceAccount, 
	reduceSettings, 
	reduceTransaction, 
	reduceTransactionValidation, 
	reduceTransactions, 
	reduceError 
];



