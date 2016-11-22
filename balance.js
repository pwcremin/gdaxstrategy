"use strict";

var gdaxApi = require( './gdaxApi' );

class Balance {
    constructor()  // USD, BTC
    {
        this.initAccount()
            .then(this.initBalance.bind(this))
            .then(this.initInitalValue.bind(this))
            .then(this.log.bind( this ))

        this.startTime = Date.now();
    }

    initAccount()
    {
        return gdaxApi.listAccounts( accounts =>
        {
            accounts.forEach( account =>
            {
                if ( account.currency == "BTC" )
                {
                    this.coins = parseFloat( account.balance );
                }

                if ( account.currency == "USD" )
                {
                    this.cash = parseFloat( account.balance );
                }
            } );
        } );
    }

    initBalance()
    {
        return gdaxApi.getTrades( trades =>
        {
            this.btcValue = trades[ 0 ].price
        } );
    }

    initInitalValue()
    {
        this.initialValue = this.getBalance()
    }

    purchase( price, size )
    {
        this.cash -= price * size;
        this.coins += size;

        this.btcValue = price;

        this.coinsBought += size;
    }

    // TODO need to add the cost of the sell: price x size x (1 + fee-percent)
    sell( price, size )
    {
        this.cash += price * size;
        this.coins -= size;

        this.btcValue = price;
    }

    getBalance()
    {
        return this.cash + (this.coins * this.btcValue);
    }

    getDollarsPer(timeInMS)
    {
        var duration = Date.now() - this.startTime;

        var periods = duration / timeInMS;

        return (this.getBalance() - this.initialValue) / periods;
    }

    log()
    {
        console.log( '---------------------' )
        console.log( "USD: " + this.cash );
        console.log( "BTC: " + this.coins );
        console.log( "VALUE: $" + this.getBalance());
        console.log( "SPEED: $" + this.getDollarsPer(60 * 1000) + " per minute")
        console.log( "GAIN: $" + (this.getBalance() - this.initialValue) )
        console.log( '---------------------' )
    }
}

module.exports = new Balance();