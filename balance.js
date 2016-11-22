"use strict";

var gdaxApi = require( './gdaxApi' );

class Balance {
    constructor()  // USD, BTC
    {
        this.initAccount()
            .then(this.initBalance.bind(this))
            .then(this.initInitalValue.bind(this))
            .then(this.log.bind( this ))
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
    }

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

    log()
    {
        console.log( '---------------------' )
        console.log( "USD: " + this.cash );
        console.log( "BTC: " + this.coins );
        console.log( "VALUE: $" + this.getBalance());
        console.log( "GAIN: $" + (this.getBalance() - this.initialValue) )
        console.log( '---------------------' )
    }
}

module.exports = new Balance();