// TODO: use RelativeTimeFormat API
// const relative = new Intl.RelativeTimeFormat('en',{ style:'long', numeric:'auto'})

function formatTime(seconds){
	// get total days between two dates
	const days = Math.floor(seconds / 86400);
	if(days > 0) return `${days} day${ days === 1 ? '' : 's' }`;

	// get hours        
	const hours = Math.floor(seconds / 3600) % 24;        
	if(hours > 0) return `${hours} hour${ hours === 1 ? '' : 's' }`;
	
	// get minutes
	const minutes = Math.floor(seconds / 60) % 60;
	if(minutes > 0) return `${minutes} minute${ minutes === 1 ? '' : 's' }`;
	
	// get seconds
	seconds = Math.floor(seconds);
	if(seconds > 0) return `${seconds} second${ seconds === 1 ? '' : 's' }`;
}

function timeDiff(timestamp1, timestamp2){
	const diff = Math.abs(timestamp1 - timestamp2);
	return formatTime(diff);
}

function currentTimeDiff(timestamp){
	return timeDiff(Date.now()/1000, timestamp)+' ago';
}

function formatUSDRaw(amount){
	return new Intl.NumberFormat('en-EN', { 
		maximumFractionDigits: 2
	})
	.format(amount);
}

function formatUSD(amount){
	return new Intl.NumberFormat('en-EN', { 
		style: 'currency', 
		currency: 'USD'
	})
	.format(amount);
}

function formatBTC(amount){
	return new Intl.NumberFormat('en-EN', { 
		style: 'currency', 
		currency: 'BTC', 
		maximumFractionDigits: 7
	})
	.format(amount)
	.substr(0, 12)
	.replace('BTC','₿');
}

// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat